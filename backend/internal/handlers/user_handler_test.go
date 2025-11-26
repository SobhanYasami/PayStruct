package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/sobhan-yasami/docs-db-panel/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockUserService is a mock implementation of UserService
type MockUserService struct {
	mock.Mock
}

func (m *MockUserService) CreateEmployee(req services.CreateEmployeeRequest) (*services.CreateEmployeeResponse, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*services.CreateEmployeeResponse), args.Error(1)
}

func TestUserHandler_CreateEmployee(t *testing.T) {
	t.Run("Success - Employee created successfully", func(t *testing.T) {
		// Setup
		app := fiber.New()
		mockService := new(MockUserService)
		handler := &UserHandler{
			userService: mockService,
		}

		requestBody := map[string]string{
			"first_name": "John",
			"last_name":  "Doe",
			"user_name":  "johndoe",
			"password":   "securepassword",
			"role":       "employee",
			"phone":      "+1234567890",
		}

		expectedResponse := &services.CreateEmployeeResponse{
			ID:       "uuid-123",
			UserName: "johndoe",
			FullName: "John Doe",
			Role:     "employee",
		}

		mockService.On("CreateEmployee", services.CreateEmployeeRequest{
			FirstName: "John",
			LastName:  "Doe",
			UserName:  "johndoe",
			Password:  "securepassword",
			Phone:     "+1234567890",
			Role:      "employee",
		}).Return(expectedResponse, nil)

		// Execute
		body, _ := json.Marshal(requestBody)
		req := httptest.NewRequest("POST", "/users", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		app.Post("/users", handler.CreateEmployee)
		resp, err := app.Test(req)

		// Assert
		assert.NoError(t, err)
		assert.Equal(t, fiber.StatusCreated, resp.StatusCode)

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)

		assert.Equal(t, "success", response["status"])
		assert.Equal(t, "johndoe", response["user_name"])
		assert.Equal(t, "John Doe", response["full_name"])
		assert.Equal(t, "employee", response["role"])
		assert.Equal(t, "Employee created successfully", response["message"])

		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Invalid JSON body", func(t *testing.T) {
		// Setup
		app := fiber.New()
		mockService := new(MockUserService)
		handler := &UserHandler{
			userService: mockService,
		}

		// Execute
		req := httptest.NewRequest("POST", "/users", bytes.NewReader([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")

		app.Post("/users", handler.CreateEmployee)
		resp, err := app.Test(req)

		// Assert
		assert.NoError(t, err)
		assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)

		assert.Equal(t, "Invalid request body", response["error"])
	})

	t.Run("Failure - Missing required fields", func(t *testing.T) {
		// Setup
		app := fiber.New()
		mockService := new(MockUserService)
		handler := &UserHandler{
			userService: mockService,
		}

		requestBody := map[string]string{
			"first_name": "John",
			// last_name missing
			"user_name": "johndoe",
			"password":  "securepassword",
			// role missing
		}

		serviceError := &services.ServiceError{
			Message: "First name, last name, username, password, and role are required",
			Code:    fiber.StatusBadRequest,
		}

		mockService.On("CreateEmployee", services.CreateEmployeeRequest{
			FirstName: "John",
			LastName:  "",
			UserName:  "johndoe",
			Password:  "securepassword",
			Phone:     "",
			Role:      "",
		}).Return(nil, serviceError)

		// Execute
		body, _ := json.Marshal(requestBody)
		req := httptest.NewRequest("POST", "/users", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		app.Post("/users", handler.CreateEmployee)
		resp, err := app.Test(req)

		// Assert
		assert.NoError(t, err)
		assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)

		assert.Equal(t, "First name, last name, username, password, and role are required", response["error"])

		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Username already exists", func(t *testing.T) {
		// Setup
		app := fiber.New()
		mockService := new(MockUserService)
		handler := &UserHandler{
			userService: mockService,
		}

		requestBody := map[string]string{
			"first_name": "John",
			"last_name":  "Doe",
			"user_name":  "johndoe",
			"password":   "securepassword",
			"role":       "employee",
		}

		serviceError := &services.ServiceError{
			Message: "Username already exists",
			Code:    fiber.StatusConflict,
		}

		mockService.On("CreateEmployee", services.CreateEmployeeRequest{
			FirstName: "John",
			LastName:  "Doe",
			UserName:  "johndoe",
			Password:  "securepassword",
			Phone:     "",
			Role:      "employee",
		}).Return(nil, serviceError)

		// Execute
		body, _ := json.Marshal(requestBody)
		req := httptest.NewRequest("POST", "/users", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		app.Post("/users", handler.CreateEmployee)
		resp, err := app.Test(req)

		// Assert
		assert.NoError(t, err)
		assert.Equal(t, fiber.StatusConflict, resp.StatusCode)

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)

		assert.Equal(t, "Username already exists", response["error"])

		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Phone number already exists", func(t *testing.T) {
		// Setup
		app := fiber.New()
		mockService := new(MockUserService)
		handler := &UserHandler{
			userService: mockService,
		}

		requestBody := map[string]string{
			"first_name": "John",
			"last_name":  "Doe",
			"user_name":  "johndoe",
			"password":   "securepassword",
			"role":       "employee",
			"phone":      "+1234567890",
		}

		serviceError := &services.ServiceError{
			Message: "Phone number already exists",
			Code:    fiber.StatusConflict,
		}

		mockService.On("CreateEmployee", services.CreateEmployeeRequest{
			FirstName: "John",
			LastName:  "Doe",
			UserName:  "johndoe",
			Password:  "securepassword",
			Phone:     "+1234567890",
			Role:      "employee",
		}).Return(nil, serviceError)

		// Execute
		body, _ := json.Marshal(requestBody)
		req := httptest.NewRequest("POST", "/users", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		app.Post("/users", handler.CreateEmployee)
		resp, err := app.Test(req)

		// Assert
		assert.NoError(t, err)
		assert.Equal(t, fiber.StatusConflict, resp.StatusCode)

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)

		assert.Equal(t, "Phone number already exists", response["error"])

		mockService.AssertExpectations(t)
	})

	t.Run("Failure - Internal server error", func(t *testing.T) {
		// Setup
		app := fiber.New()
		mockService := new(MockUserService)
		handler := &UserHandler{
			userService: mockService,
		}

		requestBody := map[string]string{
			"first_name": "John",
			"last_name":  "Doe",
			"user_name":  "johndoe",
			"password":   "securepassword",
			"role":       "employee",
		}

		mockService.On("CreateEmployee", services.CreateEmployeeRequest{
			FirstName: "John",
			LastName:  "Doe",
			UserName:  "johndoe",
			Password:  "securepassword",
			Phone:     "",
			Role:      "employee",
		}).Return(nil, errors.New("database connection failed"))

		// Execute
		body, _ := json.Marshal(requestBody)
		req := httptest.NewRequest("POST", "/users", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		app.Post("/users", handler.CreateEmployee)
		resp, err := app.Test(req)

		// Assert
		assert.NoError(t, err)
		assert.Equal(t, fiber.StatusInternalServerError, resp.StatusCode)

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)

		assert.Equal(t, "Internal server error", response["error"])
		assert.Contains(t, response["details"], "database connection failed")

		mockService.AssertExpectations(t)
	})

	t.Run("Success - Employee created without phone", func(t *testing.T) {
		// Setup
		app := fiber.New()
		mockService := new(MockUserService)
		handler := &UserHandler{
			userService: mockService,
		}

		requestBody := map[string]string{
			"first_name": "Jane",
			"last_name":  "Smith",
			"user_name":  "janesmith",
			"password":   "securepassword",
			"role":       "manager",
		}

		expectedResponse := &services.CreateEmployeeResponse{
			ID:       "uuid-456",
			UserName: "janesmith",
			FullName: "Jane Smith",
			Role:     "manager",
		}

		mockService.On("CreateEmployee", services.CreateEmployeeRequest{
			FirstName: "Jane",
			LastName:  "Smith",
			UserName:  "janesmith",
			Password:  "securepassword",
			Phone:     "",
			Role:      "manager",
		}).Return(expectedResponse, nil)

		// Execute
		body, _ := json.Marshal(requestBody)
		req := httptest.NewRequest("POST", "/users", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		app.Post("/users", handler.CreateEmployee)
		resp, err := app.Test(req)

		// Assert
		assert.NoError(t, err)
		assert.Equal(t, fiber.StatusCreated, resp.StatusCode)

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)

		assert.Equal(t, "success", response["status"])
		assert.Equal(t, "janesmith", response["user_name"])
		assert.Equal(t, "Jane Smith", response["full_name"])
		assert.Equal(t, "manager", response["role"])

		mockService.AssertExpectations(t)
	})
}
