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

// --------------------
// GetProjects retrieves all projects from the database.
// --------------------
// ProjectSummary is the clean output format for the client
type ProjectSummary struct {
	Name   string `json:"name"`
	Phases []int  `json:"phases"`
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

func (s *ContractService) DeleteProject(ctx context.Context, projectID uuid.UUID) error {
	// Delete the project by ID
	if err := s.db.WithContext(ctx).Delete(&models.Project{}, "id = ?", projectID).Error; err != nil {
		return err
	}
	return nil
}
