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

type UpdateStatementReq struct {
	PeriodStart *string `json:"period_start"`
	PeriodEnd   *string `json:"period_end"`
	IssuedOn    *string `json:"issued_on"`
	Notes       *string `json:"notes"`
}

// WorksDoneItem — user supplies line_item_id (WBS ref) and accumulated quantity_done.
// Description/unit/unit_price are copied from the ContractLineItem.
type WorksDoneItem struct {
	LineItemID   string `json:"line_item_id"`
	QuantityDone string `json:"quantity_done"`
}

type SetWorksDoneReq struct {
	Items []WorksDoneItem `json:"items"`
}

type CreateExtraWorkReq struct {
	Description      string `json:"description"`
	Unit             string `json:"unit"`
	Quantity         string `json:"quantity"`
	UnitPrice        string `json:"unit_price"`
	Reason           string `json:"reason"`
	VariationRef     string `json:"variation_ref"`
	ApprovedByClient bool   `json:"approved_by_client"`
	ApprovalRef      string `json:"approval_ref"`
}

type CreateDeductionReq struct {
	Description string `json:"description"`
	Unit        string `json:"unit"`
	Quantity    string `json:"quantity"`
	UnitPrice   string `json:"unit_price"`
}

type UpdateDeductionReq struct {
	Description *string `json:"description"`
	Unit        *string `json:"unit"`
	Quantity    *string `json:"quantity"`
	UnitPrice   *string `json:"unit_price"`
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

		// Snapshot prev progress from the latest statement.
		var prevPct *decimal.Decimal
		if maxSeq > 0 {
			var prev model.InterimStatement
			if tx.Where("contract_id = ? AND sequence_no = ?", cid, maxSeq).
				First(&prev).Error == nil {
				prevPct = prev.ProgressPct
			}
		}

		stmt = model.InterimStatement{
			CompanyID:       ct.CompanyID,
			ContractID:      cid,
			SequenceNo:      maxSeq + 1,
			PeriodStart:     ps,
			PeriodEnd:       pe,
			IssuedOn:        io,
			Status:          model.StatementDraft,
			Currency:        ct.Currency,
			Notes:           req.Notes,
			PrevProgressPct: prevPct,
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
		Preload("DeductionItems").
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
			Preload("DeductionItems").
			First(&stmt, "id = ?", sid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Statement not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}
		if stmt.Status != model.StatementDraft {
			return &ServiceError{Message: "Only draft statements can be edited", Code: 422}
		}

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
			liID, err := uuid.Parse(item.LineItemID)
			if err != nil {
				continue
			}
			qty, err := decimal.NewFromString(item.QuantityDone)
			if err != nil || qty.LessThanOrEqual(decimal.Zero) {
				continue
			}

			// Fetch WBS item to get description/unit/unit_rate.
			var wbs model.ContractLineItem
			if err := tx.First(&wbs, "id = ?", liID).Error; err != nil {
				continue // skip invalid refs
			}

			// For unit_rate contracts apply contract_coefficient so the effective price
			// reflects the competitive adjustment from the tender (ضریب پیمان).
			effectiveRate := wbs.UnitRate
			if ct.Type == model.ContractUnitRate {
				effectiveRate = effectiveRate.Mul(ct.ContractCoefficient)
			}

			newItems = append(newItems, model.WorkDoneItem{
				StatementID: sid,
				LineItemID:  &liID,
				LineNo:      lineNo,
				BoQItemCode: wbs.ID.String(),
				Description: wbs.Description,
				UnitCode:    wbs.Unit,
				Quantity:    qty,
				UnitPrice:   effectiveRate,
				Amount:      qty.Mul(effectiveRate),
			})
			lineNo++
		}
		if len(newItems) > 0 {
			if err := tx.Create(&newItems).Error; err != nil {
				return dbErr(err)
			}
		}

		stmt.WorkDoneItems = newItems

		var advanceOutstanding decimal.Decimal
		tx.Model(&model.AdvancePaymentRecord{}).
			Where("contract_id = ? AND record_type = 'advance'", ct.ID).
			Select("COALESCE(SUM(outstanding_balance), 0)").
			Scan(&advanceOutstanding)

		grossBudget, _ := decimal.NewFromString(ct.GrossBudget.String())
		stmt.Recompute(
			ct.RetentionPctBps, ct.AdvancePctBps,
			ct.VatPctBps, ct.SocialSecurityPctBps,
			ct.ManagementFeePctBps,
			advanceOutstanding, grossBudget,
		)

		updates := map[string]any{
			"gross_amount":           stmt.GrossAmount,
			"extra_amount":           stmt.ExtraAmount,
			"deduction_amount":       stmt.DeductionAmount,
			"retention_amount":       stmt.RetentionAmount,
			"advance_recovered":      stmt.AdvanceRecovered,
			"vat_amount":             stmt.VatAmount,
			"social_security_amount": stmt.SocialSecurityAmount,
			"net_amount":             stmt.NetAmount,
			"progress_pct":           stmt.ProgressPct,
		}
		if err := tx.Model(&stmt).Updates(updates).Error; err != nil {
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
	qty, err := decimal.NewFromString(req.Quantity)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid quantity", Code: 400}
	}
	unitPrice, err := decimal.NewFromString(req.UnitPrice)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid unit_price", Code: 400}
	}
	amt := qty.Mul(unitPrice)

	var result *model.ExtraWorkItem
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var stmt model.InterimStatement
		if err := tx.Preload("WorkDoneItems").Preload("ExtraWorkItems").Preload("DeductionItems").
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
			Unit:             req.Unit,
			Quantity:         qty,
			UnitPrice:        unitPrice,
			Amount:           amt,
			Reason:           req.Reason,
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
		grossBudget, _ := decimal.NewFromString(ct.GrossBudget.String())
		stmt.Recompute(ct.RetentionPctBps, ct.AdvancePctBps, ct.VatPctBps, ct.SocialSecurityPctBps, ct.ManagementFeePctBps, decimal.Zero, grossBudget)
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

func (s *StatementService) DeleteExtraWork(ctx context.Context, statementID, extraWorkID string) error {
	sid, err := uuid.Parse(statementID)
	if err != nil {
		return &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	ewID, err := uuid.Parse(extraWorkID)
	if err != nil {
		return &ServiceError{Message: "Invalid extra work ID", Code: 400}
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var stmt model.InterimStatement
		if err := tx.First(&stmt, "id = ?", sid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Statement not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}
		if stmt.Status != model.StatementDraft {
			return &ServiceError{Message: "Only draft statements can be edited", Code: 422}
		}
		var ew model.ExtraWorkItem
		if err := tx.First(&ew, "id = ? AND statement_id = ?", ewID, sid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Extra work item not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}
		if err := tx.Delete(&ew).Error; err != nil {
			return &ServiceError{Message: "Delete failed", Code: 500}
		}
		// Recompute aggregates.
		var full model.InterimStatement
		tx.Preload("WorkDoneItems").Preload("ExtraWorkItems").Preload("DeductionItems").
			First(&full, "id = ?", sid)
		var ct model.Contract
		tx.First(&ct, "id = ?", full.ContractID)
		grossBudget, _ := decimal.NewFromString(ct.GrossBudget.String())
		full.Recompute(ct.RetentionPctBps, ct.AdvancePctBps, ct.VatPctBps, ct.SocialSecurityPctBps, ct.ManagementFeePctBps, decimal.Zero, grossBudget)
		tx.Model(&full).Updates(map[string]any{
			"extra_amount": full.ExtraAmount,
			"net_amount":   full.NetAmount,
		})
		return nil
	})
}

// --------------- Deductions ---------------

func (s *StatementService) AddDeduction(ctx context.Context, statementID string, req CreateDeductionReq) (*model.StatementDeductionItem, error) {
	sid, err := uuid.Parse(statementID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	qty, err := decimal.NewFromString(req.Quantity)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid quantity", Code: 400}
	}
	unitPrice, err := decimal.NewFromString(req.UnitPrice)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid unit_price", Code: 400}
	}

	var result *model.StatementDeductionItem
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var stmt model.InterimStatement
		if err := tx.Preload("WorkDoneItems").Preload("ExtraWorkItems").Preload("DeductionItems").
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
		tx.Model(&model.StatementDeductionItem{}).Where("statement_id = ?", sid).
			Select("COALESCE(MAX(line_no), 0)").Scan(&maxLine)

		d := model.StatementDeductionItem{
			StatementID: sid,
			LineNo:      maxLine + 1,
			Description: req.Description,
			Unit:        req.Unit,
			Quantity:    qty,
			UnitPrice:   unitPrice,
			Amount:      qty.Mul(unitPrice),
		}
		if err := tx.Create(&d).Error; err != nil {
			return dbErr(err)
		}

		stmt.DeductionItems = append(stmt.DeductionItems, d)
		var ct model.Contract
		tx.First(&ct, "id = ?", stmt.ContractID)
		grossBudget, _ := decimal.NewFromString(ct.GrossBudget.String())
		stmt.Recompute(ct.RetentionPctBps, ct.AdvancePctBps, ct.VatPctBps, ct.SocialSecurityPctBps, ct.ManagementFeePctBps, decimal.Zero, grossBudget)
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

func (s *StatementService) UpdateDeduction(ctx context.Context, statementID, deductionID string, req UpdateDeductionReq) (*model.StatementDeductionItem, error) {
	sid, err := uuid.Parse(statementID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	did, err := uuid.Parse(deductionID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid deduction ID", Code: 400}
	}

	var result *model.StatementDeductionItem
	txErr := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var stmt model.InterimStatement
		if err := tx.First(&stmt, "id = ?", sid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Statement not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}
		if stmt.Status != model.StatementDraft {
			return &ServiceError{Message: "Only draft statements can be edited", Code: 422}
		}

		var d model.StatementDeductionItem
		if err := tx.First(&d, "id = ? AND statement_id = ?", did, sid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Deduction not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}

		if req.Description != nil {
			d.Description = *req.Description
		}
		if req.Unit != nil {
			d.Unit = *req.Unit
		}
		if req.Quantity != nil {
			if q, err := decimal.NewFromString(*req.Quantity); err == nil {
				d.Quantity = q
			}
		}
		if req.UnitPrice != nil {
			if p, err := decimal.NewFromString(*req.UnitPrice); err == nil {
				d.UnitPrice = p
			}
		}
		d.Amount = d.Quantity.Mul(d.UnitPrice)

		if err := tx.Save(&d).Error; err != nil {
			return &ServiceError{Message: "Update failed", Code: 500}
		}

		// Recompute.
		var full model.InterimStatement
		tx.Preload("WorkDoneItems").Preload("ExtraWorkItems").Preload("DeductionItems").
			First(&full, "id = ?", sid)
		var ct model.Contract
		tx.First(&ct, "id = ?", full.ContractID)
		grossBudget, _ := decimal.NewFromString(ct.GrossBudget.String())
		full.Recompute(ct.RetentionPctBps, ct.AdvancePctBps, ct.VatPctBps, ct.SocialSecurityPctBps, ct.ManagementFeePctBps, decimal.Zero, grossBudget)
		tx.Model(&full).Updates(map[string]any{
			"deduction_amount": full.DeductionAmount,
			"net_amount":       full.NetAmount,
		})

		result = &d
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}
	return result, nil
}

func (s *StatementService) DeleteDeduction(ctx context.Context, statementID, deductionID string) error {
	sid, err := uuid.Parse(statementID)
	if err != nil {
		return &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	did, err := uuid.Parse(deductionID)
	if err != nil {
		return &ServiceError{Message: "Invalid deduction ID", Code: 400}
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var stmt model.InterimStatement
		if err := tx.First(&stmt, "id = ?", sid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Statement not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}
		if stmt.Status != model.StatementDraft {
			return &ServiceError{Message: "Only draft statements can be edited", Code: 422}
		}
		var d model.StatementDeductionItem
		if err := tx.First(&d, "id = ? AND statement_id = ?", did, sid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Deduction not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}
		if err := tx.Delete(&d).Error; err != nil {
			return &ServiceError{Message: "Delete failed", Code: 500}
		}
		// Recompute.
		var full model.InterimStatement
		tx.Preload("WorkDoneItems").Preload("ExtraWorkItems").Preload("DeductionItems").
			First(&full, "id = ?", sid)
		var ct model.Contract
		tx.First(&ct, "id = ?", full.ContractID)
		grossBudget, _ := decimal.NewFromString(ct.GrossBudget.String())
		full.Recompute(ct.RetentionPctBps, ct.AdvancePctBps, ct.VatPctBps, ct.SocialSecurityPctBps, ct.ManagementFeePctBps, decimal.Zero, grossBudget)
		tx.Model(&full).Updates(map[string]any{
			"deduction_amount": full.DeductionAmount,
			"net_amount":       full.NetAmount,
		})
		return nil
	})
}

func (s *StatementService) ListDeductions(ctx context.Context, statementID string) ([]model.StatementDeductionItem, error) {
	sid, err := uuid.Parse(statementID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	var items []model.StatementDeductionItem
	if err := s.db.WithContext(ctx).Where("statement_id = ?", sid).Order("line_no ASC").Find(&items).Error; err != nil {
		return nil, &ServiceError{Message: "Query failed", Code: 500}
	}
	return items, nil
}

// --------------- Status Transitions ---------------

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

		if err := tx.Model(&stmt).Updates(map[string]any{"status": newStatus}).Error; err != nil {
			return &ServiceError{Message: "Transition failed", Code: 500}
		}

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

// --------------- Update header ---------------

func (s *StatementService) Update(ctx context.Context, id string, req UpdateStatementReq) (*model.InterimStatement, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}
	var stmt model.InterimStatement
	if err := s.db.WithContext(ctx).First(&stmt, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Statement not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}
	if stmt.Status != model.StatementDraft {
		return nil, &ServiceError{Message: "Only draft statements can be edited", Code: 422}
	}

	cols := map[string]any{}
	if req.PeriodStart != nil {
		ps, err := time.Parse("2006-01-02", *req.PeriodStart)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid period_start (expected YYYY-MM-DD)", Code: 400}
		}
		cols["period_start"] = ps
		stmt.PeriodStart = ps
	}
	if req.PeriodEnd != nil {
		pe, err := time.Parse("2006-01-02", *req.PeriodEnd)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid period_end (expected YYYY-MM-DD)", Code: 400}
		}
		cols["period_end"] = pe
		stmt.PeriodEnd = pe
	}
	if req.IssuedOn != nil {
		io, err := time.Parse("2006-01-02", *req.IssuedOn)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid issued_on (expected YYYY-MM-DD)", Code: 400}
		}
		cols["issued_on"] = io
		stmt.IssuedOn = io
	}
	if req.Notes != nil {
		cols["notes"] = *req.Notes
		stmt.Notes = *req.Notes
	}
	if len(cols) == 0 {
		return &stmt, nil
	}
	if err := s.db.WithContext(ctx).Model(&stmt).Updates(cols).Error; err != nil {
		return nil, &ServiceError{Message: "Update failed", Code: 500}
	}
	return &stmt, nil
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
