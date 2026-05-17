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

type StatementService struct{ db *gorm.DB }

func NewStatementService(db *gorm.DB) *StatementService { return &StatementService{db: db} }

// --------------- Request types ---------------

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
	Description      string `json:"description"`
	Reason           string `json:"reason"`
	Amount           string `json:"amount"`
	VariationRef     string `json:"variation_ref"`
	ApprovedByClient bool   `json:"approved_by_client"`
	ApprovalRef      string `json:"approval_ref"`
}

type TransitionReq struct {
	Status  string `json:"status"`
	Comment string `json:"comment"`
}

// --------------- Create ---------------

func (s *StatementService) Create(ctx context.Context, contractID string, req CreateStatementReq) (*model.InterimStatement, error) {
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

	var stmt model.InterimStatement
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var ct model.Contract
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&ct, "id = ?", cid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Contract not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}

		var maxSeq int
		tx.Model(&model.InterimStatement{}).
			Where("contract_id = ?", cid).
			Select("COALESCE(MAX(sequence_no), 0)").
			Scan(&maxSeq)

		stmt = model.InterimStatement{
			CompanyID:   ct.CompanyID,
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

func (s *StatementService) GetByID(ctx context.Context, id string) (*model.InterimStatement, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	var stmt model.InterimStatement
	if err := s.db.WithContext(ctx).
		Preload("WorkDoneItems").
		Preload("ExtraWorkItems").
		First(&stmt, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Statement not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}
	return &stmt, nil
}

func (s *StatementService) ListByContract(ctx context.Context, contractID, status string, page, limit int) ([]model.InterimStatement, int64, error) {
	q := s.db.WithContext(ctx).Model(&model.InterimStatement{})
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
	var items []model.InterimStatement
	if err := q.Order("sequence_no ASC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Query failed", Code: 500}
	}
	return items, total, nil
}

// --------------- Works Done ---------------

func (s *StatementService) SetWorksDone(ctx context.Context, statementID string, req SetWorksDoneReq) (*model.InterimStatement, error) {
	sid, err := uuid.Parse(statementID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}

	var stmt model.InterimStatement
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Preload("WorkDoneItems").
			Preload("ExtraWorkItems").
			First(&stmt, "id = ?", sid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Statement not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}
		if stmt.Status != model.StatementDraft {
			return &ServiceError{Message: "Only draft statements can be edited", Code: 422}
		}

		// Fetch parent contract for bps parameters.
		var ct model.Contract
		if err := tx.First(&ct, "id = ?", stmt.ContractID).Error; err != nil {
			return &ServiceError{Message: "Contract not found", Code: 500}
		}

		if err := tx.Where("statement_id = ?", sid).Delete(&model.WorkDoneItem{}).Error; err != nil {
			return &ServiceError{Message: "Failed to clear existing works done", Code: 500}
		}

		newItems := make([]model.WorkDoneItem, 0, len(req.Items))
		lineNo := 1
		for _, item := range req.Items {
			qty, err := decimal.NewFromString(item.Quantity)
			if err != nil || qty.LessThanOrEqual(decimal.Zero) {
				continue
			}
			price, _ := decimal.NewFromString(item.UnitPrice)
			newItems = append(newItems, model.WorkDoneItem{
				StatementID: sid,
				LineNo:      lineNo,
				BoQItemCode: item.BoQItemCode,
				Description: item.Description,
				UnitCode:    item.UnitCode,
				Quantity:    qty,
				UnitPrice:   price,
				Amount:      qty.Mul(price),
			})
			lineNo++
		}
		if len(newItems) > 0 {
			if err := tx.Create(&newItems).Error; err != nil {
				return dbErr(err)
			}
		}

		stmt.WorkDoneItems = newItems
		// Advance outstanding balance — fetch from advance payment records.
		var advanceOutstanding decimal.Decimal
		tx.Model(&model.AdvancePaymentRecord{}).
			Where("contract_id = ? AND record_type = 'advance'", ct.ID).
			Select("COALESCE(SUM(outstanding_balance), 0)").
			Scan(&advanceOutstanding)

		stmt.Recompute(
			ct.RetentionPctBps, ct.AdvancePctBps,
			ct.VatPctBps, ct.SocialSecurityPctBps,
			advanceOutstanding,
		)

		if err := tx.Model(&stmt).Updates(map[string]any{
			"gross_amount":           stmt.GrossAmount,
			"extra_amount":           stmt.ExtraAmount,
			"retention_amount":       stmt.RetentionAmount,
			"advance_recovered":      stmt.AdvanceRecovered,
			"vat_amount":             stmt.VatAmount,
			"social_security_amount": stmt.SocialSecurityAmount,
			"net_amount":             stmt.NetAmount,
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

func (s *StatementService) AddExtraWork(ctx context.Context, statementID string, req CreateExtraWorkReq) (*model.ExtraWorkItem, error) {
	sid, err := uuid.Parse(statementID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	amt, err := decimal.NewFromString(req.Amount)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid amount", Code: 400}
	}

	var result *model.ExtraWorkItem
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var stmt model.InterimStatement
		if err := tx.Preload("WorkDoneItems").Preload("ExtraWorkItems").
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
		tx.Model(&model.ExtraWorkItem{}).Where("statement_id = ?", sid).
			Select("COALESCE(MAX(line_no), 0)").Scan(&maxLine)

		ew := model.ExtraWorkItem{
			StatementID:      sid,
			LineNo:           maxLine + 1,
			Description:      req.Description,
			Reason:           req.Reason,
			Amount:           amt,
			VariationRef:     req.VariationRef,
			ApprovedByClient: req.ApprovedByClient,
			ApprovalRef:      req.ApprovalRef,
		}
		if err := tx.Create(&ew).Error; err != nil {
			return dbErr(err)
		}

		stmt.ExtraWorkItems = append(stmt.ExtraWorkItems, ew)
		var ct model.Contract
		tx.First(&ct, "id = ?", stmt.ContractID)
		stmt.Recompute(ct.RetentionPctBps, ct.AdvancePctBps, ct.VatPctBps, ct.SocialSecurityPctBps, decimal.Zero)
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

// --------------- Status Transitions ---------------

// validTransitions encodes the 5-stage approval state machine.
var validTransitions = map[model.StatementStatus]map[model.StatementStatus][]string{
	model.StatementDraft:          {model.StatementSubmitted: {"pm", "admin"}},
	model.StatementSubmitted:      {model.StatementFinanceReview: {"finance", "admin"}, model.StatementRejected: {"finance", "admin"}},
	model.StatementFinanceReview:  {model.StatementPMReview: {"pm", "admin"}, model.StatementRejected: {"pm", "admin"}},
	model.StatementPMReview:       {model.StatementDirectorReview: {"director", "admin"}, model.StatementRejected: {"director", "admin"}},
	model.StatementDirectorReview: {model.StatementApproved: {"director", "admin"}, model.StatementRejected: {"director", "admin"}},
}

func (s *StatementService) Transition(ctx context.Context, id string, req TransitionReq, callerID uuid.UUID, callerRoles []string) (*model.InterimStatement, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	newStatus := model.StatementStatus(req.Status)
	if !newStatus.Valid() {
		return nil, &ServiceError{Message: "Invalid target status", Code: 400}
	}

	var stmt model.InterimStatement
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&stmt, "id = ?", uid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Statement not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}

		allowed, ok := validTransitions[stmt.Status]
		if !ok {
			return &ServiceError{Message: "No transitions available from " + string(stmt.Status), Code: 422}
		}
		requiredRoles, ok := allowed[newStatus]
		if !ok {
			return &ServiceError{
				Message: "Invalid status transition from " + string(stmt.Status) + " to " + string(newStatus),
				Code:    422,
			}
		}

		if !hasAnyRole(callerRoles, requiredRoles) {
			return &ServiceError{Message: "Insufficient role for this transition", Code: 403}
		}

		if newStatus == model.StatementRejected && req.Comment == "" {
			return &ServiceError{Message: "Comment is required when rejecting", Code: 400}
		}

		updates := map[string]any{"status": newStatus}
		if err := tx.Model(&stmt).Updates(updates).Error; err != nil {
			return &ServiceError{Message: "Transition failed", Code: 500}
		}

		// Write audit event.
		evt := model.ApprovalEvent{
			EntityType: "interim_statement",
			EntityID:   stmt.ID,
			ActorID:    callerID,
			FromStatus: string(stmt.Status),
			ToStatus:   string(newStatus),
			Comment:    req.Comment,
			CreatedAt:  time.Now(),
		}
		if err := tx.Create(&evt).Error; err != nil {
			return &ServiceError{Message: "Failed to write approval event", Code: 500}
		}

		stmt.Status = newStatus
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}
	return &stmt, nil
}

func hasAnyRole(callerRoles, required []string) bool {
	for _, cr := range callerRoles {
		for _, r := range required {
			if cr == r {
				return true
			}
		}
	}
	return false
}

// --------------- Delete ---------------

func (s *StatementService) Delete(ctx context.Context, id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	var stmt model.InterimStatement
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
