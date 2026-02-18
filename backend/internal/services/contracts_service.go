package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
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

// --------------------
// Project Management
// --------------------

// ProjectSummary is the clean output format for the client
type ProjectSummary struct {
	Name   string `json:"name"`
	Phases []int  `json:"phases"`
}

// CreateProject ensures a project exists. If it doesn't, it creates one.
func (s *ContractService) CreateProject(ctx context.Context, userID uuid.UUID, name string, phase uint8) error {
	// 1. Check if it already exists (Logic moved from Handler)
	var existingCount int64
	if err := s.db.WithContext(ctx).
		Model(&models.Project{}).
		Where("name = ? AND phase = ?", name, phase).
		Count(&existingCount).Error; err != nil {
		return err // Return database errors to the handler
	}

	// 2. Create if it doesn't exist
	if existingCount == 0 {
		project := models.Project{
			BaseModel: models.BaseModel{
				ID:        uuid.New(),
				CreatedBy: userID,
			},
			Name:  name,
			Phase: phase,
		}

		if err := s.db.WithContext(ctx).Create(&project).Error; err != nil {
			return err // Return creation errors
		}
	}

	// If it already existed, we just return nil (success) because the goal "Project exists" is met.
	return nil
}

// GetAllProjects fetches projects, groups them by name, and returns a summary.
func (s *ContractService) GetAllProjects(ctx context.Context) ([]models.Project, error) {
	// We can define the limit here, or pass it as an argument.
	const projectLimit = 50

	//? 1) Fetch projects with context and limit
	var projects []models.Project
	if err := s.db.WithContext(ctx).
		Limit(projectLimit). // Limit is handled by the service
		Order("name ASC").
		Find(&projects).Error; err != nil {
		return nil, err // Return the raw Gorm error
	}

	//? 2) Group projects by name and collect phases (Business logic handled by service)
	// projectsMap := make(map[string][]int)
	// for _, project := range projects {
	// 	projectsMap[project.Name] = append(projectsMap[project.Name], int(project.Phase))
	// }

	//? 3) Build final response structure (Transformation logic handled by service)
	// responseProjects := make([]ProjectSummary, 0, len(projectsMap))
	// for name, phases := range projectsMap {
	// 	responseProjects = append(responseProjects, ProjectSummary{
	// 		Name:   name,
	// 		Phases: phases,
	// 	})
	// }

	return projects, nil
}

// get project by ID
func (s *ContractService) GetProjectByID(ctx context.Context, projectID uuid.UUID) (*models.Project, error) {
	var project models.Project
	if err := s.db.WithContext(ctx).First(&project, "id = ?", projectID).Error; err != nil {
		return nil, err
	}
	return &project, nil
}

// UpdateProject updates project details.
func (s *ContractService) UpdateProject(ctx context.Context, projectID uuid.UUID, name string, phase uint8) error {
	// Update the project fields
	updates := map[string]interface{}{
		"name":  name,
		"phase": phase,
	}

	if err := s.db.WithContext(ctx).Model(&models.Project{}).Where("id = ?", projectID).Updates(updates).Error; err != nil {
		return err
	}
	return nil
}

// Delete Project deletes a project by its ID.
func (s *ContractService) DeleteProject(ctx context.Context, projectID uuid.UUID) error {
	// Delete the project by ID
	if err := s.db.WithContext(ctx).Delete(&models.Project{}, "id = ?", projectID).Error; err != nil {
		return err
	}
	return nil
}

// ---------------------------
// Contractor Management
// ---------------------------
// CreateContractor creates a new contractor in the system.
func (s *ContractService) CreateContractor(ctx context.Context, employeeID uuid.UUID, legalEntity bool, firstName, lastName, preferentialID, nationalID string) error {
	// check if contractor with same NationalID exists
	var existingCount int64
	if err := s.db.WithContext(ctx).
		Model(&models.Contractor{}).
		Where("national_id = ?", nationalID).
		Count(&existingCount).Error; err != nil {
		return err // Return database errors to the handler
	}

	if existingCount > 0 {
		return gorm.ErrRegistered // or a custom error indicating duplicate contractor
	}

	// Create new contractor
	contractor := models.Contractor{
		User: models.User{
			ID:          uuid.New(),
			FirstName:   firstName,
			LastName:    lastName,
			Permissions: "none",
		},
		LegalEntity:    legalEntity,
		PreferentialID: preferentialID,
		NationalID:     nationalID,
		CreatedBy:      employeeID,
	}

	if err := s.db.WithContext(ctx).Create(&contractor).Error; err != nil {
		return err
	}
	return nil
}

// GetAllContractors retrieves all contractors.
func (s *ContractService) GetAllContractors(ctx context.Context) ([]models.Contractor, error) {
	var contractors []models.Contractor
	if err := s.db.WithContext(ctx).Find(&contractors).Error; err != nil {
		return nil, err
	}
	return contractors, nil
}

// GetContractorByID retrieves a contractor by their ID.
func (s *ContractService) GetContractorByID(ctx context.Context, contractorID uuid.UUID) (*models.Contractor, error) {
	var contractor models.Contractor
	if err := s.db.WithContext(ctx).First(&contractor, "id = ?", contractorID).Error; err != nil {
		return nil, err
	}
	return &contractor, nil
}

// UpdateContractor updates contractor details.
func (s *ContractService) UpdateContractor(ctx context.Context, employeeID uuid.UUID, contractorID uuid.UUID, legalEntity bool, firstName, lastName, preferentialID, nationalID string) error {
	// Update the contractor fields
	updates := map[string]interface{}{
		"legal_entity":    legalEntity,
		"first_name":      firstName,
		"last_name":       lastName,
		"preferential_id": preferentialID,
		"national_id":     nationalID,
		"updated_by":      employeeID,
	}

	if err := s.db.WithContext(ctx).Model(&models.Contractor{}).Where("id = ?", contractorID).Updates(updates).Error; err != nil {
		return err
	}
	return nil
}

// DeleteContractor deletes a contractor by its ID.
func (s *ContractService) DeleteContractor(ctx context.Context, contractorID uuid.UUID, adminID uuid.UUID) error {
	// 1. We use a transaction to ensure both the 'DeletedBy' update
	// and the Soft Delete happen together.
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {

		// 2. Update the DeletedBy field first
		if err := tx.Model(&models.Contractor{}).
			Where("id = ?", contractorID).
			Update("deleted_by", adminID).Error; err != nil {
			return err
		}

		// 3. Perform the standard GORM Soft Delete
		if err := tx.Delete(&models.Contractor{}, "id = ?", contractorID).Error; err != nil {
			return err
		}

		return nil
	})
}

// ---------------------------
// Contract Management
// ---------------------------
// CreateContract
func (s *ContractService) CreateContract(ctx context.Context, userID, contractorID, projectID uuid.UUID, contractNumber string, GrossBudget float64, insuranceRate, performanceBond, addedValueTax float32, startDate, endDate time.Time, ScanedFileUrl string) error {
	contract := models.Contract{
		BaseModel: models.BaseModel{
			ID:        uuid.New(),
			CreatedBy: userID,
		},
		ContractorID:    contractorID,
		ProjectID:       projectID,
		ContractNumber:  contractNumber,
		GrossBudget:     GrossBudget,
		InsuranceRate:   insuranceRate,
		PerformanceBond: performanceBond,
		AddedValueTax:   addedValueTax,
		StartDate:       startDate,
		EndDate:         endDate,
		ScanedFileUrl:   ScanedFileUrl,
	}

	if err := s.db.WithContext(ctx).Create(&contract).Error; err != nil {
		return err
	}
	return nil
}

// GetAllContracts
func (s *ContractService) GetAllContracts(ctx context.Context) ([]models.Contract, error) {
	var contracts []models.Contract
	if err := s.db.WithContext(ctx).Find(&contracts).Error; err != nil {
		return nil, err
	}
	return contracts, nil
}

// GetContractByID
func (s *ContractService) GetContractByID(ctx context.Context, contractID uuid.UUID) (*models.Contract, error) {
	var contract models.Contract
	if err := s.db.WithContext(ctx).First(&contract, "id = ?", contractID).Error; err != nil {
		return nil, err
	}
	return &contract, nil
}

// GetContract by ContractNumber
func (s *ContractService) GetContractByNumber(ctx context.Context, contractNumber string) (*models.Contract, error) {
	var contract models.Contract
	if err := s.db.WithContext(ctx).First(&contract, "contract_number = ?", contractNumber).Error; err != nil {
		return nil, err
	}
	return &contract, nil
}

// UpdateContract
func (s *ContractService) UpdateContract(ctx context.Context, contractID, userID, contractorID, projectID uuid.UUID, contractNumber string, GrossBudget float64, insuranceRate, performanceBond, addedValueTax float32, startDate, endDate time.Time, ScanedFileUrl string) error {
	// Update the contract fields
	updates := map[string]interface{}{
		"contractor_id":    contractorID,
		"project_id":       projectID,
		"contract_number":  contractNumber,
		"gross_budget":     GrossBudget,
		"insurance_rate":   insuranceRate,
		"performance_bond": performanceBond,
		"added_value_tax":  addedValueTax,
		"start_date":       startDate,
		"end_date":         endDate,
		"scaned_file_url":  ScanedFileUrl,
		"updated_by":       userID,
	}

	if err := s.db.WithContext(ctx).Model(&models.Contract{}).Where("id = ?", contractID).Updates(updates).Error; err != nil {
		return err
	}
	return nil
}

// DeleteContract
func (s *ContractService) DeleteContract(ctx context.Context, contractID, userID uuid.UUID) error {
	// 1. We use a transaction to ensure both the 'DeletedBy' update
	// and the Soft Delete happen together.
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {

		// 2. Update the DeletedBy field first
		if err := tx.Model(&models.Contract{}).
			Where("id = ?", contractID).
			Update("deleted_by", userID).Error; err != nil {
			return err
		}

		// 3. Perform the standard GORM Soft Delete
		if err := tx.Delete(&models.Contract{}, "id = ?", contractID).Error; err != nil {
			return err
		}

		return nil
	})
}

// -----------
//
// --------
func (s *ContractService) CreateContractWBS(ctx context.Context, userID, contractID, contractorID, projectID uuid.UUID, description, unit string, quantity, unitPrice float64) error {

	// check for existing record with same description under the same contract
	var existingCount int64
	if err := s.db.WithContext(ctx).
		Model(&models.ContractWBS{}).
		Where("contract_id = ? AND description = ?", contractID, description).
		Count(&existingCount).Error; err != nil {
		return err // Return database errors to the handler
	}

	if existingCount > 0 {
		return gorm.ErrRegistered // or a custom error indicating duplicate contractor
	}

	// Create new record
	contractWbs := models.ContractWBS{
		BaseModel: models.BaseModel{
			ID:        uuid.New(),
			CreatedBy: userID,
		},
		Description:  description,
		Unit:         unit,
		Quantity:     quantity,
		UnitPrice:    unitPrice,
		TotalPrice:   quantity * unitPrice,
		ContractID:   contractID,
		ProjectID:    projectID,
		ContractorID: contractorID,
	}

	if err := s.db.WithContext(ctx).Create(&contractWbs).Error; err != nil {
		return err
	}
	return nil
}

// GetContractByID
func (s *ContractService) GetContractWBS(ctx context.Context, contractID uuid.UUID) (*[]models.ContractWBS, error) {
	var contract_wbs []models.ContractWBS
	if err := s.db.WithContext(ctx).Find(&contract_wbs, "contract_id = ?", contractID).Error; err != nil {
		return nil, err
	}
	return &contract_wbs, nil
}

// create tasks performed
func (s *ContractService) CreateTasksPerformed(ctx context.Context, userID, statusStatementID uuid.UUID, description, unit string, quantity, unitPrice float64) error {
	// Create new record
	taskPerformed := models.TasksPerformed{
		BaseModel: models.BaseModel{
			ID:        uuid.New(),
			CreatedBy: userID,
		},
		StatusStatementID: statusStatementID,
		Description:       description,
		Unit:              unit,
		Quantity:          quantity,
		UnitPrice:         unitPrice,
		TotalPrice:        quantity * unitPrice,
	}

	if err := s.db.WithContext(ctx).Create(&taskPerformed).Error; err != nil {
		return err
	}
	return nil
}

// GetLastStatement
func (s *ContractService) GetLastStatusStatement(ctx context.Context, contractID uuid.UUID) (*models.StatusStatement, error) {
	var statusStatement models.StatusStatement

	err := s.db.WithContext(ctx).
		Where("contract_id = ?", contractID).
		Order("number desc").
		First(&statusStatement).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &statusStatement, nil
}

// GetLast2StatusStatements returns the last 2 status statements for a contract
func (s *ContractService) GetLast2StatusStatements(ctx context.Context, contractID uuid.UUID) ([]*models.StatusStatement, error) {
	var status_statements []*models.StatusStatement

	if err := s.db.WithContext(ctx).
		Where("contract_id = ?", contractID).
		Order("number desc").
		Limit(2).
		Find(&status_statements).Error; err != nil {
		return nil, err
	}

	return status_statements, nil
}

// get last tasks performed
func (s *ContractService) GetLastTasksPerformed(ctx context.Context, statusStatementID uuid.UUID) (*[]models.TasksPerformed, error) {
	var tasks_performed []models.TasksPerformed

	if err := s.db.WithContext(ctx).Where("status_statement_id = ?", statusStatementID).Order("created_at desc").Find(&tasks_performed).Error; err != nil {
		return nil, err
	}
	return &tasks_performed, nil
}

// CreateStatusStatement
func (s *ContractService) CreateStatusStatement(ctx context.Context, userID, contractID, contractorID, projectID uuid.UUID, statementDateStart, statementDateEnd time.Time, statusNumber uint16, status string) (models.StatusStatement, error) {
	// Create new record
	neue_statusStatement := models.StatusStatement{
		BaseModel: models.BaseModel{
			ID:        uuid.New(),
			CreatedBy: userID,
		},
		ContractID:         contractID,
		ContractorID:       contractorID,
		ProjectID:          projectID,
		StatementDateStart: statementDateStart,
		StatementDateEnd:   statementDateEnd,
		Status:             status,
		Number:             statusNumber,
	}

	if err := s.db.WithContext(ctx).Create(&neue_statusStatement).Error; err != nil {
		return models.StatusStatement{}, err
	}
	return neue_statusStatement, nil
}

// SubmitStatusStatement updates the status statement state to "submitted"
func (s *ContractService) SubmitStatusStatement(ctx context.Context, userUUID, statusStatementID uuid.UUID) error {
	var statusStatement models.StatusStatement
	if err := s.db.WithContext(ctx).First(&statusStatement, "id = ?", statusStatementID).Error; err != nil {
		return err
	}

	// Update the status to "submitted"
	statusStatement.Status = "submitted"
	statusStatement.UpdatedBy = userUUID

	if err := s.db.WithContext(ctx).Save(&statusStatement).Error; err != nil {
		return err
	}

	return nil
}

// Extra works:
func (s *ContractService) CreateExtraWorks(ctx context.Context, userID, statusStatementID uuid.UUID, description, unit string, quantity, unitPrice float64) error {
	// Create new record
	additionalWork := models.AdditionalWorks{
		BaseModel: models.BaseModel{
			ID:        uuid.New(),
			CreatedBy: userID,
		},
		StatusStatementID: statusStatementID,
		Description:       description,
		Unit:              unit,
		Quantity:          quantity,
		UnitPrice:         unitPrice,
		TotalPrice:        quantity * unitPrice,
	}

	if err := s.db.WithContext(ctx).Create(&additionalWork).Error; err != nil {
		return err
	}
	return nil
}
