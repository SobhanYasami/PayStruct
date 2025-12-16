package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

func SetupContractsRoutes(router fiber.Router, contractHandler *handlers.ContractHandler) {
	//! Project Management Routes
	router.Post("/management/new-project", middlewares.Authenticate(), contractHandler.CreateProject)
	router.Get("/management/projects", middlewares.Authenticate(), contractHandler.GetAllProject)
	router.Get("/management/projects/:id", middlewares.Authenticate(), contractHandler.GetProjectByID)
	router.Put("/management/projects/:id", middlewares.Authenticate(), contractHandler.UpdateProject)
	router.Delete("/management/projects/:id", middlewares.Authenticate(), contractHandler.DeleteProject)

	//! Contractor Management Routes
	router.Post("/management/new-contractor", middlewares.Authenticate(), contractHandler.CreateContractor)
	router.Get("/management/contractors", middlewares.Authenticate(), contractHandler.GetAllContractor)
	router.Get("/management/contractors/:id", middlewares.Authenticate(), contractHandler.GetContractorByID)
	router.Put("/management/contractors/:id", middlewares.Authenticate(), contractHandler.UpdateContractor)
	router.Delete("/management/contractors/:id", middlewares.Authenticate(), contractHandler.DeleteContractor)

	//! Contract Management Routes
	router.Post("/management/new-contract", middlewares.Authenticate(), contractHandler.CreateContract)
	router.Get("/management/contracts", middlewares.Authenticate(), contractHandler.GetAllContracts)
	router.Get("/management/contracts/:id", middlewares.Authenticate(), contractHandler.GetContractByID)
	router.Put("/management/contracts/:id", middlewares.Authenticate(), contractHandler.UpdateContract)
	router.Delete("/management/contracts/:id", middlewares.Authenticate(), contractHandler.DeleteContract)

	// router.Post("/contractors/new-contract", middlewares.Authenticate(), contractHandler.CreateContractor)

	// router.Get("/contractors/search-by-id", middlewares.Authenticate(), contractHandler.GetContractorByID)
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
