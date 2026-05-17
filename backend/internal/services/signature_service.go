package services

// SignatureService is a compatibility stub. The signature-based approval
// workflow has been replaced by the 5-stage ApprovalEvent state machine
// in StatementService.Transition.  This type is retained so that existing
// handler wiring compiles without changes while the full migration proceeds.

import "gorm.io/gorm"

type SignatureService struct{ db *gorm.DB }

func NewSignatureService(db *gorm.DB) *SignatureService { return &SignatureService{db: db} }
