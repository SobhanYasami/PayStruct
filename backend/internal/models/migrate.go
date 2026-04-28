package model

import (
	"gorm.io/gorm"
)

// MigrateIndexes applies the indexes that GORM struct tags can't cleanly
// express — namely PostgreSQL-specific GIN indexes on TEXT[] columns and
// any partial / functional indexes the app relies on.
//
// Idempotent: every CREATE uses IF NOT EXISTS. Run after AutoMigrate.
//
// Trade-offs flagged:
//   - GIN indexes are larger and slower to update than B-tree, but they
//     are the only sane choice for `array_col @> ARRAY[...]` and `&&`
//     containment queries used by role/tag filters. (See Postgres docs:
//     "Built-in Operator Classes" → array_ops.)
//   - The trigram index on company.name is optional; uncomment if the
//     app exposes substring search ("ILIKE '%foo%'") on the listing UI.
func MigrateIndexes(db *gorm.DB) error {
	stmts := []string{
		`CREATE INDEX IF NOT EXISTS idx_employees_roles_gin
		 ON employees USING GIN (roles)`,

		`CREATE INDEX IF NOT EXISTS idx_projects_tags_gin
		 ON projects USING GIN (tags)`,

		// Hot path: list active statements for a contract in sequence order.
		`CREATE INDEX IF NOT EXISTS idx_statements_contract_status
		 ON status_statements (contract_id, status, sequence_no DESC)
		 WHERE deleted_at IS NULL`,

		// Hot path: project listing filtered by status / priority.
		`CREATE INDEX IF NOT EXISTS idx_projects_status_priority
		 ON projects (company_id, status, priority)
		 WHERE deleted_at IS NULL`,

		// Optional: enable pg_trgm before this. Commented out to keep
		// migrations dependency-free; uncomment + add `CREATE EXTENSION
		// IF NOT EXISTS pg_trgm` if substring search is needed.
		// `CREATE INDEX IF NOT EXISTS idx_companies_name_trgm
		//  ON companies USING GIN (name gin_trgm_ops)`,
	}

	for _, s := range stmts {
		if err := db.Exec(s).Error; err != nil {
			return err
		}
	}
	return nil
}

// AutoMigrate runs gorm.AutoMigrate over every model + the bespoke index
// DDL. Use in dev and tests; production should switch to a real migration
// tool (atlas, goose, sqlc-generated migrations) so DDL changes are
// reviewable and reversible.
func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(AllModels()...); err != nil {
		return err
	}
	return MigrateIndexes(db)
}
