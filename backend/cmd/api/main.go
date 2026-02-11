package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
	"github.com/sobhan-yasami/docs-db-panel/internal/database"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/routes"
)

// --------------------
// Color helpers
// --------------------
var (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorCyan   = "\033[36m"
	colorWhite  = "\033[97m"
	bold        = "\033[1m"
)

// --------------------
// Constants
// --------------------
const (
	defaultPort        = "5000"
	defaultBodyLimitMB = 50
	shutdownTimeout    = 10 * time.Second
)

// --------------------
// Initialization
// --------------------
func init() {
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: Could not load .env file: %v", err)
	}
}

// --------------------
// Main
// --------------------
func main() {
	//! 0. Declare mode
	debugMode := os.Getenv("DEBUG") == "true"

	//! 1. Initialize database
	db, err := database.Connect()
	if err != nil {
		log.Fatalf("%s❌ Database connection failed:%s %v", colorRed, colorReset, err)
	}

	//! 2. Create Fiber app
	app := fiber.New(fiber.Config{
		Prefork:       false, // Set to true in production if needed
		CaseSensitive: true,
		StrictRouting: true,
		ServerHeader:  "Fiber",
		AppName:       "Contractor Management Panel",
		BodyLimit:     defaultBodyLimitMB * 1024 * 1024,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			// Internal server error by default
			code := fiber.StatusInternalServerError

			// Log always
			log.Printf("%s[ERROR]%s %v", colorRed, colorReset, err)

			// In debug mode, show details
			if debugMode {
				return c.Status(code).JSON(fiber.Map{
					"error":   err.Error(),
					"message": "Debug mode active",
				})
			}

			// In production, hide internals
			return c.Status(code).JSON(fiber.Map{
				"error": "Internal server error",
			})
		},
	})

	//! 3. Middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000, http://127.0.0.1:3000, http://192.168.1.11:3000, http://192.168.1.14:3000, http://192.168.1.10:3000",
		AllowHeaders:     "Origin, Content-Type, Accept, Access-Control-Allow-Credentials, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
		MaxAge:           24 * 86400, // 24 hours
		ExposeHeaders:    "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Authorization",
	}))

	if debugMode {
		app.Use(logger.New(logger.Config{
			Format: fmt.Sprintf("%s[${time}]%s %s${status}%s - ${latency} %s${method}%s ${path}\n",
				colorCyan, colorReset, colorGreen, colorReset, colorYellow, colorReset),
		}))
		log.Printf("%s🐛 Debug mode enabled%s", colorCyan, colorReset)
	}

	//! 4. Static files
	app.Static("/files-storage", "../storage")

	//! 5. Routes
	//? Base API route
	api := app.Group("/api")
	v1 := api.Group("/v1")
	//? User routes
	userHandler := handlers.NewUserHandler(db)
	routes.SetupUserRoutes(v1, userHandler)

	//? Contractor routes
	contractorHandler := handlers.NewContractHandler(db)
	routes.SetupContractsRoutes(v1, contractorHandler)

	//! 6. Get port from environment
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = defaultPort
		if debugMode {
			log.Printf("%sℹ️ Using default port:%s %s", colorBlue, colorReset, port)
		}
	}

	//! 7 Start server in a goroutine
	go func() {
		fmt.Printf("%s🚀 Server running%s → %shttp://localhost:%s%s%s\n",
			colorGreen, colorReset, colorBlue, port, colorReset, bold)
		if err := app.Listen(":" + port); err != nil {
			log.Fatalf("%s❌ Server failed to start:%s %v", colorRed, colorReset, err)
		}
	}()

	//! 8. Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Printf("%s🛑 Shutting down server...%s", colorYellow, colorReset)
	if err := app.ShutdownWithTimeout(shutdownTimeout); err != nil {
		log.Printf("%s⚠️ Error during shutdown:%s %v", colorRed, colorReset, err)
	}

	log.Printf("%s✅ Server gracefully stopped%s", colorGreen, colorReset)
}
