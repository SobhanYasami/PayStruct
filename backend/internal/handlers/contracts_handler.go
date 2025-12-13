package handlers

import (
	// "errors"
	// "fmt"
	// "mime/multipart"
	// "os"
	// "path/filepath"
	"strconv"
	// "time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/models"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"

	"github.com/go-playground/validator/v10"
	"gorm.io/gorm"
)

// ContractHandler handles contractor-related endpoints
type ContractHandler struct {
	db              *gorm.DB
	contractService *services.ContractService
}

func NewContractHandler(db *gorm.DB) *ContractHandler {
	return &ContractHandler{
		db:              db,
		contractService: services.NewContractService(db),
	}
}

// -----------------------------------------------------
var validate = validator.New()

// ! @post /contractors/new-project
func (handler *ContractHandler) CreateProject(c *fiber.Ctx) error {
	//? 1) Get user ID from context (set by middleware)
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Internal server error"))
	}
	//? 2-1) request struct
	type RequestBody struct {
		ProjectName string `json:"projectName" validate:"required"`
		Phase       string `json:"phase" validate:"required"`
	}

	//? 2-2) Parse Body request
	var req RequestBody
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid Request!"))
	}
	//? 2-3) Validate using struct tags
	if err := validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid Request!"))
	}

	//? 3) Validate and parse Project Phase
	phase, err := strconv.ParseUint(req.Phase, 10, 8)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Project phase must be a number"))
	}

	//? 4) Check if project exist
	ctx := c.Context()
	var existingCount int64
	if err := handler.db.WithContext(ctx).
		Model(&models.Project{}).
		Where("name = ? AND phase = ?", req.ProjectName, uint8(phase)).
		Count(&existingCount).Error; err != nil {

		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Error checking existing projects"))
	}
	//? 5) Create project if it doesn't exist
	if existingCount == 0 {
		project := models.Project{
			BaseModel: models.BaseModel{
				ID:        uuid.New(),
				CreatedBy: userID,
			},
			Name:  req.ProjectName,
			Phase: uint8(phase),
		}

		if err := handler.db.WithContext(ctx).Create(&project).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Error creating project"))

		}
	}

	//? 6) Return success response
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(fiber.Map{
		"Project_Name": req.ProjectName,
		"Phase":        phase,
	}, "Project created successfully"))

}

// ProjectSummary represents the grouped project data for response
type ProjectSummary struct {
	Name   string `json:"name"`
	Phases []int  `json:"phases"`
}

// ! @Router /contractors/projects [get]
func (handler *ContractHandler) GetAllProject(c *fiber.Ctx) error {
	ctx := c.Context()
	//? 1) Fetch projects with context and limit
	var projects []models.Project
	if err := handler.db.WithContext(ctx).
		Limit(50).
		Order("name ASC").
		Find(&projects).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Error fetching projects"))
	}

	//? 2) Group projects by name and collect phases
	projectsMap := make(map[string][]int)
	for _, project := range projects {
		projectsMap[project.Name] = append(projectsMap[project.Name], int(project.Phase))
	}

	//? 3) Build response
	responseProjects := make([]ProjectSummary, 0, len(projectsMap))
	for name, phases := range projectsMap {
		responseProjects = append(responseProjects, ProjectSummary{
			Name:   name,
			Phases: phases,
		})
	}

	//? 4) Return response
	return c.Status(fiber.StatusOK).JSON(SuccessResponse(responseProjects, "Project Retrieved Successfully"))
}

// ! @post /contractors/new-contract
// func (ctrl *ContractHandler) CreateContractor(c *fiber.Ctx) error {
// 	//? 1) Get user ID from context (set by middleware)
// 	userID, ok := c.Locals("userID").(uuid.UUID)
// 	if !ok {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "error",
// 			Message: "خطای سرور",
// 		})
// 	}
// 	//? 2-1. request struct
// 	type CreateContractRequest struct {
// 		FullName             string               `json:"fullName" validate:"required"`
// 		ContractorType       string               `json:"contractorType"`
// 		ContractID           string               `json:"contractId" validate:"required"`
// 		ContractorDetailedID string               `json:"contractorDetailedId" validate:"required"`
// 		ContractorNationalID string               `json:"contractorNationalId" validate:"required"`
// 		ContractStartDate    time.Time            `json:"contractStartDate"` // you must parse this on the backend
// 		ContractEndDate      time.Time            `json:"contractEndDate"`   // same
// 		GrossContractAmount  string               `json:"grossContractAmount"`
// 		ProjectName          string               `json:"projectName"`
// 		InsuranceRate        string               `json:"InsuranceRate"`
// 		PerformanceBond      string               `json:"PerformanceBond"`
// 		AddedValueTax        string               `json:"AddedValueTax"`
// 		ScannedFile          multipart.FileHeader `json:"ScannedFile"`
// 		Phase0               bool                 `json:"phase0,omitempty"`
// 		Phase1               bool                 `json:"phase1,omitempty"`
// 		Phase2               bool                 `json:"phase2,omitempty"`
// 		Phase3               bool                 `json:"phase3,omitempty"`
// 	}
// 	//? 2-2. Pars Body request
// 	var req CreateContractRequest
// 	if err := c.BodyParser(&req); err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ورودی های نا معتبر"})
// 	}

// 	//? 3. Create Contractor
// 	//* check for existing records
// 	var existingContractor models.Contractor
// 	if err := ctrl.db.Where("contract_no = ? AND full_name = ?", req.ContractID, req.FullName).First(&existingContractor).Error; err == nil {
// 		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
// 			"status":  "failure",
// 			"message": "قرارداد با این شماره قبلا ثبت شده است",
// 		})
// 	}
// 	//* sanitize data
// 	var legalEntityBool bool
// 	if req.ContractorType == "legal" {
// 		legalEntityBool = true
// 	} else {
// 		legalEntityBool = false
// 	}
// 	grossBudget, err := strconv.ParseFloat(req.GrossContractAmount, 32)
// 	if err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "مبلغ قرارداد نامعتبر است اعداد را انگلیسی وارد کنید"})
// 	}
// 	duration := req.ContractEndDate.Sub(req.ContractStartDate)
// 	days := int(duration.Hours() / 24)

// 	insuranceRate, err := strconv.ParseFloat(req.InsuranceRate, 32)
// 	if err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "نرخ بیمه نامعتبر است اعداد را انگلیسی وارد کنید"})
// 	}
// 	performanceBond, err := strconv.ParseFloat(req.PerformanceBond, 32)
// 	if err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "حسن انجام کار نامعتبر است اعداد را انگلیسی وارد کنید"})
// 	}
// 	addedValueTax, err := strconv.ParseFloat(req.AddedValueTax, 32)
// 	if err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "مالیات بر ارزش افزوده نامعتبر است اعداد را انگلیسی وارد کنید"})
// 	}

// 	//*‌ Get scaned file
// 	file, err := c.FormFile("ScannedFile")
// 	if err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
// 			"status":  "fail",
// 			"message": "فایل اسکن شده الزامیست",
// 		})
// 	}
// 	if file.Size > 50*1024*1024 {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
// 			"status":  "failure",
// 			"message": "حجم فایل نباید بیشتر از 50 مگابایت باشد",
// 		})
// 	}

// 	//* Create directory if doesn't exist
// 	uploadDir := fmt.Sprintf("../storage/%s", req.ContractorNationalID)
// 	if err := os.MkdirAll(uploadDir, 0755); err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"status":  "fail",
// 			"message": "خطا در ایجاد پوشه",
// 		})
// 	}

// 	//* save scaned file
// 	filePath := filepath.Join(uploadDir, file.Filename)
// 	if err := c.SaveFile(file, filePath); err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"status":  "fail",
// 			"message": "خطا در ذخیره فایل اسکن شده",
// 		})
// 	}

// 	//* create model for database
// 	var contractor = models.Contractor{
// 		BaseModel: models.BaseModel{
// 			ID:        uuid.New(),
// 			CreatedBy: userID,
// 		},
// 		FullName:       req.FullName,
// 		LegalEntity:    legalEntityBool,
// 		PreferentialID: req.ContractorDetailedID,
// 		NationalID:     req.ContractorNationalID,

// 		ContractNo:      req.ContractID,
// 		GrossBudget:     float32(grossBudget),
// 		StartDate:       req.ContractStartDate,
// 		Duration:        uint16(days),
// 		EndDate:         req.ContractEndDate,
// 		InsuranceRate:   float32(insuranceRate),
// 		PerformanceBond: float32(performanceBond),
// 		AddedValueTax:   float32(addedValueTax),
// 		ScanedFileUrl:   filePath,
// 	}

// 	if err := ctrl.db.Create(&contractor).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "خطا در ایجاد قرارداد"})
// 	}

// 	//? 4. Get Project IDs
// 	var phase0 int
// 	var phase1 int
// 	var phase2 int
// 	var phase3 int

// 	if req.Phase0 {
// 		phase0 = 0
// 	}
// 	if req.Phase1 {
// 		phase1 = 1
// 	}
// 	if req.Phase2 {
// 		phase2 = 2
// 	}
// 	if req.Phase3 {
// 		phase3 = 3
// 	}
// 	var project_phase0 models.Project
// 	var project_phase1 models.Project
// 	var project_phase2 models.Project
// 	var project_phase3 models.Project
// 	if err := ctrl.db.Where("name = ? AND phase = ?", req.ProjectName, phase0).First(&project_phase0).Error; err == nil {
// 	}
// 	if err := ctrl.db.Where("name = ? AND phase = ?", req.ProjectName, phase1).First(&project_phase1).Error; err == nil {
// 	}
// 	if err := ctrl.db.Where("name = ? AND phase = ?", req.ProjectName, phase2).First(&project_phase2).Error; err == nil {
// 	}
// 	if err := ctrl.db.Where("name = ? AND phase = ?", req.ProjectName, phase3).First(&project_phase3).Error; err == nil {
// 	}

// 	if project_phase0.ID != uuid.Nil {
// 		//* 4.1 Create Contractor Project Table
// 		var cont_project = models.ContractorProject{
// 			BaseModel: models.BaseModel{
// 				ID:        uuid.New(),
// 				CreatedBy: userID,
// 			},
// 			ContractorID: contractor.ID,
// 			ProjectID:    project_phase0.ID,
// 		}
// 		if err := ctrl.db.Create(&cont_project).Error; err != nil {
// 			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "خطا در ایجاد جدول پیمانکار-پروژه"})
// 		}
// 		//* 4. Create First Status Statement
// 		var status_statement = models.StatusStatement{
// 			BaseModel: models.BaseModel{
// 				ID:        uuid.New(),
// 				CreatedBy: userID,
// 			},
// 			ContractorID: contractor.ID,
// 			ProjectID:    project_phase0.ID,

// 			ProgressPercent:    0.00,
// 			StatementDateStart: req.ContractStartDate,
// 			StatementDateEnd:   req.ContractStartDate,
// 			Status:             "Zero_Day",
// 			Number:             0,
// 			ApprovedBy:         userID.String(),
// 		}
// 		if err := ctrl.db.Create(&status_statement).Error; err != nil {
// 			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "خطا در ایجاد پیشرفت پیمانکار"})
// 		}
// 	}
// 	if project_phase1.ID != uuid.Nil {
// 		//* 4.1 Create Contractor Project Table
// 		var cont_project = models.ContractorProject{
// 			BaseModel: models.BaseModel{
// 				ID:        uuid.New(),
// 				CreatedBy: userID,
// 			},
// 			ContractorID: contractor.ID,
// 			ProjectID:    project_phase1.ID,
// 		}
// 		if err := ctrl.db.Create(&cont_project).Error; err != nil {
// 			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "خطا در ایجاد جدول پیمانکار-پروژه"})
// 		}
// 		//* 4. Create First Status Statement
// 		var status_statement = models.StatusStatement{
// 			BaseModel: models.BaseModel{
// 				ID:        uuid.New(),
// 				CreatedBy: userID,
// 			},
// 			ContractorID: contractor.ID,
// 			ProjectID:    project_phase1.ID,

// 			ProgressPercent:    0.00,
// 			StatementDateStart: req.ContractStartDate,
// 			StatementDateEnd:   req.ContractStartDate,
// 			Status:             "Zero_Day",
// 			Number:             0,
// 			ApprovedBy:         userID.String(),
// 		}
// 		if err := ctrl.db.Create(&status_statement).Error; err != nil {
// 			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "خطا در ایجاد پیشرفت پیمانکار"})
// 		}
// 	}
// 	if project_phase2.ID != uuid.Nil {
// 		//* 4.1 Create Contractor Project Table
// 		var cont_project = models.ContractorProject{
// 			BaseModel: models.BaseModel{
// 				ID:        uuid.New(),
// 				CreatedBy: userID,
// 			},
// 			ContractorID: contractor.ID,
// 			ProjectID:    project_phase2.ID,
// 		}
// 		if err := ctrl.db.Create(&cont_project).Error; err != nil {
// 			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "خطا در ایجاد جدول پیمانکار-پروژه"})
// 		}
// 		//* 4. Create First Status Statement
// 		var status_statement = models.StatusStatement{
// 			BaseModel: models.BaseModel{
// 				ID:        uuid.New(),
// 				CreatedBy: userID,
// 			},
// 			ContractorID: contractor.ID,
// 			ProjectID:    project_phase2.ID,

// 			ProgressPercent:    0.00,
// 			StatementDateStart: req.ContractStartDate,
// 			StatementDateEnd:   req.ContractStartDate,
// 			Status:             "Zero_Day",
// 			Number:             0,
// 			ApprovedBy:         userID.String(),
// 		}
// 		if err := ctrl.db.Create(&status_statement).Error; err != nil {
// 			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "خطا در ایجاد پیشرفت پیمانکار"})
// 		}
// 	}
// 	if project_phase3.ID != uuid.Nil {
// 		//* 4.1 Create Contractor Project Table
// 		var cont_project = models.ContractorProject{
// 			BaseModel: models.BaseModel{
// 				ID:        uuid.New(),
// 				CreatedBy: userID,
// 			},
// 			ContractorID: contractor.ID,
// 			ProjectID:    project_phase3.ID,
// 		}
// 		if err := ctrl.db.Create(&cont_project).Error; err != nil {
// 			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "خطا در ایجاد جدول پیمانکار-پروژه"})
// 		}
// 		//* 4. Create First Status Statement
// 		var status_statement = models.StatusStatement{
// 			BaseModel: models.BaseModel{
// 				ID:        uuid.New(),
// 				CreatedBy: userID,
// 			},
// 			ContractorID: contractor.ID,
// 			ProjectID:    project_phase3.ID,

// 			ProgressPercent:    0.00,
// 			StatementDateStart: req.ContractStartDate,
// 			StatementDateEnd:   req.ContractStartDate,
// 			Status:             "Zero_Day",
// 			Number:             0,
// 			ApprovedBy:         userID.String(),
// 		}
// 		if err := ctrl.db.Create(&status_statement).Error; err != nil {
// 			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "خطا در ایجاد پیشرفت پیمانکار"})
// 		}
// 	}

// 	//? Send Response
// 	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
// 		"status":  "success",
// 		"message": "قرارداد با موفقیت ایجاد شد",
// 		"data": fiber.Map{
// 			"fullName": req.FullName,
// 		},
// 	})
// }

// ! @get /contractors/search-by-id
// @Summary Search contracts by ID
// @Tags Contracts
// @Accept json
// @Produce json
// @Param contract_number query int true "Contract number to search"
// @Success 200 {object} ContractResponse
// @Router /contractors/search-by-id [get]
// func (ctrl *ContractHandler) GetContractorByID(c *fiber.Ctx) error {
// 	//? 1) Parse query parameters
// 	contractNumber := c.Query("contract_number")
// 	if contractNumber == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "شماره قرارداد وارد نشده است",
// 		})
// 	}

// 	//? 3) Query results form database
// 	var contract models.Contractor
// 	err := ctrl.db.Where("contract_no = ?", contractNumber).First(&contract).Error
// 	if err != nil {
// 		if errors.Is(err, gorm.ErrRecordNotFound) {
// 			return c.Status(fiber.StatusNotFound).JSON(CtrlResponse{
// 				Status:  "failure",
// 				Message: "قرارداد یافت نشد",
// 			})
// 		}

// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "خطای سرور در دریافت اطلاعات قرارداد",
// 		})
// 	}

// 	remainingDuration := time.Until(contract.EndDate)
// 	RemainingDays := int(remainingDuration.Hours() / 24)

// 	var legal_entity string
// 	if contract.LegalEntity {
// 		legal_entity = "حقوقی"
// 	} else {
// 		legal_entity = "حقیقی"
// 	}

// 	//? 5) Return response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "قرارداد با موفقیت یافت شد",
// 		Data: fiber.Map{
// 			"id":               contract.ID,
// 			"legal_entity":     legal_entity,
// 			"full_name":        contract.FullName,
// 			"preferential_id":  contract.PreferentialID,
// 			"contract_no":      contract.ContractNo,
// 			"national_id":      contract.NationalID,
// 			"contract_date":    contract.StartDate,
// 			"gross_budget":     contract.GrossBudget,
// 			"remaining_days":   RemainingDays,
// 			"performance_bond": contract.PerformanceBond,
// 			"insurance_rate":   contract.InsuranceRate,
// 			"added_value_tax":  contract.AddedValueTax,
// 		},
// 	})
// }

// Todo: ! @get /contractors/contracts/:[name, limit, page]

// ! @get /contractors/contractor-projects
// func (ctrl *ContractHandler) GetContractorProjects(c *fiber.Ctx) error {
// 	//? 1. Parse query parameter
// 	contractNumber := c.Query("contract_number")
// 	if contractNumber == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "شماره قرارداد وارد نشده است",
// 		})
// 	}

// 	//? 2. Query contractor by contract number
// 	var contract models.Contractor
// 	if err := ctrl.db.Where("contract_no = ?", contractNumber).First(&contract).Error; err != nil {
// 		if errors.Is(err, gorm.ErrRecordNotFound) {
// 			return c.Status(fiber.StatusNotFound).JSON(CtrlResponse{
// 				Status:  "failure",
// 				Message: "قرارداد یافت نشد",
// 			})
// 		}
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "خطای سرور در دریافت اطلاعات قرارداد",
// 		})
// 	}

// 	//? 3. Get contractor project mappings
// 	var contractorProjects []models.ContractorProject
// 	if err := ctrl.db.Where("contractor_id = ?", contract.ID).Find(&contractorProjects).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "خطا در دریافت اطلاعات پروژه\u200cهای پیمانکار",
// 		})
// 	}
// 	//? 4. Extract project IDs
// 	projectIDs := make([]uuid.UUID, 0, len(contractorProjects))
// 	for _, cp := range contractorProjects {
// 		projectIDs = append(projectIDs, cp.ProjectID)
// 	}

// 	//? 5. Query only matched projects
// 	var projects []models.Project
// 	if len(projectIDs) > 0 {
// 		if err := ctrl.db.Where("id IN ?", projectIDs).Find(&projects).Error; err != nil {
// 			return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 				Status:  "failure",
// 				Message: "خطا در دریافت پروژه\u200cها",
// 			})
// 		}
// 	}

// 	//? 6. Group by project name
// 	type ProjectSan struct {
// 		Name      string      `json:"name"`
// 		Phase     []int       `json:"phase"`
// 		ProjectID []uuid.UUID `json:"ids"`
// 	}
// 	projectMap := make(map[string]*ProjectSan)

// 	for _, p := range projects {
// 		if _, exists := projectMap[p.Name]; !exists {
// 			projectMap[p.Name] = &ProjectSan{
// 				Name:      p.Name,
// 				Phase:     []int{},
// 				ProjectID: []uuid.UUID{},
// 			}
// 		}
// 		projectMap[p.Name].Phase = append(projectMap[p.Name].Phase, int(p.Phase))
// 		projectMap[p.Name].ProjectID = append(projectMap[p.Name].ProjectID, p.ID)
// 	}
// 	//? 7. Convert map to slice
// 	response := make([]ProjectSan, 0, len(projectMap))
// 	for _, ps := range projectMap {
// 		response = append(response, *ps)
// 	}

// 	//? 5. Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "پروژه\u200cها با موفقیت دریافت شدند",
// 		Data:    response,
// 	})

// }

// ! @get /contractors/get-last-status-statement
// func (ctrl *ContractHandler) GetLastStatusStatement(c *fiber.Ctx) error {
// 	//? 1) Parse query parameters
// 	contractNumber := c.Query("contract_number")
// 	if contractNumber == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "شماره قرارداد وارد نشده است",
// 		})
// 	}
// 	projectName := c.Query("project_name")
// 	if projectName == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "پروژه ای انتخاب نشده",
// 		})
// 	}
// 	projectPhase := c.Query("project_phase")
// 	if projectPhase == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "فاز پروژه انتخاب نشده",
// 		})
// 	}

// 	//? 3. find contractor ID
// 	var contractor models.Contractor
// 	if err := ctrl.db.Where("contract_no = ?", contractNumber).First(&contractor).Error; err != nil {
// 		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
// 			"status":  "failure",
// 			"message": "پیمانکار یافت نشد",
// 		})
// 	}
// 	//? 4. Search for projects ID
// 	var projects models.Project
// 	if err := ctrl.db.Where("name = ? AND phase = ?", projectName, projectPhase).First(&projects).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"status":  "faluire",
// 			"message": "خطا در دریافت پروژه ها",
// 		})
// 	}

// 	//? 6. Get Project Progress
// 	var status_statement models.StatusStatement
// 	if err := ctrl.db.Where("contractor_id = ? AND project_id = ?", contractor.ID, projects.ID).Order("created_at DESC").First(&status_statement).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"status":  "faluire",
// 			"message": "خطا در دریافت آخرین صورت وضعیت",
// 		})
// 	}

// 	//? 6. Send response
// 	return c.Status(fiber.StatusOK).JSON(fiber.Map{
// 		"status":  "success",
// 		"message": "آخرین صورت وضعیت با موفقیت دریافت شد",
// 		"data":    status_statement,
// 	})
// }

// ! @post /contractors/new-status-statement
// func (ctrl *ContractHandler) CreateNewStatusStatement(c *fiber.Ctx) error {
// 	//? 1) Get user ID from context (set by middleware)
// 	userID, ok := c.Locals("userID").(uuid.UUID)
// 	if !ok {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "error",
// 			Message: "خطای سرور",
// 		})
// 	}
// 	//? 2. Parse Body Request
// 	type SttsRequest struct {
// 		ContractorNumber string    `json:"contract_no" validate:"required"`
// 		ProjectName      string    `json:"project_name" validate:"required"`
// 		ProjectPhase     string    `json:"project_phase" validate:"required"`
// 		StatProgress     string    `json:"stat_progress" validate:"required"`
// 		StatStartDate    time.Time `json:"stat_start_date" validate:"required"`
// 		StatEndDate      time.Time `json:"stat_end_date" validate:"required"`
// 		StatNumber       string    `json:"stat_number" validate:"required"`
// 	}
// 	var req SttsRequest
// 	if err := c.BodyParser(&req); err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "ورودی های نا معتبر",
// 		})
// 	}
// 	if req.ContractorNumber == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "شماره قرارداد الزامی است"})
// 	}
// 	if req.ProjectName == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "نام پروژه الزامی است"})
// 	}
// 	if req.ProjectPhase == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "فاز پروژه الزامی است"})
// 	}
// 	if req.StatProgress == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "درصد پیشرفت الزامی است"})
// 	}
// 	if req.StatStartDate.Year() == 1970 {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "تاریخ شروع صورت وضعیت الزامی است"})
// 	}
// 	if req.StatEndDate.Year() == 1970 {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "تاریخ پایان صورت وضعیت الزامی است"})
// 	}

// 	//? 3. find contractor ID
// 	var contractor models.Contractor
// 	if err := ctrl.db.Where("contract_no = ?", req.ContractorNumber).First(&contractor).Error; err != nil {
// 		return c.Status(fiber.StatusNotFound).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "پیمانکار یافت نشد",
// 		})
// 	}
// 	//? 4. Search for projects ID
// 	var projects models.Project
// 	if err := ctrl.db.Where("name = ? AND phase = ?", req.ProjectName, req.ProjectPhase).First(&projects).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت پروژه ها",
// 		})
// 	}

// 	//? 5. Check if Status Statement exists
// 	startDateStr := req.StatStartDate.Format("2006-01-02")
// 	endDateStr := req.StatEndDate.Format("2006-01-02")
// 	var existing_status_statement models.StatusStatement
// 	err := ctrl.db.Where(`
//         contractor_id = ?
//         AND project_id = ?
//         AND statement_date_start::date = ?
//         AND statement_date_end::date = ?`,
// 		contractor.ID, projects.ID, startDateStr, endDateStr).
// 		First(&existing_status_statement).Error

// 	//* ✅ Record exists → duplicate
// 	if err == nil {
// 		return c.Status(fiber.StatusConflict).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "صورت وضعیت تکراری",
// 		})
// 	}

// 	//* ❌ Real DB error
// 	if !errors.Is(err, gorm.ErrRecordNotFound) {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "خطا در ارتباط با پایگاه داده",
// 		})
// 	}
// 	//? 6. Create Status Statement
// 	statNumberInt, err := strconv.Atoi(req.StatNumber)
// 	if err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "شماره صورت وضعیت نامعتبر است"})
// 	}
// 	statProgressFloat, err := strconv.ParseFloat(req.StatProgress, 64)
// 	if err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "درصد پیشرفت نامعتبر است"})
// 	}
// 	var status_statement = models.StatusStatement{
// 		BaseModel: models.BaseModel{
// 			ID:        uuid.New(),
// 			CreatedBy: userID,
// 		},
// 		ContractorID:       contractor.ID,
// 		ProjectID:          projects.ID,
// 		ProgressPercent:    float32(statProgressFloat),
// 		StatementDateStart: req.StatStartDate,
// 		StatementDateEnd:   req.StatEndDate,
// 		Status:             "Pending",
// 		Number:             uint16(statNumberInt),
// 	}

// 	if err := ctrl.db.Create(&status_statement).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{Status: "failure", Message: "خطا در ایجاد صورت وضعیت"})
// 	}

// 	//? 7. Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "صورت وضعیت با موفقیت ایجاد شد",
// 		Data:    status_statement,
// 	})
// }

// ! @get /contractors/get-status-statement
// func (ctrl *ContractHandler) GetStatusStatement(c *fiber.Ctx) error {
// 	//? 1) Parse query parameters
// 	status_statement_id := c.Query("status_statement_id")
// 	if status_statement_id == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "صورت وضعیتی برای صدور وجود ندارد",
// 		})
// 	}
// 	contract_id := c.Query("contract_id")
// 	if contract_id == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "شماره قرارداد وجود ندارد",
// 		})
// 	}
// 	project_id := c.Query("project_id")
// 	if project_id == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "پروژه وجود ندارد",
// 		})
// 	}

// 	//? 3. get contract
// 	var contract models.Contractor
// 	if err := ctrl.db.Where("id = ?", contract_id).First(&contract).Error; err != nil {
// 		return c.Status(fiber.StatusNotFound).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "قرارداد یافت نشد",
// 		})
// 	}
// 	//? 4. get project
// 	var project models.Project
// 	if err := ctrl.db.Where("id = ?", project_id).First(&project).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت پروژه ها",
// 		})
// 	}

// 	//? 6. Get Project Progress
// 	var last_status_statement models.StatusStatement
// 	if err := ctrl.db.Where("contractor_id = ? AND project_id = ? AND id <> ?", contract.ID, project.ID, status_statement_id).Order("created_at DESC").First(&last_status_statement).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت آخرین صورت وضعیت",
// 		})
// 	}
// 	var status_statement models.StatusStatement
// 	if err := ctrl.db.Where("id = ?", status_statement_id).First(&status_statement).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت آخرین صورت وضعیت",
// 		})
// 	}

// 	type ResData struct {
// 		Contract    models.Contractor      `json:"contract"`
// 		Project     models.Project         `json:"project"`
// 		LastStat    models.StatusStatement `json:"last_stat"`
// 		OngoingStat models.StatusStatement `json:"ongoing_stat"`
// 	}

// 	data := ResData{
// 		Contract:    contract,
// 		Project:     project,
// 		LastStat:    last_status_statement,
// 		OngoingStat: status_statement,
// 	}

// 	//? 6. Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "آخرین صورت وضعیت با موفقیت دریافت شد",
// 		Data:    data,
// 	})
// }

// ! @post /contractors/new-task-performed
// func (ctrl *ContractHandler) CreateNewTaskPerformed(c *fiber.Ctx) error {
// 	//? 1) Get user ID from context (set by middleware)
// 	userID, ok := c.Locals("userID").(uuid.UUID)
// 	if !ok {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "error",
// 			Message: "خطای سرور",
// 		})
// 	}
// 	//? 2. Parse Body Request
// 	type TasksPerformed struct {
// 		StatusStatementID string `json:"statusStatmntId" validate:"required"`
// 		Description       string `json:"description" validate:"required"`
// 		Unit              string `json:"unit" validate:"required"`
// 		Quantity          string `json:"quantity" validate:"required"`
// 		UnitPrice         string `json:"unitPrice" validate:"required"`
// 	}
// 	var reqs []TasksPerformed
// 	if err := c.BodyParser(&reqs); err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "ورودی های نا معتبر"})
// 	}

// 	//? 3. Check if any task saved for current status statement
// 	var existing_stts_items models.TasksPerformed
// 	err := ctrl.db.Where(`
//         status_statement_id = ? `,
// 		reqs[0].StatusStatementID).
// 		First(&existing_stts_items).Error

// 	//* ✅ Record exists → duplicate
// 	if err == nil {
// 		return c.Status(fiber.StatusConflict).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "کارکرد ثبت شده",
// 		})
// 	}

// 	//* ❌ Real DB error
// 	if !errors.Is(err, gorm.ErrRecordNotFound) {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "error",
// 			Message: "خطا در ارتباط با پایگاه داده",
// 		})
// 	}

// 	//? 4. Validate and save record to database
// 	var new_record []models.TasksPerformed
// 	for _, req := range reqs {
// 		if req.StatusStatementID == "" {
// 			return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "شما هنوز صورت وضعیت جدیدی ایجاد نکردید"})
// 		}
// 		if req.Description == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "شرح آیتم الزامیست"})
// 		}
// 		if req.Unit == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "واحد آیتم الزامیست"})
// 		}
// 		if req.Quantity == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "مقدار آیتم الزامیست"})
// 		}
// 		if req.UnitPrice == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "قیمت واحد آیتم الزامیست"})
// 		}
// 		var existing_task models.TasksPerformed
// 		err := ctrl.db.Where(`
//         status_statement_id = ?
//         AND description = ? `,
// 			req.StatusStatementID, req.Description).
// 			First(&existing_task).Error

// 		//* ✅ Record exists → duplicate
// 		if err == nil {
// 			return c.Status(fiber.StatusConflict).JSON(CtrlResponse{
// 				Status:  "failure",
// 				Message: "آیتم تکراری",
// 			})
// 		}

// 		//* ❌ Real DB error
// 		if !errors.Is(err, gorm.ErrRecordNotFound) {
// 			return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 				Status:  "error",
// 				Message: "خطا در ارتباط با پایگاه داده",
// 			})
// 		}

// 		quantity, err := strconv.ParseFloat(req.Quantity, 64)
// 		if err != nil {
// 			return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "مقدار نامعتبر است"})
// 		}
// 		unit_price, err := strconv.ParseFloat(req.UnitPrice, 64)
// 		if err != nil {
// 			return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "قیمت واحد نامعتبر است"})
// 		}
// 		parsedUUID, err := uuid.Parse(req.StatusStatementID)
// 		if err != nil {
// 			return err // or handle the error accordingly
// 		}

// 		var task_performed_record = models.TasksPerformed{
// 			BaseModel: models.BaseModel{
// 				ID:        uuid.New(),
// 				CreatedBy: userID,
// 			},
// 			StatusStatementID: parsedUUID,
// 			Description:       req.Description,
// 			Unit:              req.Unit,
// 			Quantity:          quantity,
// 			UnitPrice:         unit_price,
// 			TotalPrice:        quantity * unit_price,
// 		}
// 		new_record = append(new_record, task_performed_record)
// 	}
// 	var total_price_sum float64 = 0.0
// 	for _, rc := range new_record {
// 		total_price_sum += rc.TotalPrice
// 	}

// 	if err := ctrl.db.Create(&new_record).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{Status: "failure", Message: "خطا در ثبت کارکرد"})
// 	}

// 	type ResData struct {
// 		Items    []models.TasksPerformed `json:"items"`
// 		TotalSum float64                 `json:"totol_sum"`
// 	}
// 	var records_total_price_sum float64
// 	for _, item := range new_record {
// 		records_total_price_sum += item.TotalPrice
// 	}

// 	res_data := ResData{
// 		Items:    new_record,
// 		TotalSum: records_total_price_sum,
// 	}

// 	//? 7. Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "کاربرد با موفقیت ثبت شد",
// 		Data:    res_data,
// 	})
// }

// ! @get /contractors/new-task-performed
// func (ctrl *ContractHandler) GetSttsTaskPerformed(c *fiber.Ctx) error {
// 	//? 1) Parse query parameters
// 	status_statement_id := c.Query("status_statement_id")
// 	if status_statement_id == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "صورت وضعیتی برای صدور وجود ندارد",
// 		})
// 	}
// 	// ? 2) Query status statement items
// 	var status_statement_tasks []models.TasksPerformed
// 	if err := ctrl.db.Where("status_statement_id = ?", status_statement_id).Find(&status_statement_tasks).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت کارکرد صورت وضعیت",
// 		})
// 	}
// 	type ResData struct {
// 		Items    []models.TasksPerformed `json:"items"`
// 		TotalSum float64                 `json:"totol_sum"`
// 	}
// 	var items_total_price_sum float64
// 	for _, item := range status_statement_tasks {
// 		items_total_price_sum += item.TotalPrice
// 	}

// 	res_data := ResData{
// 		Items:    status_statement_tasks,
// 		TotalSum: items_total_price_sum,
// 	}

// 	//? 6. Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "آیتم های کارکرد صورت وضعیت با موفقیت دریافت شد",
// 		Data:    res_data,
// 	})
// }

// ! @post /contractors/new-extra-work
// func (ctrl *ContractHandler) CreateNewExtraWorks(c *fiber.Ctx) error {
// 	//? 1) Get user ID from context (set by middleware)
// 	userID, ok := c.Locals("userID").(uuid.UUID)
// 	if !ok {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "error",
// 			Message: "خطای سرور",
// 		})
// 	}
// 	//? 2. Parse Body Request
// 	type TasksPerformed struct {
// 		StatusStatementID string `json:"statusStatmntId" validate:"required"`
// 		Description       string `json:"description" validate:"required"`
// 		Unit              string `json:"unit" validate:"required"`
// 		Quantity          string `json:"quantity" validate:"required"`
// 		UnitPrice         string `json:"unitPrice" validate:"required"`
// 	}
// 	var reqs []TasksPerformed
// 	if err := c.BodyParser(&reqs); err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "ورودی های نا معتبر"})
// 	}

// 	//? 3. Check if any task saved for current status statement
// 	var existing_stts_items models.AdditionalWorks
// 	err := ctrl.db.Where(`
//         status_statement_id = ? `,
// 		reqs[0].StatusStatementID).
// 		First(&existing_stts_items).Error

// 	//* ✅ Record exists → duplicate
// 	if err == nil {
// 		return c.Status(fiber.StatusConflict).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "اضافه کاری و... ثبت شده",
// 		})
// 	}

// 	//* ❌ Real DB error
// 	if !errors.Is(err, gorm.ErrRecordNotFound) {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "error",
// 			Message: "خطا در ارتباط با پایگاه داده",
// 		})
// 	}

// 	//? 4. Validate and save record to database
// 	var new_record []models.AdditionalWorks
// 	for _, req := range reqs {
// 		if req.StatusStatementID == "" {
// 			return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "شما هنوز صورت وضعیت جدیدی ایجاد نکردید"})
// 		}
// 		if req.Description == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "شرح آیتم الزامیست"})
// 		}
// 		if req.Unit == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "واحد آیتم الزامیست"})
// 		}
// 		if req.Quantity == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "مقدار آیتم الزامیست"})
// 		}
// 		if req.UnitPrice == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "قیمت واحد آیتم الزامیست"})
// 		}
// 		var existing_task models.AdditionalWorks
// 		err := ctrl.db.Where(`
//         status_statement_id = ?
//         AND description = ? `,
// 			req.StatusStatementID, req.Description).
// 			First(&existing_task).Error

// 		//* ✅ Record exists → duplicate
// 		if err == nil {
// 			return c.Status(fiber.StatusConflict).JSON(CtrlResponse{
// 				Status:  "failure",
// 				Message: "آیتم تکراری",
// 			})
// 		}

// 		//* ❌ Real DB error
// 		if !errors.Is(err, gorm.ErrRecordNotFound) {
// 			return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 				Status:  "error",
// 				Message: "خطا در ارتباط با پایگاه داده",
// 			})
// 		}

// 		quantity, err := strconv.ParseFloat(req.Quantity, 64)
// 		if err != nil {
// 			return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "مقدار نامعتبر است"})
// 		}
// 		unit_price, err := strconv.ParseFloat(req.UnitPrice, 64)
// 		if err != nil {
// 			return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "قیمت واحد نامعتبر است"})
// 		}
// 		parsedUUID, err := uuid.Parse(req.StatusStatementID)
// 		if err != nil {
// 			return err // or handle the error accordingly
// 		}

// 		var task_performed_record = models.AdditionalWorks{
// 			BaseModel: models.BaseModel{
// 				ID:        uuid.New(),
// 				CreatedBy: userID,
// 			},
// 			StatusStatementID: parsedUUID,
// 			Description:       req.Description,
// 			Unit:              req.Unit,
// 			Quantity:          quantity,
// 			UnitPrice:         unit_price,
// 			TotalPrice:        quantity * unit_price,
// 		}
// 		new_record = append(new_record, task_performed_record)
// 	}
// 	var total_price_sum float64 = 0.0
// 	for _, rc := range new_record {
// 		total_price_sum += rc.TotalPrice
// 	}

// 	if err := ctrl.db.Create(&new_record).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{Status: "failure", Message: "خطا در ثبت کارکرد"})
// 	}

// 	type ResData struct {
// 		Items    []models.AdditionalWorks `json:"items"`
// 		TotalSum float64                  `json:"totol_sum"`
// 	}
// 	var records_total_price_sum float64
// 	for _, item := range new_record {
// 		records_total_price_sum += item.TotalPrice
// 	}

// 	res_data := ResData{
// 		Items:    new_record,
// 		TotalSum: records_total_price_sum,
// 	}

// 	//? 7. Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "کاربرد با موفقیت ثبت شد",
// 		Data:    res_data,
// 	})
// }

// ! @get /contractors/new-extra-work
// func (ctrl *ContractHandler) GetSttsExtraWorks(c *fiber.Ctx) error {
// 	//? 1) Parse query parameters
// 	status_statement_id := c.Query("status_statement_id")
// 	if status_statement_id == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "صورت وضعیتی برای صدور وجود ندارد",
// 		})
// 	}
// 	// ? 2) Query status statement items
// 	var status_statement_additional []models.AdditionalWorks
// 	if err := ctrl.db.Where("status_statement_id = ?", status_statement_id).Find(&status_statement_additional).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت اضافه کاری و... صورت وضعیت",
// 		})
// 	}
// 	type ResData struct {
// 		Items    []models.AdditionalWorks `json:"items"`
// 		TotalSum float64                  `json:"totol_sum"`
// 	}
// 	var items_total_price_sum float64
// 	for _, item := range status_statement_additional {
// 		items_total_price_sum += item.TotalPrice
// 	}

// 	res_data := ResData{
// 		Items:    status_statement_additional,
// 		TotalSum: items_total_price_sum,
// 	}

// 	//? 6. Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "آیتم های کارکرد صورت وضعیت با موفقیت دریافت شد",
// 		Data:    res_data,
// 	})
// }

// ! @post /contractors/new-deduction
// func (ctrl *ContractHandler) CreateNewDeductions(c *fiber.Ctx) error {
// 	//? 1) Get user ID from context (set by middleware)
// 	userID, ok := c.Locals("userID").(uuid.UUID)
// 	if !ok {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "error",
// 			Message: "خطای سرور",
// 		})
// 	}
// 	//? 2. Parse Body Request
// 	type TasksPerformed struct {
// 		StatusStatementID string `json:"statusStatmntId" validate:"required"`
// 		Description       string `json:"description" validate:"required"`
// 		Unit              string `json:"unit" validate:"required"`
// 		Quantity          string `json:"quantity" validate:"required"`
// 		UnitPrice         string `json:"unitPrice" validate:"required"`
// 	}
// 	var reqs []TasksPerformed
// 	if err := c.BodyParser(&reqs); err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "ورودی های نا معتبر"})
// 	}

// 	//? 3. Check if any task saved for current status statement
// 	var existing_stts_items models.Deductions
// 	err := ctrl.db.Where(`
//         status_statement_id = ? `,
// 		reqs[0].StatusStatementID).
// 		First(&existing_stts_items).Error

// 	//* ✅ Record exists → duplicate
// 	if err == nil {
// 		return c.Status(fiber.StatusConflict).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "کسورات و... ثبت شده",
// 		})
// 	}

// 	//* ❌ Real DB error
// 	if !errors.Is(err, gorm.ErrRecordNotFound) {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "error",
// 			Message: "خطا در ارتباط با پایگاه داده",
// 		})
// 	}

// 	//? 4. Validate and save record to database
// 	var new_record []models.Deductions
// 	for _, req := range reqs {
// 		if req.StatusStatementID == "" {
// 			return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "شما هنوز صورت وضعیت جدیدی ایجاد نکردید"})
// 		}
// 		if req.Description == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "شرح آیتم الزامیست"})
// 		}
// 		if req.Unit == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "واحد آیتم الزامیست"})
// 		}
// 		if req.Quantity == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "مقدار آیتم الزامیست"})
// 		}
// 		if req.UnitPrice == "" {
// 			c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "قیمت واحد آیتم الزامیست"})
// 		}
// 		var existing_task models.Deductions
// 		err := ctrl.db.Where(`
//         status_statement_id = ?
//         AND description = ? `,
// 			req.StatusStatementID, req.Description).
// 			First(&existing_task).Error

// 		//* ✅ Record exists → duplicate
// 		if err == nil {
// 			return c.Status(fiber.StatusConflict).JSON(CtrlResponse{
// 				Status:  "failure",
// 				Message: "آیتم تکراری",
// 			})
// 		}

// 		//* ❌ Real DB error
// 		if !errors.Is(err, gorm.ErrRecordNotFound) {
// 			return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 				Status:  "error",
// 				Message: "خطا در ارتباط با پایگاه داده",
// 			})
// 		}

// 		quantity, err := strconv.ParseFloat(req.Quantity, 64)
// 		if err != nil {
// 			return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "مقدار نامعتبر است"})
// 		}
// 		unit_price, err := strconv.ParseFloat(req.UnitPrice, 64)
// 		if err != nil {
// 			return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{Status: "failure", Message: "قیمت واحد نامعتبر است"})
// 		}
// 		parsedUUID, err := uuid.Parse(req.StatusStatementID)
// 		if err != nil {
// 			return err // or handle the error accordingly
// 		}

// 		var task_performed_record = models.Deductions{
// 			BaseModel: models.BaseModel{
// 				ID:        uuid.New(),
// 				CreatedBy: userID,
// 			},
// 			StatusStatementID: parsedUUID,
// 			Description:       req.Description,
// 			Unit:              req.Unit,
// 			Quantity:          quantity,
// 			UnitPrice:         unit_price,
// 			TotalPrice:        quantity * unit_price,
// 		}
// 		new_record = append(new_record, task_performed_record)
// 	}
// 	var total_price_sum float64 = 0.0
// 	for _, rc := range new_record {
// 		total_price_sum += rc.TotalPrice
// 	}

// 	if err := ctrl.db.Create(&new_record).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{Status: "failure", Message: "خطا در ثبت کارکرد"})
// 	}

// 	type ResData struct {
// 		Items    []models.Deductions `json:"items"`
// 		TotalSum float64             `json:"totol_sum"`
// 	}
// 	var records_total_price_sum float64
// 	for _, item := range new_record {
// 		records_total_price_sum += item.TotalPrice
// 	}

// 	res_data := ResData{
// 		Items:    new_record,
// 		TotalSum: records_total_price_sum,
// 	}

// 	//? 7. Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "کسورات با موفقیت ثبت شد",
// 		Data:    res_data,
// 	})
// }

// ! @get /contractors/new-deduction
// func (ctrl *ContractHandler) GetSttsDeductions(c *fiber.Ctx) error {
// 	//? 1) Parse query parameters
// 	status_statement_id := c.Query("status_statement_id")
// 	if status_statement_id == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "صورت وضعیتی برای صدور وجود ندارد",
// 		})
// 	}
// 	// ? 2) Query status statement items
// 	var status_statement_additional []models.Deductions
// 	if err := ctrl.db.Where("status_statement_id = ?", status_statement_id).Find(&status_statement_additional).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت اضافه کاری و... صورت وضعیت",
// 		})
// 	}
// 	type ResData struct {
// 		Items    []models.Deductions `json:"items"`
// 		TotalSum float64             `json:"totol_sum"`
// 	}
// 	var items_total_price_sum float64
// 	for _, item := range status_statement_additional {
// 		items_total_price_sum += item.TotalPrice
// 	}

// 	res_data := ResData{
// 		Items:    status_statement_additional,
// 		TotalSum: items_total_price_sum,
// 	}

// 	//? 6. Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "آیتم های کارکرد صورت وضعیت با موفقیت دریافت شد",
// 		Data:    res_data,
// 	})
// }

// ! @get /contractors/finance-summary
// func (ctrl *ContractHandler) GetSttsFinanceSummary(c *fiber.Ctx) error {
// 	//? 1) Parse query parameters
// 	status_statement_id := c.Query("status_statement_id")
// 	if status_statement_id == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "صورت وضعیتی برای صدور وجود ندارد",
// 		})
// 	}

// 	//? 2) Get onGoing Status Statement
// 	var status_statement models.StatusStatement
// 	if err := ctrl.db.Where("id = ?", status_statement_id).First(&status_statement).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"status":  "faluire",
// 			"message": "خطا در دریافت آخرین صورت وضعیت",
// 		})
// 	}

// 	var last_status_statement models.StatusStatement
// 	if err := ctrl.db.Where("contractor_id = ? AND project_id = ? AND id <> ?", status_statement.ContractorID, status_statement.ProjectID, status_statement.ID).Order("created_at DESC").First(&last_status_statement).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"status":  "faluire",
// 			"message": "خطا در دریافت آخرین صورت وضعیت",
// 		})
// 	}
// 	// ? 3) Query status statement items
// 	//* tasks performed
// 	var status_statement_tasks []models.TasksPerformed
// 	if err := ctrl.db.Where("status_statement_id = ?", status_statement_id).Find(&status_statement_tasks).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت کارکرد صورت وضعیت",
// 		})
// 	}
// 	var last_status_statement_tasks []models.TasksPerformed
// 	if err := ctrl.db.Where("status_statement_id = ?", last_status_statement.ID).Find(&last_status_statement_tasks).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت آخرین کارکرد صورت وضعیت",
// 		})
// 	}

// 	//* Additional Works
// 	var status_statement_additional_works []models.TasksPerformed
// 	if err := ctrl.db.Where("status_statement_id = ?", status_statement_id).Find(&status_statement_additional_works).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت اضافه کاری صورت وضعیت",
// 		})
// 	}
// 	var last_status_statement_additional_works []models.TasksPerformed
// 	if err := ctrl.db.Where("status_statement_id = ?", last_status_statement.ID).Find(&last_status_statement_additional_works).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت آخرین اضافه کاری صورت وضعیت",
// 		})
// 	}

// 	//* Deductions
// 	var status_statement_deductions []models.TasksPerformed
// 	if err := ctrl.db.Where("status_statement_id = ?", status_statement_id).Find(&status_statement_deductions).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت کسور صورت وضعیت",
// 		})
// 	}
// 	var last_status_statement_deductions []models.TasksPerformed
// 	if err := ctrl.db.Where("status_statement_id = ?", last_status_statement.ID).Find(&last_status_statement_deductions).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت آخرین کسور صورت وضعیت",
// 		})
// 	}

// 	//? 4) Calc Summations of each
// 	//* current
// 	var current_sum float64
// 	for _, item := range status_statement_tasks {
// 		current_sum += item.TotalPrice
// 	}
// 	for _, item := range status_statement_additional_works {
// 		current_sum += item.TotalPrice
// 	}
// 	for _, item := range status_statement_deductions {
// 		current_sum += item.TotalPrice
// 	}

// 	//* last
// 	var last_sum float64
// 	for _, item := range last_status_statement_tasks {
// 		last_sum += item.TotalPrice
// 	}
// 	for _, item := range last_status_statement_additional_works {
// 		last_sum += item.TotalPrice
// 	}
// 	for _, item := range last_status_statement_deductions {
// 		last_sum += item.TotalPrice
// 	}

// 	//* current net
// 	current_net := current_sum - last_sum

// 	//? 5) Send Response
// 	type ResData struct {
// 		CurrentAcc float64 `json:"current_acc"`
// 		LastAcc    float64 `json:"last_acc"`
// 		CurrentNet float64 `json:"current_net"`
// 	}

// 	res_data := ResData{
// 		CurrentAcc: current_sum,
// 		LastAcc:    last_sum,
// 		CurrentNet: current_net,
// 	}

// 	//? 6. Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "خلاصه مالی با موفقیت دریافت شد",
// 		Data:    res_data,
// 	})
// }

// ! @get /contractors/legal-reductions
// func (ctrl *ContractHandler) GetSttsLegalReductions(c *fiber.Ctx) error {
// 	//? 1) Parse query parameters
// 	status_statement_id := c.Query("status_statement_id")
// 	if status_statement_id == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "صورت وضعیتی برای صدور وجود ندارد",
// 		})
// 	}

// 	//? 2) Get onGoing Status Statement
// 	var status_statement models.StatusStatement
// 	if err := ctrl.db.Where("id = ?", status_statement_id).First(&status_statement).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"status":  "faluire",
// 			"message": "خطا در دریافت صورت وضعیت",
// 		})
// 	}

// 	//? 3) Get Contract
// 	var contract models.Contractor
// 	if err := ctrl.db.Where("id = ?", status_statement.ContractorID).First(&contract).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"status":  "faluire",
// 			"message": "خطا در دریافت قرارداد",
// 		})
// 	}

// 	contract_duration_month := float32(contract.Duration) / 30.0
// 	performance_bond_rate := contract.PerformanceBond / 100.0
// 	insurance_rate := contract.InsuranceRate / 100.0

// 	performance_bond := contract.GrossBudget * performance_bond_rate / contract_duration_month
// 	insurance := contract.GrossBudget * insurance_rate / contract_duration_month

// 	legal_deduction_sum := performance_bond + insurance

// 	//? 4) Calc Response
// 	type ResData struct {
// 		PerformanceBondRate float64 `json:"performance_bond_rate"`
// 		PerformanceBond     float64 `json:"performance_bond"`
// 		InsuranceRate       float64 `json:"insurance_rate"`
// 		Insurance           float64 `json:"insurance"`
// 		TotolSum            float64 `json:"total_sum"`
// 	}

// 	res_data := ResData{
// 		PerformanceBondRate: float64(performance_bond_rate * 100),
// 		PerformanceBond:     float64(performance_bond),
// 		InsuranceRate:       float64(insurance_rate * 100),
// 		Insurance:           float64(insurance),
// 		TotolSum:            float64(legal_deduction_sum),
// 	}

// 	//? 5) Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "کسورات قانونی با موفقیت دریافت شد",
// 		Data:    res_data,
// 	})
// }

// ! @get /contractors/other-reductions
// func (ctrl *ContractHandler) GetSttsOtherReductions(c *fiber.Ctx) error {
// 	//? 1) Parse query parameters
// 	status_statement_id := c.Query("status_statement_id")
// 	if status_statement_id == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(CtrlResponse{
// 			Status:  "failure",
// 			Message: "صورت وضعیتی برای صدور وجود ندارد",
// 		})
// 	}

// 	//? 2) Get onGoing Status Statement
// 	var status_statement models.StatusStatement
// 	if err := ctrl.db.Where("id = ?", status_statement_id).First(&status_statement).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت صورت وضعیت",
// 		})
// 	}

// 	//? 3) Get Contract
// 	var contract models.Contractor
// 	if err := ctrl.db.Where("id = ?", status_statement.ContractorID).First(&contract).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت قرارداد",
// 		})
// 	}

// 	contract_duration_month := float32(contract.Duration) / 30.0
// 	added_value_tax_rate := contract.AddedValueTax / 100.0
// 	added_value_tax := contract.GrossBudget * added_value_tax_rate / contract_duration_month

// 	// ? Get last Deductions
// 	var status_statement_deductions []models.Deductions
// 	if err := ctrl.db.Where("status_statement_id = ?", status_statement_id).Find(&status_statement_deductions).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(CtrlResponse{
// 			Status:  "faluire",
// 			Message: "خطا در دریافت اضافه کاری و... صورت وضعیت",
// 		})
// 	}

// 	var status_statement_deduction_sum float64
// 	for _, item := range status_statement_deductions {
// 		status_statement_deduction_sum += item.TotalPrice
// 	}

// 	//? 4) Calc Response
// 	type ResData struct {
// 		Deductions        float64 `json:"deductions"`
// 		AddedValueTax     float64 `json:"added_value_tax"`
// 		AddedValueTaxRate float64 `json:"added_value_tax_rate"`
// 	}

// 	res_data := ResData{
// 		Deductions:        float64(status_statement_deduction_sum),
// 		AddedValueTax:     float64(added_value_tax),
// 		AddedValueTaxRate: float64(added_value_tax_rate * 100),
// 	}

// 	//? 5) Send response
// 	return c.Status(fiber.StatusOK).JSON(CtrlResponse{
// 		Status:  "success",
// 		Message: "سایر کسورات با موفقیت دریافت شد",
// 		Data:    res_data,
// 	})
// }

// Todo:
// ! @post /contractors/tasks-final-subs
// func (ctrl *ContractHandler) TasksFinalSubmition(c *fiber.Ctx) error {
// 	//? 1. Get authenticated user ID from token
// 	userID, err := utils.ParseToken(c)
// 	if userID == uuid.Nil || err != nil {
// 		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
// 			"status":  "failure",
// 			"message": "شما هنوز وارد حساب کاربری خود نشدید",
// 		})
// 	}
// 	//? 2. Parse Body Request
// 	type FinalSubsReq struct {
// 		StatusStatementID string `json:"statusStatmntId" validate:"required"`
// 		CumulativePrice   string `json:"cumulative_price" validate:"required"`
// 	}
// 	var req FinalSubsReq
// 	if err := c.BodyParser(&req); err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ورودی های نا معتبر"})
// 	}
// 	//? 3. Validating inputs
// 	if req.StatusStatementID == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "شما هنوز صورت وضعیت جدیدی ایجاد نکردید"})
// 	}
// 	if req.CumulativePrice == "" {
// 		c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "شرح آیتم الزامیست"})
// 	}

// 	//? 4. Check for existing record
// 	var existing_record models.CumulativeTasksPerformed
// 	err = ctrl.db.Where(`
//         status_statement_id = ?
//         AND cumulative_price = ? `,
// 		req.StatusStatementID, req.CumulativePrice).
// 		First(&existing_record).Error

// 	//* ✅ Record exists → duplicate
// 	if err == nil {
// 		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
// 			"status":  "failure",
// 			"message": "آیتم تکراری",
// 		})
// 	}

// 	//* ❌ Real DB error
// 	if !errors.Is(err, gorm.ErrRecordNotFound) {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"status":  "error",
// 			"message": "خطا در ارتباط با پایگاه داده",
// 		})
// 	}

// 	//? 5. sanitize inputs
// 	cumulative_price, err := strconv.ParseFloat(req.CumulativePrice, 64)
// 	if err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "مقدار نامعتبر است"})
// 	}
// 	parsedUUID, err := uuid.Parse(req.StatusStatementID)
// 	if err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "خطا در پردازش آیدی کاربر"})
// 	}

// 	//? 6. Save new record to database
// 	var cumulative_price_record = models.CumulativeTasksPerformed{
// 		BaseModel: models.BaseModel{
// 			ID:        uuid.New(),
// 			CreatedBy: userID,
// 		},
// 		StatusStatementID: parsedUUID,
// 		CumulativePrice:   cumulative_price,
// 	}

// 	if err := ctrl.db.Create(&cumulative_price_record).Error; err != nil {
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "خطا در ثبت نهایی"})
// 	}

// 	//? 7. Send response
// 	return c.Status(fiber.StatusOK).JSON(fiber.Map{
// 		"status":  "success",
// 		"message": "ثبت نهایی با موفقیت انجام شد",
// 		"data":    cumulative_price_record,
// 	})
// }

// ! @post /contractors/other-reductions
// func (ctrl *ContractHandler) GetOtherDeductions(c *fiber.Ctx) error {
// 	//? 1. Get authenticated user ID from token
// 	userID, err := utils.ParseToken(c)
// 	if userID == uuid.Nil || err != nil {
// 		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
// 			"status":  "failure",
// 			"message": "شما هنوز وارد حساب کاربری خود نشدید",
// 		})
// 	}

// 	//? 2. Parse Body Request
// 	type FinanceSummaryReq struct {
// 		StatusStatementID string `json:"statusStatmntId" validate:"required"`
// 	}
// 	var req FinanceSummaryReq
// 	if err := c.BodyParser(&req); err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
// 			"error": "ورودی‌های نامعتبر",
// 		})
// 	}

// 	//? 3. Validate and parse UUID
// 	if req.StatusStatementID == "" {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
// 			"error": "شما هنوز صورت وضعیت جدیدی ایجاد نکردید",
// 		})
// 	}
// 	parsedUUID, err := uuid.Parse(req.StatusStatementID)
// 	if err != nil {
// 		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
// 			"error": "خطا در پردازش آیدی صورت‌وضعیت",
// 		})
// 	}

// 	//? 4. Get last existing record (before current one)
// 	var lastRecord models.CumulativeTasksPerformed
// 	err = ctrl.db.
// 		Where("status_statement_id <> ?", parsedUUID).
// 		Order("updated_at DESC").
// 		Limit(1).
// 		First(&lastRecord).Error

// 	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
// 		// Real DB error
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"status":  "error",
// 			"message": "خطا در ارتباط با پایگاه داده",
// 		})
// 	}

// 	//? 5. Get current record
// 	var currentRecord models.CumulativeTasksPerformed
// 	err = ctrl.db.
// 		Where("status_statement_id = ?", parsedUUID).
// 		First(&currentRecord).Error

// 	if err != nil {
// 		if errors.Is(err, gorm.ErrRecordNotFound) {
// 			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
// 				"status":  "failure",
// 				"message": "رکوردی برای این صورت وضعیت پیدا نشد",
// 			})
// 		}
// 		// Real DB error
// 		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
// 			"status":  "error",
// 			"message": "خطا در ارتباط با پایگاه داده",
// 		})
// 	}

// 	//? 6. Calculate results
// 	current := currentRecord.CumulativePrice
// 	last := lastRecord.CumulativePrice // will be 0 if not found

// 	res := fiber.Map{
// 		"last_cumulative":      last,
// 		"current_cumulative":   current,
// 		"current_period_price": current - last,
// 	}

// 	//? 7. Send response
// 	return c.Status(fiber.StatusOK).JSON(fiber.Map{
// 		"status":  "success",
// 		"message": "خلاصه مالی با موفقیت بازیابی شد",
// 		"data":    res,
// 	})
// }

// ! @post /contractors/print-status
