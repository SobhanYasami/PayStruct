package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/controllers"
	"github.com/sobhan-yasami/docs-db-panel/middlewares"
)

func SetupContractorRoutes(router fiber.Router, contractorController *controllers.ContractorController) {
	//! Contract and Project Registration Routes
	router.Post("/contractors/new-project", middlewares.AuthMiddleware(), contractorController.CreateProject)
	router.Get("/contractors/projects", middlewares.AuthMiddleware(), contractorController.GetAllProject)

	router.Post("/contractors/new-contract", middlewares.AuthMiddleware(), contractorController.CreateContractor)

	router.Get("/contractors/search-by-id", middlewares.AuthMiddleware(), contractorController.GetContractorByID)
	//! Trading System Routes
	router.Get("/contractors/contractor-projects", middlewares.AuthMiddleware(), contractorController.GetContractorProjects)
	router.Get("/contractors/get-last-status-statement", middlewares.AuthMiddleware(), contractorController.GetLastStatusStatement)
	router.Post("/contractors/new-status-statement", middlewares.AuthMiddleware(), contractorController.CreateNewStatusStatement)
	router.Get("/contractors/get-status-statement", middlewares.AuthMiddleware(), contractorController.GetStatusStatement)

	//! Tax System Routes
	router.Post("/contractors/new-task-performed", middlewares.AuthMiddleware(), contractorController.CreateNewTaskPerformed)
	router.Get("/contractors/new-task-performed", middlewares.AuthMiddleware(), contractorController.GetSttsTaskPerformed)

	router.Post("/contractors/new-extra-works", middlewares.AuthMiddleware(), contractorController.CreateNewExtraWorks)
	router.Get("/contractors/new-extra-works", middlewares.AuthMiddleware(), contractorController.GetSttsExtraWorks)

	router.Post("/contractors/new-deductions", middlewares.AuthMiddleware(), contractorController.CreateNewDeductions)
	router.Get("/contractors/new-deductions", middlewares.AuthMiddleware(), contractorController.GetSttsDeductions)

	router.Get("/contractors/finance-summary", middlewares.AuthMiddleware(), contractorController.GetSttsFinanceSummary)
	router.Get("/contractors/legal-reductions", middlewares.AuthMiddleware(), contractorController.GetSttsLegalReductions)
	router.Get("/contractors/other-reductions", middlewares.AuthMiddleware(), contractorController.GetSttsOtherReductions)

	//! Internal Routes
	// Todo: Remaining files
	router.Post("/contractors/tasks-final-subs", middlewares.AuthMiddleware(), contractorController.TasksFinalSubmition)
	// router.Post("/contractors/print-status", middlewares.AuthMiddleware(), contractorController.PrintStatusSttmnt)

}
