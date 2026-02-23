package database

import (
	"log"
	"os"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/sobhan-yasami/docs-db-panel/internal/models"
)

func Seed(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {

		// 1️⃣ Check if any sudoer exists
		var count int64
		err := tx.Model(&models.EmployeeRole{}).
			Joins("JOIN roles ON roles.id = employee_roles.role_id").
			Where("roles.code = ?", models.RoleSudoer).
			Count(&count).Error

		if err != nil {
			return err
		}

		if count > 0 {
			log.Println("✅ Sudoer already exists. Skipping seed.")
			return nil
		}

		log.Println("🚀 No sudoer found. Bootstrapping system...")

		// 2️⃣ Create default company
		company := models.Company{
			Name:     "System Company",
			IsActive: true,
		}

		if err := tx.Create(&company).Error; err != nil {
			return err
		}

		// 3️⃣ Create sudoer role
		role := models.Role{
			Code:       models.RoleSudoer,
			Definition: models.RoleDefSudoer,
			CompanyID:  &company.ID,
		}

		if err := tx.Create(&role).Error; err != nil {
			return err
		}

		// 4️⃣ Read bootstrap credentials from ENV
		user_name := os.Getenv("BOOTSTRAP_USERNAME")
		password := os.Getenv("BOOTSTRAP_PASSWORD")

		if user_name == "" {
			user_name = "sudo-apt"
		}
		if password == "" {
			password = "current-pass"
		}

		hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		// 5️⃣ Create sudoer employee
		user := models.Employee{
			FirstName: "System",
			LastName:  "Administrator",
			UserName:  user_name,
			Password:  string(hashed),
			CompanyID: company.ID,
			IsActive:  true,
		}

		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		// 6️⃣ Assign role
		empRole := models.EmployeeRole{
			EmployeeID: user.ID,
			RoleID:     role.ID,
		}

		if err := tx.Create(&empRole).Error; err != nil {
			return err
		}

		log.Println("🔥 Bootstrap sudoer created successfully.")
		log.Println("Username:", user_name)
		log.Println("⚠️ Please change password immediately.")

		return nil
	})
}
