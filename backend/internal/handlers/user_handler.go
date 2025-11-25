package handlers

import (
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sobhan-yasami/docs-db-panel/internal/models"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// -----------------------------------------------------------------------
type UserHandler struct {
	db          *gorm.DB
	userService *services.UserService
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{
		db:          db,
		userService: services.NewUserService(db),
	}
}

// ------------------------------------------------------------------------

// ! @post /users
func (ctrl *UserHandler) CreateEmployee(c *fiber.Ctx) error {
	type Submission struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		UserName  string `json:"user_name"`
		Password  string `json:"password"`
		Phone     string `json:"phone,omitempty"`
		Role      string `json:"role"`
	}

	var submission Submission

	//* 1) Parse and validate input
	if err := c.BodyParser(&submission); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	//* 2) Call service layer
	req := services.CreateEmployeeRequest{
		FirstName: submission.FirstName,
		LastName:  submission.LastName,
		UserName:  submission.UserName,
		Password:  submission.Password,
		Phone:     submission.Phone,
		Role:      submission.Role,
	}

	result, err := ctrl.userService.CreateEmployee(req)
	if err != nil {
		serviceErr, ok := err.(*services.ServiceError)
		if ok {
			return c.Status(serviceErr.Code).JSON(fiber.Map{
				"error":   serviceErr.Message,
				"details": serviceErr.Details,
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Internal server error",
			"details": err.Error(),
		})
	}

	//* 3) Return success response
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"status":    "success",
		"id":        result.ID,
		"user_name": result.UserName,
		"full_name": result.FullName,
		"role":      result.Role,
		"message":   "Employee created successfully",
	})
}

// ! @put /users/:id
func (ctrl *UserHandler) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	if err := ctrl.db.First(&user, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch user",
			"details": err.Error(),
		})
	}

	if err := c.BodyParser(&user); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	if err := ctrl.db.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to update user",
			"details": err.Error(),
		})
	}

	return c.JSON(user)
}

// ! @get /users/:id
func (ctrl *UserHandler) GetUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	if err := ctrl.db.First(&user, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch user",
			"details": err.Error(),
		})
	}

	return c.JSON(user)
}

// ! @get /users
func (ctrl *UserHandler) GetAllUsers(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	offset := (page - 1) * limit

	var users []models.User
	if err := ctrl.db.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to fetch users",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   users,
	})
}

// ! @delete /users/:id
func (ctrl *UserHandler) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := ctrl.db.Delete(&models.User{}, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to delete user",
			"details": err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ! @post /users/login
func (ctrl *UserHandler) LoginUser(c *fiber.Ctx) error {
	type LoginRequest struct {
		UserName string `json:"user_name" validate:"required,email"`
		Password string `json:"password" validate:"required,min=6"`
	}

	var req LoginRequest
	var user models.User

	//? 1. Parse and validate request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "درخواست نامعتبر است",
		})
	}

	//? 2. Fetch user by email
	if err := ctrl.db.Where("user_name = ?", req.UserName).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "نام کاربری یا رمز عبور نامعتبر است",
		})
	}

	//? 3. Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "نام کاربری یا رمز عبور نامعتبر است",
		})
	}

	//? 4. Create JWT token
	claims := models.JWTClaims{
		UserID:   user.ID.String(),
		UserName: user.UserName,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(12 * time.Hour)),
			Issuer:    "JKR-Co",
		},
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "توکن مخفی تنظیم نشده است",
		})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "خطا در تولید توکن",
		})
	}

	//? 5. Return the signed token
	return c.JSON(fiber.Map{
		"status": "success",
		"token":  signed,
		"role":   user.Role,
	})
}
