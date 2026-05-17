package handlers

// SignatureHandler is a compatibility stub retained while the approval workflow
// migrates to ApprovalEvent. Routes that previously handled signatures are
// superseded by statement_handler.Transition (5-stage state machine).

import (
	"gorm.io/gorm"

	"github.com/sobhan-yasami/docs-db-panel/internal/services"
)

type SignatureHandler struct {
	svc *services.SignatureService
}

func NewSignatureHandler(db *gorm.DB) *SignatureHandler {
	return &SignatureHandler{svc: services.NewSignatureService(db)}
}
