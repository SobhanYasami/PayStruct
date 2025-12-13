package services

import (
	"github.com/sobhan-yasami/docs-db-panel/internal/models"
	"gorm.io/gorm"
)

// --------------------------
// ContractService handles operations related to contracts and projects.
// --------------------------
type ContractService struct {
	db *gorm.DB
}

func NewContractService(db *gorm.DB) *ContractService {
	return &ContractService{db: db}
}

// ------------------------------------------------------------------------

func (s *ContractService) CreateProject(name string, phase int) error {
	project := models.Project{
		Name:  name,
		Phase: uint8(phase),
	}
	return s.db.Create(&project).Error
}
