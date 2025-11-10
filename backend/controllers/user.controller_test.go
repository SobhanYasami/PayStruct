package controllers_test

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/controllers"
	"github.com/sobhan-yasami/docs-db-panel/database"
	"github.com/sobhan-yasami/docs-db-panel/models"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestApp(t *testing.T) *fiber.App {
	// Use in-memory SQLite DB
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Set global DB for controller
	database.DB = db
	err = db.AutoMigrate(&models.User{})
	assert.NoError(t, err)

	app := fiber.New()
	ctrl := controllers.NewUserController()

	app.Post("/users", ctrl.CreateUser)
	app.Get("/users/:id", ctrl.GetUser)
	app.Get("/users", ctrl.GetAllUsers)
	app.Post("/users/login", ctrl.LoginUser)

	return app
}

func TestCreateUser_Success(t *testing.T) {
	app := setupTestApp(t)

	body := `{"user_name":"testuser","password":"123456","first_name":"John","last_name":"Doe","role":"admin"}`
	req := httptest.NewRequest("POST", "/users", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusCreated, resp.StatusCode)
}

func TestCreateUser_MissingFields(t *testing.T) {
	app := setupTestApp(t)

	body := `{"user_name":""}`
	req := httptest.NewRequest("POST", "/users", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestGetUser_Success(t *testing.T) {
	app := setupTestApp(t)

	// Insert a test user
	user := models.User{
		UserName: "john",
		Password: "123",
		Role:     "admin",
	}
	database.DB.Create(&user)

	req := httptest.NewRequest("GET", "/users/"+user.ID.String(), nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}

func TestGetUser_NotFound(t *testing.T) {
	app := setupTestApp(t)

	req := httptest.NewRequest("GET", "/users/9999", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestGetAllUsers_Success(t *testing.T) {
	app := setupTestApp(t)

	database.DB.Create(&models.User{UserName: "a", Password: "1"})
	database.DB.Create(&models.User{UserName: "b", Password: "2"})

	req := httptest.NewRequest("GET", "/users?page=1&limit=2", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&body)
	assert.Equal(t, "success", body["status"])
}

func TestLoginUser_Success(t *testing.T) {
	app := setupTestApp(t)
	os.Setenv("JWT_SECRET", "testsecret")

	// Create a user with hashed password
	hashed, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := models.User{
		UserName: "loginuser",
		Password: string(hashed),
		Role:     "user",
	}
	database.DB.Create(&user)

	body := `{"user_name":"loginuser","password":"password123"}`
	req := httptest.NewRequest("POST", "/users/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	assert.Equal(t, "success", result["status"])
	assert.NotEmpty(t, result["token"])
}

func TestLoginUser_InvalidPassword(t *testing.T) {
	app := setupTestApp(t)
	os.Setenv("JWT_SECRET", "testsecret")

	hashed, _ := bcrypt.GenerateFromPassword([]byte("rightpass"), bcrypt.DefaultCost)
	user := models.User{
		UserName: "wrongpass",
		Password: string(hashed),
	}
	database.DB.Create(&user)

	body := `{"user_name":"wrongpass","password":"wrong"}`
	req := httptest.NewRequest("POST", "/users/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}
