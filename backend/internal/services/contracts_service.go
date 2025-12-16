package services

import (
	"context"

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
func (s *ContractService) GetAllProjects(ctx context.Context) ([]ProjectSummary, error) {
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
	projectsMap := make(map[string][]int)
	for _, project := range projects {
		projectsMap[project.Name] = append(projectsMap[project.Name], int(project.Phase))
	}

	//? 3) Build final response structure (Transformation logic handled by service)
	responseProjects := make([]ProjectSummary, 0, len(projectsMap))
	for name, phases := range projectsMap {
		responseProjects = append(responseProjects, ProjectSummary{
			Name:   name,
			Phases: phases,
		})
	}

	return responseProjects, nil
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
func (s *ContractService) DeleteContractor(ctx context.Context, contractorID uuid.UUID) error {
	// Delete the contractor by ID
	if err := s.db.WithContext(ctx).Delete(&models.Contractor{}, "id = ?", contractorID).Error; err != nil {
		return err
	}
	return nil
}
