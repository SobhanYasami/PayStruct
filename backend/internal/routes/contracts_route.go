package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

func SetupContractsRoutes(router fiber.Router, h *handlers.ContractHandler) {
	//! Base management group with authentication
	management := router.Group(
		"/management",
		middlewares.Authenticate(),
	)

	//! ---- Project Routes ----
	projects := management.Group("/projects")
	projects.Post("/", h.CreateProject)
	projects.Get("/", h.GetAllProject)
	projects.Get("/:id", h.GetProjectByID)
	projects.Put("/:id", h.UpdateProject)
	projects.Delete("/:id", h.DeleteProject)

	//! Contractor Management Routes
	contractors := management.Group("/contractors")
	contractors.Post("/", h.CreateContractor)
	contractors.Get("/", h.GetAllContractor)
	contractors.Get("/:id", h.GetContractorByID)
	contractors.Put("/:id", h.UpdateContractor)
	contractors.Delete("/:id", h.DeleteContractor)

	//! Contract Management Routes
	contracts := management.Group("/contracts")
	contracts.Post("/", h.CreateContract)
	contracts.Get("/", h.GetAllContracts)
	contracts.Get("/:id", h.GetContractByID)
	contracts.Put("/:id", h.UpdateContract)
	contracts.Delete("/:id", h.DeleteContract)

	// WBS
	wbs := contracts.Group("wbs")
	wbs.Post("/", h.CreateContract)

	//! Trading System Routes
	// router.Get("/contractors/contractor-projects", middlewares.Authenticate(), contractHandler.GetContractorProjects)
	// router.Get("/contractors/get-last-status-statement", middlewares.Authenticate(), contractHandler.GetLastStatusStatement)
	// router.Post("/contractors/new-status-statement", middlewares.Authenticate(), contractHandler.CreateNewStatusStatement)
	// router.Get("/contractors/get-status-statement", middlewares.Authenticate(), contractHandler.Get

	//! Tax System Routes
	// router.Post("/contractors/new-task-performed", middlewares.Authenticate(), contractorHandler.CreateNewTaskPerformed)
	// router.Get("/contractors/new-task-performed", middlewares.Authenticate(), contractorHandler.GetSttsTaskPerformed)
	// router.Post("/contractors/new-extra-works", middlewares.Authenticate(), contractorHandler.CreateNewExtraWorks)
	// router.Get("/contractors/new-extra-works", middlewares.Authenticate(), contractorHandler.GetSttsExtraWorks)

	// router.Post("/contractors/new-deductions", middlewares.Authenticate(), contractorHandler.CreateNewDeductions)
	// router.Get("/contractors/new-deductions", middlewares.Authenticate(), contractorHandler.GetSttsDeductions)

	// router.Get("/contractors/finance-summary", middlewares.Authenticate(), contractorHandler.GetSttsFinanceSummary)
	// router.Get("/contractors/legal-reductions", middlewares.Authenticate(), contractorHandler.GetSttsLegalReductions)
	// router.Get("/contractors/other-reductions", middlewares.Authenticate(), contractorHandler.GetSttsOtherReductions)
	//! Internal Routes
	// Todo: Remaining files
	// router.Post("/contractors/tasks-final-subs", middlewares.Authenticate(), contractorHandler.TasksFinalSubmition)
	// router.Post("/contractors/print-status", middlewares.Authenticate(), contractorController.PrintStatusSttmnt)

}
