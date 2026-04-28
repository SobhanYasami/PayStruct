package model

import (
	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Employee is a strong entity owned by Company (Has, 1:N).
//
// Specialization, EER → relational mapping:
//
//	disjoint  {Official, Contractual} → EmploymentType column + CHECK
//	overlap   {Manager, Juridical, Financial, Engineering, Security}
//	            → Roles TEXT[] with GIN index
//
// Trade-off vs table-per-subclass:
//   - Single-table is faster (no join per read), simpler joins from Project
//     and Contract sides.
//   - It loses type-distinct columns. The current EER carries no
//     subclass-specific attributes, so the cost is zero today; revisit if
//     subclass-specific fields are added later.
//
// Trade-off vs M2M employee_roles junction for overlap:
//   - TEXT[] + GIN: O(1) read, indexable with `roles && ARRAY['manager']`,
//     no second query. Lacks per-role audit metadata (who granted, when).
//   - If an audit trail per role becomes a requirement, add a sibling
//     EmployeeRoleHistory table; keep Roles as the cached "current set".
//
// Security:
//   - PasswordHash is bytea, never plaintext. Use argon2id (golang.org/x/
//     crypto/argon2) with per-record salt; the encoding includes the salt.
//   - Email is unique (case-insensitive comparison should be done by the
//     application layer or a citext column on Postgres ≥ 9.1).
type Employee struct {
	BaseModel
	CompanyID  uuid.UUID `gorm:"type:uuid;not null;index"             json:"company_id"`
	NationalID string    `gorm:"size:32;not null;uniqueIndex"         json:"national_id"`

	FirstName string `gorm:"size:120;not null"             json:"first_name"`
	LastName  string `gorm:"size:120;not null"             json:"last_name"`
	Email     string `gorm:"size:320;uniqueIndex"          json:"email,omitempty"`
	Phone     string `gorm:"size:32"                       json:"phone,omitempty"`

	// Disjoint specialization. CHECK keeps the invariant even if the type
	// is bypassed via raw SQL.
	EmploymentType EmploymentType `gorm:"type:varchar(16);not null;index;check:employment_type IN ('official','contractual')" json:"employment_type"`

	// Overlap specialization. Use a GIN index for `roles @> '{manager}'`
	// and `roles && ARRAY[...]` queries; declared in MigrateIndexes below
	// because GORM tags don't express GIN cleanly.
	Roles pq.StringArray `gorm:"type:text[];not null;default:'{}'"   json:"roles"`

	// Argon2id hash + parameters, encoded per `argon2.IDKey` recommendation.
	// Empty => SSO-only account.
	PasswordHash []byte `gorm:"type:bytea" json:"-"`

	// Active flag — disable login without deleting (preserves FK references
	// from contracts, status statements, etc.).
	Active bool `gorm:"not null;default:true;index" json:"active"`

	Company *Company `gorm:"foreignKey:CompanyID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
}

func (Employee) TableName() string { return "employees" }

// HasRole is a linear scan; with |Roles| ≤ 5 this is faster than building a
// map. If the role set grows large, switch the field to a uint64 bitmask.
func (e *Employee) HasRole(r Role) bool {
	for _, x := range e.Roles {
		if Role(x) == r {
			return true
		}
	}
	return false
}

// FullName is convenience for printing on status statements and reports.
// No localization here — collation/order-of-name policy belongs higher up.
func (e *Employee) FullName() string {
	if e.FirstName == "" {
		return e.LastName
	}
	if e.LastName == "" {
		return e.FirstName
	}
	return e.FirstName + " " + e.LastName
}
