package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

func SetupContractsRoutes(router fiber.Router, contractHandler *handlers.ContractHandler) {
	//! Contract and Project Registration Routes
	router.Post("/contractors/new-project", middlewares.Authenticate(), contractHandler.CreateProject)
	router.Get("/contractors/projects", middlewares.Authenticate(), contractHandler.GetAllProject)
	router.Get("/contractors/projects/:id", middlewares.Authenticate(), contractHandler.GetProjectByID)
	router.Put("/contractors/projects/:id", middlewares.Authenticate(), contractHandler.UpdateProject)
	router.Delete("/contractors/projects/:id", middlewares.Authenticate(), contractHandler.DeleteProject)

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
