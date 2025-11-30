package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

func SetupContractsRoutes(router fiber.Router, contractHandler *handlers.ContractHandler) {
	//! Contract and Project Registration Routes
	router.Post("/contractors/new-project", middlewares.AuthMiddleware(), contractHandler.CreateProject)
	// router.Get("/contractors/projects", middlewares.AuthMiddleware(), contractorHandler.GetAllProject)

	// router.Post("/contractors/new-contract", middlewares.AuthMiddleware(), contractorHandler.CreateContractor)

	// router.Get("/contractors/search-by-id", middlewares.AuthMiddleware(), contractorHandler.GetContractorByID)
	//! Trading System Routes
	// router.Get("/contractors/contractor-projects", middlewares.AuthMiddleware(), contractorHandler.GetContractorProjects)
	// router.Get("/contractors/get-last-status-statement", middlewares.AuthMiddleware(), contractorHandler.GetLastStatusStatement)
	// router.Post("/contractors/new-status-statement", middlewares.AuthMiddleware(), contractorHandler.CreateNewStatusStatement)
	// router.Get("/contractors/get-status-statement", middlewares.AuthMiddleware(), contractorHandler.GetStatusStatement)

	//! Tax System Routes
	// router.Post("/contractors/new-task-performed", middlewares.AuthMiddleware(), contractorHandler.CreateNewTaskPerformed)
	// router.Get("/contractors/new-task-performed", middlewares.AuthMiddleware(), contractorHandler.GetSttsTaskPerformed)

	// router.Post("/contractors/new-extra-works", middlewares.AuthMiddleware(), contractorHandler.CreateNewExtraWorks)
	// router.Get("/contractors/new-extra-works", middlewares.AuthMiddleware(), contractorHandler.GetSttsExtraWorks)

	// router.Post("/contractors/new-deductions", middlewares.AuthMiddleware(), contractorHandler.CreateNewDeductions)
	// router.Get("/contractors/new-deductions", middlewares.AuthMiddleware(), contractorHandler.GetSttsDeductions)

	// router.Get("/contractors/finance-summary", middlewares.AuthMiddleware(), contractorHandler.GetSttsFinanceSummary)
	// router.Get("/contractors/legal-reductions", middlewares.AuthMiddleware(), contractorHandler.GetSttsLegalReductions)
	// router.Get("/contractors/other-reductions", middlewares.AuthMiddleware(), contractorHandler.GetSttsOtherReductions)

	//! Internal Routes
	// Todo: Remaining files
	// router.Post("/contractors/tasks-final-subs", middlewares.AuthMiddleware(), contractorHandler.TasksFinalSubmition)
	// router.Post("/contractors/print-status", middlewares.AuthMiddleware(), contractorController.PrintStatusSttmnt)

}
