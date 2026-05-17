package database

import (
	"errors"
	"log"
	"os"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	model "github.com/sobhan-yasami/docs-db-panel/internal/models"
)

const sudoerRole = "sudoer"

func Seed(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// 1) Skip if a sudoer employee already exists.
		var existing model.Employee
		err := tx.Where("roles @> ?", pq.StringArray{sudoerRole}).First(&existing).Error
		if err == nil {
			log.Println("Sudoer already exists. Skipping seed.")
			return nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		log.Println("No sudoer found. Bootstrapping system...")

		// 2) Find or create system company.
		company := model.Company{
			Name:   "System Company",
			RegNum: "SYS-001",
		}
		if err := tx.Where(model.Company{RegNum: "SYS-001"}).FirstOrCreate(&company).Error; err != nil {
			return err
		}

		// 3) Read bootstrap credentials from env.
		email := os.Getenv("BOOTSTRAP_USERNAME")
		password := os.Getenv("BOOTSTRAP_PASSWORD")
		if email == "" {
			email = "admin@system.local"
		}
		if password == "" {
			password = "changeme"
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		// 4) Create sudoer employee.
		employee := model.Employee{
			CompanyID:      company.ID,
			NationalID:     "SYSTEM-001",
			FirstName:      "System",
			LastName:       "Administrator",
			Email:          email,
			EmploymentType: model.EmploymentOfficial,
			Roles:          pq.StringArray{sudoerRole},
			PasswordHash:   hash,
			Active:         true,
		}
		if err := tx.Create(&employee).Error; err != nil {
			return err
		}

		log.Println("Bootstrap sudoer created.")
		log.Println("Email:", email)
		log.Println("Change the password immediately.")
		return nil
	})
}
