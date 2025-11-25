package services

import (
	"gorm.io/gorm"
)

type ContractService struct {
	db *gorm.DB
}

func NewContractService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}
