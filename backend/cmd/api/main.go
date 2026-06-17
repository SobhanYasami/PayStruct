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

var (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorCyan   = "\033[36m"
	bold        = "\033[1m"
)

const (
	defaultPort        = "5000"
	defaultBodyLimitMB = 50
	shutdownTimeout    = 10 * time.Second
)

func init() {
	if err := godotenv.Load("../.env"); err != nil {
		log.Printf("Warning: Could not load .env file: %v", err)
	}
}

func main() {
	debugMode := os.Getenv("DEBUG") == "true"
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatalf("%s❌ JWT_SECRET is not set in environment variables%s", colorRed, colorReset)
	}

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("%s❌ Database connection failed:%s %v", colorRed, colorReset, err)
	}

	if err := database.Seed(db); err != nil {
		log.Fatalf("❌ Database seed failed: %v", err)
	}

	app := fiber.New(fiber.Config{
		Prefork:       false,
		CaseSensitive: true,
		StrictRouting: false,
		ServerHeader:  "Fiber",
		AppName:       "Contractor Management Panel",
		BodyLimit:     defaultBodyLimitMB * 1024 * 1024,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			log.Printf("%s[ERROR]%s %v", colorRed, colorReset, err)
			if debugMode {
				return c.Status(code).JSON(fiber.Map{
					"error":   err.Error(),
					"message": "Debug mode active",
				})
			}
			return c.Status(code).JSON(fiber.Map{"error": "Internal server error"})
		},
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins:  "*",
		AllowHeaders:  "Origin, Content-Type, Accept, Access-Control-Allow-Credentials, Authorization",
		AllowMethods:  "GET, POST, PUT, DELETE, OPTIONS",
		MaxAge:        24 * 86400,
		ExposeHeaders: "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Authorization",
	}))

	if debugMode {
		app.Use(logger.New(logger.Config{
			Format: fmt.Sprintf("%s[${time}]%s %s${status}%s - ${latency} %s${method}%s ${path}\n",
				colorCyan, colorReset, colorGreen, colorReset, colorYellow, colorReset),
		}))
		log.Printf("%s🐛 Debug mode enabled%s", colorCyan, colorReset)
	}

	app.Static("/files-storage", "../storage")

	api := app.Group("/api")
	v1 := api.Group("/v1")

	userHandler := handlers.NewUserHandler(db)
	routes.SetupUserRoutes(v1, userHandler, jwtSecret)

	companyHandler := handlers.NewCompanyHandler(db)
	routes.SetupCompanyRoutes(v1, companyHandler, jwtSecret)

	projectHandler := handlers.NewProjectHandler(db)
	routes.SetupProjectRoutes(v1, projectHandler, jwtSecret)

	contractorHandler := handlers.NewContractorHandler(db)
	routes.SetupContractorRoutes(v1, contractorHandler, jwtSecret)

	storageRoot := os.Getenv("STORAGE_ROOT")
	if storageRoot == "" {
		storageRoot = "../storage"
	}
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:" + func() string {
			if p := os.Getenv("SERVER_PORT"); p != "" {
				return p
			}
			return defaultPort
		}()
	}

	attachmentHandler := handlers.NewAttachmentHandler(db, storageRoot, baseURL)

	contractHandler := handlers.NewContractHandler(db)
	routes.SetupContractRoutes(v1, contractHandler, attachmentHandler, jwtSecret)
	routes.SetupAttachmentRoutes(v1, attachmentHandler, jwtSecret)

	statementHandler := handlers.NewStatementHandler(db)
	reportHandler := handlers.NewReportHandler(db)
	routes.SetupStatementRoutes(v1, statementHandler, reportHandler, jwtSecret)

	// Signature routes replaced by 5-stage approval via statement transition.
	_ = handlers.NewSignatureHandler(db)

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = defaultPort
		if debugMode {
			log.Printf("%sℹ️ Using default port:%s %s", colorBlue, colorReset, port)
		}
	}

	go func() {
		fmt.Printf("%s🚀 Server running%s → %shttp://localhost:%s%s%s\n",
			colorGreen, colorReset, colorBlue, port, colorReset, bold)
		if err := app.Listen(":" + port); err != nil {
			log.Fatalf("%s❌ Server failed to start:%s %v", colorRed, colorReset, err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Printf("%s🛑 Shutting down server...%s", colorYellow, colorReset)
	if err := app.ShutdownWithTimeout(shutdownTimeout); err != nil {
		log.Printf("%s⚠️ Error during shutdown:%s %v", colorRed, colorReset, err)
	}
	log.Printf("%s✅ Server gracefully stopped%s", colorGreen, colorReset)
}
