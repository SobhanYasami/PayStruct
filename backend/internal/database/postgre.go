package database

import (
	"fmt"
	"log"
	"os"
	"time"

	model "github.com/sobhan-yasami/docs-db-panel/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const (
	defaultMaxRetries      = 3
	defaultRetryDelay      = 5 * time.Second
	defaultMaxIdleConns    = 10
	defaultMaxOpenConns    = 100
	defaultConnMaxLifetime = time.Hour
)

var (
	DB *gorm.DB
)

type Config struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
	SSLMode  string
	TimeZone string
}

func NewConfig() Config {
	return Config{
		Host:     os.Getenv("DATABASE_HOST"),
		Port:     os.Getenv("DATABASE_PORT"),
		Name:     os.Getenv("DATABASE_NAME"),
		User:     os.Getenv("DATABASE_USER"),
		Password: os.Getenv("DATABASE_PASSWORD"),
		SSLMode:  "disable",
		TimeZone: "Asia/Tehran",
	}
}

func (c Config) DSN() string {
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		c.Host,
		c.User,
		c.Password,
		c.Name,
		c.Port,
		c.SSLMode,
		c.TimeZone,
	)
}

func Connect() (*gorm.DB, error) {
	config := NewConfig()
	dsn := config.DSN()

	var db *gorm.DB
	var err error

	for i := 0; i < defaultMaxRetries; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger:                                   logger.Default.LogMode(logger.Silent),
			DisableForeignKeyConstraintWhenMigrating: true, // break the cycle
			PrepareStmt:                              true, // free perf win for the rest of the app
		})

		if err == nil {
			break
		}

		if i < defaultMaxRetries-1 {
			log.Printf("Attempt %d/%d: Database connection failed: %v. Retrying in %v...",
				i+1, defaultMaxRetries, err, defaultRetryDelay)
			time.Sleep(defaultRetryDelay)
		}
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database after %d attempts: %w", defaultMaxRetries, err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying DB connection: %w", err)
	}

	sqlDB.SetMaxIdleConns(defaultMaxIdleConns)
	sqlDB.SetMaxOpenConns(defaultMaxOpenConns)
	sqlDB.SetConnMaxLifetime(defaultConnMaxLifetime)

	DB = db

	if os.Getenv("RESET_DB") == "true" {
		if err := DropAll(DB); err != nil {
			return nil, fmt.Errorf("drop all failed: %w", err)
		}
		log.Println("⚠️  RESET_DB: all tables dropped")
	}

	if err := model.AutoMigrate(DB); err != nil {
		return nil, fmt.Errorf("migration failed: %w", err)
	}

	log.Println("Database connection established and models migrated successfully")
	return DB, nil
}

// DropAll drops and recreates the public schema, removing every table, index,
// sequence, and type in one shot. Postgres-only. Never call outside development.
func DropAll(db *gorm.DB) error {
	for _, stmt := range []string{
		`DROP SCHEMA public CASCADE`,
		`CREATE SCHEMA public`,
		`GRANT ALL ON SCHEMA public TO public`,
	} {
		if err := db.Exec(stmt).Error; err != nil {
			return err
		}
	}
	return nil
}
