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

		//? 1) Check if any sudoer exists
		var count int64
		err := tx.Model(&models.RoleEmployee{}).
			Joins("JOIN roles ON roles.id = role_employees.role_id").
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

		//? 2) Create default address
		address := models.Address{
			Street:     "System Street 1",
			City:       "System City",
			State:      "System State",
			Country:    "System Country",
			PostalCode: "00000",
		}
		if err := tx.Create(&address).Error; err != nil {
			return err
		}

		//? 3) Create default contact
		contact := models.Contact{
			PhoneNumber: "",
			Email:       "admin@system.local",
			Website:     "",
		}
		if err := tx.Create(&contact).Error; err != nil {
			return err
		}
		//? 4) Create default company
		company := models.Company{
			Name:               "System Company",
			RegistrationNumber: "SYS-0001",
			TaxIdNumber:        "TAX-0001",
			IsActive:           true,
			AddressID:          address.ID,
			ContactID:          contact.ID,
		}
		if err := tx.Create(&company).Error; err != nil {
			return err
		}

		//? 6) Create sudoer role
		role := models.Role{
			Code:      models.RoleSudoer,
			CompanyID: &company.ID,
		}

		if err := tx.Create(&role).Error; err != nil {
			return err
		}

		//? 7) Read bootstrap credentials from ENV
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

		//? 8) Create sudoer employee
		user := models.Employee{
			FirstName:       "System",
			LastName:        "Administrator",
			UserName:        user_name,
			Password:        string(hashed),
			RegisterationID: "SYS-ADMIN",
			CompanyID:       company.ID,
			IsActive:        true,
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		//? 9) Assign role
		empRole := models.RoleEmployee{
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
