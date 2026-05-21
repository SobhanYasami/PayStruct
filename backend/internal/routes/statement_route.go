package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

// SetupStatementRoutes mounts status-statement endpoints.
// Routes under /contracts/:contractId/... are scoped to a contract.
// Routes under /statements/:id are flat operations on a single statement.
func SetupStatementRoutes(router fiber.Router, h *handlers.StatementHandler, jwtSecret string) {
	auth := middlewares.Authenticate(jwtSecret)

	// Nested under contract
	contracts := router.Group("/contracts", auth)
	contracts.Post("/:contractId/statements", h.CreateStatement)
	contracts.Get("/:contractId/statements", h.ListStatements)
	// Flat statement operations
	stmts := router.Group("/statements", auth)
	stmts.Get("/:id", h.GetStatement)
	stmts.Put("/:id/works-done", h.SetWorksDone)
	stmts.Post("/:id/extra-works", h.AddExtraWork)
	stmts.Delete("/:id/extra-works/:ewId", h.DeleteExtraWork)
	stmts.Get("/:id/deductions", h.ListDeductions)
	stmts.Post("/:id/deductions", h.AddDeduction)
	stmts.Put("/:id/deductions/:did", h.UpdateDeduction)
	stmts.Delete("/:id/deductions/:did", h.DeleteDeduction)
	stmts.Patch("/:id/transition", h.Transition)
	stmts.Delete("/:id", h.DeleteStatement)
}
