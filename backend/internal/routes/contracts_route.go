package routes

// import (
// 	"github.com/gofiber/fiber/v2"
// 	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
// 	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
// )

// func SetupContractsRoutes(router fiber.Router, h *handlers.ContractHandler, authz *middlewares.Authorizer, jwtSecret string) {
// 	//! ===============================
// 	//! Base Management Group
// 	//! ===============================
// 	management := router.Group(
// 		"/management",
// 		middlewares.Authenticate(jwtSecret),
// 	)

// 	//! ==========================================================
// 	//! PROJECTS
// 	//! ==========================================================
// 	projects := management.Group(
// 		"/projects",
// 		middlewares.RequirePermission("project", "read"),
// 	)

// 	projects.Get("/", h.GetAllProject)
// 	projects.Get("/:id", h.GetProjectByID)

// 	projects.Post("/",
// 		middlewares.RequirePermission("project", "create"),
// 		h.CreateProject,
// 	)

// 	projects.Put("/:id",
// 		middlewares.RequirePermission("project", "update"),
// 		h.UpdateProject,
// 	)

// 	projects.Delete("/:id",
// 		middlewares.RequirePermission("project", "delete"),
// 		h.DeleteProject,
// 	)

// 	//! ==========================================================
// 	//! CONTRACTORS
// 	//! ==========================================================
// 	contractors := management.Group("/contractors")

// 	contractors.Get("/",
// 		middlewares.RequirePermission("contractor", "read"),
// 		h.GetAllContractor,
// 	)

// 	contractors.Get("/:id",
// 		middlewares.RequirePermission("contractor", "read"),
// 		h.GetContractorByID,
// 	)

// 	contractors.Post("/",
// 		middlewares.RequirePermission("contractor", "create"),
// 		h.CreateContractor,
// 	)

// 	contractors.Put("/:id",
// 		middlewares.RequirePermission("contractor", "update"),
// 		h.UpdateContractor,
// 	)

// 	contractors.Delete("/:id",
// 		middlewares.RequirePermission("contractor", "delete"),
// 		h.DeleteContractor,
// 	)

// 	//! ==========================================================
// 	//! CONTRACTS
// 	//! ==========================================================
// 	contracts := management.Group("/contracts")

// 	contracts.Get("/",
// 		middlewares.RequirePermission("contract", "read"),
// 		h.GetAllContracts,
// 	)

// 	contracts.Get("/:id",
// 		middlewares.RequirePermission("contract", "read"),
// 		h.GetContractByID,
// 	)

// 	contracts.Post("/",
// 		middlewares.RequirePermission("contract", "create"),
// 		h.CreateContract,
// 	)

// 	contracts.Put("/:id",
// 		middlewares.RequirePermission("contract", "update"),
// 		h.UpdateContract,
// 	)

// 	contracts.Delete("/:id",
// 		middlewares.RequirePermission("contract", "delete"),
// 		h.DeleteContract,
// 	)

// 	//! ==========================================================
// 	//! WBS (Nested under contract)
// 	//! ==========================================================
// 	wbs := contracts.Group("/:contractID/wbs")

// 	wbs.Post("/",
// 		middlewares.RequirePermission("wbs", "create"),
// 		h.CreateWBS,
// 	)

// 	wbs.Get("/",
// 		middlewares.RequirePermission("wbs", "read"),
// 		h.GetContractWBS,
// 	)

// 	//! ==========================================================
// 	//! STATUS STATEMENTS (Nested under contract)
// 	//! ==========================================================
// 	status := contracts.Group("/:contractID/status-statements")

// 	status.Post("/",
// 		middlewares.RequirePermission("status_statement", "create"),
// 		h.CreateStatusStatement,
// 	)

// 	status.Get("/latest",
// 		middlewares.RequirePermission("status_statement", "read"),
// 		h.GetLast2StatusStatements,
// 	)

// 	status.Post("/:statusID/submit",
// 		middlewares.RequirePermission("status_statement", "submit"),
// 		h.SubmitStatusStatement,
// 	)

// 	//! ==========================================================
// 	//! TASKS PERFORMED (Nested under status)
// 	//! ==========================================================
// 	tasks := status.Group("/:statusID/tasks")

// 	tasks.Post("/",
// 		middlewares.RequirePermission("task", "create"),
// 		h.CreateTasksPerformed,
// 	)

// 	tasks.Get("/",
// 		middlewares.RequirePermission("task", "read"),
// 		h.GetLastTasksPerformed,
// 	)

// 	//! ==========================================================
// 	//! EXTRA WORKS
// 	//! ==========================================================
// 	extraWorks := status.Group("/:statusID/extra-works")

// 	extraWorks.Post("/",
// 		middlewares.RequirePermission("extra_work", "create"),
// 		h.CreateExtraWorks,
// 	)

// 	// todo: deductions
// 	// deductions := statusStatement.Group("/deductions")
// 	// deductions.Post("/new-deduction", h.CreateDeductions)
// 	// deductions.Get("/get-by-contract/:cid", h.GetLastDeductions)

// }
