package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	model "github.com/sobhan-yasami/docs-db-panel/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ============================================================
// STATEMENT SERVICE
// ============================================================

type StatementService struct{ db *gorm.DB }

func NewStatementService(db *gorm.DB) *StatementService { return &StatementService{db: db} }

// --------------- Request / Response types ---------------

type CreateStatementReq struct {
	PeriodStart string `json:"period_start"`
	PeriodEnd   string `json:"period_end"`
	IssuedOn    string `json:"issued_on"`
	Notes       string `json:"notes"`
}

type SetWorksDoneReq struct {
	Items []WorksDoneItem `json:"items"`
}

type WorksDoneItem struct {
	BoQItemCode string `json:"boq_item_code"`
	Description string `json:"description"`
	UnitCode    string `json:"unit_code"`
	Quantity    string `json:"quantity"`
	UnitPrice   string `json:"unit_price"`
}

type CreateExtraWorkReq struct {
	Description string `json:"description"`
	Reason      string `json:"reason"`
	Amount      string `json:"amount"`
}

type CreateDeductionReq struct {
	Kind        string  `json:"kind"`
	Description string  `json:"description"`
	RatePct     *string `json:"rate_pct"`
	Amount      string  `json:"amount"`
}

type TransitionReq struct {
	Status string `json:"status"`
}

// WBSProgress enriches a WBS item with cumulative progress across all statements.
type WBSProgress struct {
	WBS          model.WBS       `json:"wbs"`
	DoneQty      decimal.Decimal `json:"done_qty"`
	RemainingQty decimal.Decimal `json:"remaining_qty"`
}

// --------------- Create ---------------

func (s *StatementService) Create(ctx context.Context, contractID string, req CreateStatementReq) (*model.StatusStatement, error) {
	cid, err := uuid.Parse(contractID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contract ID", Code: 400}
	}
	ps, err := time.Parse("2006-01-02", req.PeriodStart)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid period_start (expected YYYY-MM-DD)", Code: 400}
	}
	pe, err := time.Parse("2006-01-02", req.PeriodEnd)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid period_end (expected YYYY-MM-DD)", Code: 400}
	}
	io, err := time.Parse("2006-01-02", req.IssuedOn)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid issued_on (expected YYYY-MM-DD)", Code: 400}
	}

	var stmt model.StatusStatement
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var ct model.Contract
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&ct, "id = ?", cid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Contract not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}

		var maxSeq int
		tx.Model(&model.StatusStatement{}).
			Where("contract_id = ?", cid).
			Select("COALESCE(MAX(sequence_no), 0)").
			Scan(&maxSeq)

		stmt = model.StatusStatement{
			ContractID:  cid,
			SequenceNo:  maxSeq + 1,
			PeriodStart: ps,
			PeriodEnd:   pe,
			IssuedOn:    io,
			Status:      model.StatementDraft,
			Currency:    ct.Currency,
			Notes:       req.Notes,
		}
		if err := tx.Create(&stmt).Error; err != nil {
			return dbErr(err)
		}
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}
	return &stmt, nil
}

// --------------- Read ---------------

func (s *StatementService) GetByID(ctx context.Context, id string) (*model.StatusStatement, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	var stmt model.StatusStatement
	if err := s.db.WithContext(ctx).
		Preload("WorksDone").
		Preload("ExtraWorks").
		Preload("Deductions").
		First(&stmt, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Statement not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}
	return &stmt, nil
}

func (s *StatementService) ListByContract(ctx context.Context, contractID, status string, page, limit int) ([]model.StatusStatement, int64, error) {
	q := s.db.WithContext(ctx).Model(&model.StatusStatement{})
	if contractID != "" {
		if cid, err := uuid.Parse(contractID); err == nil {
			q = q.Where("contract_id = ?", cid)
		}
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Count failed", Code: 500}
	}
	var items []model.StatusStatement
	if err := q.Order("sequence_no ASC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Query failed", Code: 500}
	}
	return items, total, nil
}

// GetWBSProgress returns WBS items with cumulative done/remaining quantities.
func (s *StatementService) GetWBSProgress(ctx context.Context, contractID string) ([]WBSProgress, error) {
	cid, err := uuid.Parse(contractID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contract ID", Code: 400}
	}

	var wbsItems []model.WBS
	if err := s.db.WithContext(ctx).Where("contract_id = ?", cid).Order("item_code ASC").Find(&wbsItems).Error; err != nil {
		return nil, &ServiceError{Message: "Failed to fetch WBS items", Code: 500}
	}

	type qtyRow struct {
		BoQItemCode string
		TotalQty    decimal.Decimal
	}
	var rows []qtyRow
	s.db.WithContext(ctx).
		Model(&model.WorksDone{}).
		Select("boq_item_code, SUM(quantity) as total_qty").
		Joins("JOIN status_statements ss ON ss.id = works_done.statement_id").
		Where("ss.contract_id = ? AND ss.deleted_at IS NULL", cid).
		Group("boq_item_code").
		Scan(&rows)

	doneMap := make(map[string]decimal.Decimal, len(rows))
	for _, r := range rows {
		doneMap[r.BoQItemCode] = r.TotalQty
	}

	result := make([]WBSProgress, 0, len(wbsItems))
	for _, w := range wbsItems {
		done := doneMap[w.ItemCode]
		result = append(result, WBSProgress{
			WBS:          w,
			DoneQty:      done,
			RemainingQty: w.Quantity.Sub(done),
		})
	}
	return result, nil
}

// --------------- Works Done ---------------

// SetWorksDone replaces all WorksDone on a draft statement and recomputes aggregates.
func (s *StatementService) SetWorksDone(ctx context.Context, statementID string, req SetWorksDoneReq) (*model.StatusStatement, error) {
	sid, err := uuid.Parse(statementID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}

	var stmt model.StatusStatement
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Preload("WorksDone").
			Preload("ExtraWorks").
			Preload("Deductions").
			First(&stmt, "id = ?", sid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Statement not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}
		if stmt.Status != model.StatementDraft {
			return &ServiceError{Message: "Only draft statements can be edited", Code: 422}
		}

		if err := tx.Where("statement_id = ?", sid).Delete(&model.WorksDone{}).Error; err != nil {
			return &ServiceError{Message: "Failed to clear existing works done", Code: 500}
		}

		newItems := make([]model.WorksDone, 0, len(req.Items))
		lineNo := 1
		for _, item := range req.Items {
			qty, err := decimal.NewFromString(item.Quantity)
			if err != nil || qty.LessThanOrEqual(decimal.Zero) {
				continue
			}
			price, _ := decimal.NewFromString(item.UnitPrice)
			newItems = append(newItems, model.WorksDone{
				StatementID: sid,
				LineNo:      lineNo,
				BoQItemCode: item.BoQItemCode,
				Description: item.Description,
				UnitCode:    item.UnitCode,
				Quantity:    qty,
				UnitPrice:   price,
				Amount:      qty.Mul(price).Round(2),
			})
			lineNo++
		}
		if len(newItems) > 0 {
			if err := tx.Create(&newItems).Error; err != nil {
				return dbErr(err)
			}
		}

		stmt.WorksDone = newItems
		stmt.Recompute()

		if err := tx.Model(&stmt).Updates(map[string]any{
			"gross_amount":     stmt.GrossAmount,
			"extra_amount":     stmt.ExtraAmount,
			"deduction_amount": stmt.DeductionAmount,
			"net_amount":       stmt.NetAmount,
		}).Error; err != nil {
			return &ServiceError{Message: "Failed to update aggregates", Code: 500}
		}
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}
	return &stmt, nil
}

// --------------- Extra Works ---------------

func (s *StatementService) AddExtraWork(ctx context.Context, statementID string, req CreateExtraWorkReq) (*model.ExtraWork, error) {
	sid, err := uuid.Parse(statementID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	amt, err := decimal.NewFromString(req.Amount)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid amount", Code: 400}
	}

	var result *model.ExtraWork
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var stmt model.StatusStatement
		if err := tx.Preload("WorksDone").Preload("ExtraWorks").Preload("Deductions").
			First(&stmt, "id = ?", sid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Statement not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}
		if stmt.Status != model.StatementDraft {
			return &ServiceError{Message: "Only draft statements can be edited", Code: 422}
		}

		var maxLine int
		tx.Model(&model.ExtraWork{}).Where("statement_id = ?", sid).
			Select("COALESCE(MAX(line_no), 0)").Scan(&maxLine)

		ew := model.ExtraWork{
			StatementID: sid,
			LineNo:      maxLine + 1,
			Description: req.Description,
			Reason:      req.Reason,
			Amount:      amt,
		}
		if err := tx.Create(&ew).Error; err != nil {
			return dbErr(err)
		}

		stmt.ExtraWorks = append(stmt.ExtraWorks, ew)
		stmt.Recompute()
		tx.Model(&stmt).Updates(map[string]any{
			"extra_amount": stmt.ExtraAmount,
			"net_amount":   stmt.NetAmount,
		})
		result = &ew
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}
	return result, nil
}

// --------------- Deductions ---------------

func (s *StatementService) AddDeduction(ctx context.Context, statementID string, req CreateDeductionReq) (*model.Deduction, error) {
	sid, err := uuid.Parse(statementID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	amt, err := decimal.NewFromString(req.Amount)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid amount", Code: 400}
	}

	var result *model.Deduction
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var stmt model.StatusStatement
		if err := tx.Preload("WorksDone").Preload("ExtraWorks").Preload("Deductions").
			First(&stmt, "id = ?", sid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Statement not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}
		if stmt.Status != model.StatementDraft {
			return &ServiceError{Message: "Only draft statements can be edited", Code: 422}
		}

		var maxLine int
		tx.Model(&model.Deduction{}).Where("statement_id = ?", sid).
			Select("COALESCE(MAX(line_no), 0)").Scan(&maxLine)

		var ratePct *decimal.Decimal
		if req.RatePct != nil && *req.RatePct != "" {
			if v, err := decimal.NewFromString(*req.RatePct); err == nil {
				ratePct = &v
			}
		}

		d := model.Deduction{
			StatementID: sid,
			LineNo:      maxLine + 1,
			Kind:        model.DeductionKind(req.Kind),
			Description: req.Description,
			RatePct:     ratePct,
			Amount:      amt,
		}
		if err := tx.Create(&d).Error; err != nil {
			return dbErr(err)
		}

		stmt.Deductions = append(stmt.Deductions, d)
		stmt.Recompute()
		tx.Model(&stmt).Updates(map[string]any{
			"deduction_amount": stmt.DeductionAmount,
			"net_amount":       stmt.NetAmount,
		})
		result = &d
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}
	return result, nil
}

// --------------- Status Transitions ---------------

func (s *StatementService) Transition(ctx context.Context, id string, req TransitionReq, callerID uuid.UUID) (*model.StatusStatement, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	newStatus := model.StatementStatus(req.Status)

	var stmt model.StatusStatement
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&stmt, "id = ?", uid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Statement not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}

		allowed := false
		switch stmt.Status {
		case model.StatementDraft:
			allowed = newStatus == model.StatementSubmitted
		case model.StatementSubmitted:
			allowed = newStatus == model.StatementApproved || newStatus == model.StatementRejected
		case model.StatementApproved:
			allowed = newStatus == model.StatementPaid
		case model.StatementRejected:
			allowed = newStatus == model.StatementDraft
		}
		if !allowed {
			return &ServiceError{
				Message: "Invalid status transition from " + string(stmt.Status) + " to " + string(newStatus),
				Code:    422,
			}
		}

		updates := map[string]any{"status": newStatus}
		if newStatus == model.StatementApproved {
			now := time.Now()
			updates["approved_by_id"] = callerID
			updates["approved_at"] = now
		}
		if err := tx.Model(&stmt).Updates(updates).Error; err != nil {
			return &ServiceError{Message: "Transition failed", Code: 500}
		}
		stmt.Status = newStatus
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}
	return &stmt, nil
}

// --------------- Delete ---------------

func (s *StatementService) Delete(ctx context.Context, id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	var stmt model.StatusStatement
	if err := s.db.WithContext(ctx).First(&stmt, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &ServiceError{Message: "Statement not found", Code: 404}
		}
		return &ServiceError{Message: "Database error", Code: 500}
	}
	if stmt.Status != model.StatementDraft {
		return &ServiceError{Message: "Only draft statements can be deleted", Code: 422}
	}
	if err := s.db.WithContext(ctx).Delete(&stmt).Error; err != nil {
		return &ServiceError{Message: "Delete failed", Code: 500}
	}
	return nil
}
