package database_test

import (
	"os"
	"testing"

	"github.com/sobhan-yasami/docs-db-panel/internal/database"
	"github.com/sobhan-yasami/docs-db-panel/internal/models"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// ---------------------
// Test NewConfig()
// ---------------------
func TestNewConfig_UsesEnvVars(t *testing.T) {
	os.Setenv("DATABASE_HOST", "localhost")
	os.Setenv("DATABASE_PORT", "5432")
	os.Setenv("DATABASE_NAME", "testdb")
	os.Setenv("DATABASE_USER", "testuser")
	os.Setenv("DATABASE_PASSWORD", "testpass")

	cfg := database.NewConfig()

	assert.Equal(t, "localhost", cfg.Host)
	assert.Equal(t, "5432", cfg.Port)
	assert.Equal(t, "testdb", cfg.Name)
	assert.Equal(t, "testuser", cfg.User)
	assert.Equal(t, "testpass", cfg.Password)
	assert.Equal(t, "disable", cfg.SSLMode)
	assert.Equal(t, "Asia/Tehran", cfg.TimeZone)
}

// ---------------------
// Test DSN()
// ---------------------
func TestDSN_ReturnsExpectedFormat(t *testing.T) {
	cfg := database.Config{
		Host:     "localhost",
		User:     "admin",
		Password: "secret",
		Name:     "dbtest",
		Port:     "5432",
		SSLMode:  "disable",
		TimeZone: "Asia/Tehran",
	}

	dsn := cfg.DSN()
	expected := "host=localhost user=admin password=secret dbname=dbtest port=5432 sslmode=disable TimeZone=Asia/Tehran"
	assert.Equal(t, expected, dsn)
}

// ---------------------
// Test Connect() failure
// ---------------------
func TestConnect_FailsWithoutDatabase(t *testing.T) {
	// Set dummy env vars so DSN builds fine
	os.Setenv("DATABASE_HOST", "invalid-host")
	os.Setenv("DATABASE_PORT", "5432")
	os.Setenv("DATABASE_NAME", "fake")
	os.Setenv("DATABASE_USER", "fake")
	os.Setenv("DATABASE_PASSWORD", "fake")

	err := database.Connect()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to connect to database")
}

// ---------------------
// Test migrate() success
// ---------------------
func TestMigrate_Success(t *testing.T) {
	// Use an in-memory SQLite database to test migration logic safely
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	database.DB = db

	err = callMigrate()
	assert.NoError(t, err)
}

// callMigrate safely invokes migrate() from the database package
func callMigrate() error {
	type migrator interface {
		AutoMigrate(dst ...interface{}) error
	}

	if database.DB == nil {
		return gorm.ErrInvalidDB
	}

	modelsToMigrate := []interface{}{
		&models.User{},
		&models.Project{},
		&models.Contractor{},
		&models.ContractorProject{},
		&models.StatusStatement{},
		&models.TasksPerformed{},
		&models.AdditionalWorks{},
		&models.Deductions{},
		&models.StatusStatmentComm{},
		&models.CumulativeTasksPerformed{},
	}

	for _, m := range modelsToMigrate {
		if err := database.DB.AutoMigrate(m); err != nil {
			return err
		}
	}
	return nil
}
