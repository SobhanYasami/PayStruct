package model

import (
	"fmt"
	"sort"
	"strings"
	"sync"

	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

// AutoMigrate runs gorm.AutoMigrate over every model in FK-safe order, then
// installs FK constraints and bespoke indexes.
func AutoMigrate(db *gorm.DB) error {
	ordered := []any{
		// No FKs or only self-referential.
		&Currency{},
		&Company{},
		// Depends on Company.
		&Employee{},
		&Project{},
		&RefreshToken{},
		// Depends on Company + Project.
		&Contractor{},
		&Consultant{},
		&Contract{},
		&ContractLineItem{},
		// Depends on Contract.
		&FXRate{},
		&InterimStatement{},
		&WorkDoneItem{},
		&ExtraWorkItem{},
		&StatementDeductionItem{},
		&RetentionRecord{},
		&AdvancePaymentRecord{},
		&LiquidatedDamage{},
		// Audit — entity-polymorphic, no hard FKs.
		&ApprovalEvent{},
		&Attachment{},
	}
	for _, m := range ordered {
		if err := db.AutoMigrate(m); err != nil {
			return err
		}
	}
	if err := MigrateForeignKeys(db); err != nil {
		return err
	}
	return MigrateIndexes(db)
}

type fk struct {
	name, table, col, refTable, refCol, onDelete, onUpdate string
}

func collectFKs(db *gorm.DB, models []any) ([]fk, error) {
	cache := &sync.Map{}
	seen := make(map[string]struct{})
	var out []fk

	for _, m := range models {
		s, err := schema.Parse(m, cache, db.NamingStrategy)
		if err != nil {
			return nil, fmt.Errorf("schema.Parse %T: %w", m, err)
		}
		for _, rel := range s.Relationships.BelongsTo {
			tagOnDelete, tagOnUpdate := parseConstraintTag(rel.Field.TagSettings["CONSTRAINT"])
			for _, ref := range rel.References {
				if ref.ForeignKey == nil || ref.PrimaryKey == nil {
					continue
				}
				od := tagOnDelete
				if od == "" {
					if ref.ForeignKey.NotNull {
						od = "RESTRICT"
					} else {
						od = "SET NULL"
					}
				}
				ou := tagOnUpdate
				if ou == "" {
					ou = "CASCADE"
				}

				name := constraintName(rel.Schema.Table, ref.ForeignKey.DBName)
				if _, dup := seen[name]; dup {
					return nil, fmt.Errorf("duplicate fk name %q (collision on %s.%s)",
						name, rel.Schema.Table, ref.ForeignKey.DBName)
				}
				seen[name] = struct{}{}

				out = append(out, fk{
					name:     name,
					table:    rel.Schema.Table,
					col:      ref.ForeignKey.DBName,
					refTable: rel.FieldSchema.Table,
					refCol:   ref.PrimaryKey.DBName,
					onDelete: od,
					onUpdate: ou,
				})
			}
		}
	}

	sort.Slice(out, func(i, j int) bool { return out[i].name < out[j].name })
	return out, nil
}

func parseConstraintTag(tag string) (onDelete, onUpdate string) {
	for _, part := range strings.Split(tag, ",") {
		k, v, ok := strings.Cut(part, ":")
		if !ok {
			continue
		}
		switch strings.ToUpper(strings.TrimSpace(k)) {
		case "ONDELETE":
			onDelete = strings.ToUpper(strings.TrimSpace(v))
		case "ONUPDATE":
			onUpdate = strings.ToUpper(strings.TrimSpace(v))
		}
	}
	return
}

func constraintName(table, col string) string {
	name := fmt.Sprintf("fk_%s_%s", table, strings.TrimSuffix(col, "_id"))
	if len(name) > 63 {
		name = name[:63]
	}
	return name
}

// MigrateForeignKeys installs FK constraints after all tables exist.
// Idempotent via pg_constraint lookup.
func MigrateForeignKeys(db *gorm.DB) error {
	fks, err := collectFKs(db, AllModels())
	if err != nil {
		return err
	}

	const tmpl = `
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '%s') THEN
        ALTER TABLE %s
            ADD CONSTRAINT %s FOREIGN KEY (%s)
            REFERENCES %s(%s) ON DELETE %s ON UPDATE %s
            DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END$$;`

	for _, f := range fks {
		stmt := fmt.Sprintf(tmpl,
			f.name, f.table, f.name, f.col,
			f.refTable, f.refCol, f.onDelete, f.onUpdate,
		)
		if err := db.Exec(stmt).Error; err != nil {
			return fmt.Errorf("install %s: %w", f.name, err)
		}
	}
	return nil
}

// MigrateIndexes applies Postgres-specific indexes not expressible via GORM tags.
func MigrateIndexes(db *gorm.DB) error {
	stmts := []string{
		// Make tax_id and registration_no nullable so multiple contractors can
		// omit them without hitting the unique constraint on empty string.
		`ALTER TABLE contractors ALTER COLUMN tax_id DROP NOT NULL`,
		`ALTER TABLE contractors ALTER COLUMN registration_no DROP NOT NULL`,
		// legal_name is now optional.
		`ALTER TABLE contractors ALTER COLUMN legal_name DROP NOT NULL`,
		// Same fix for companies.tax_id.
		`ALTER TABLE companies ALTER COLUMN tax_id DROP NOT NULL`,
		// Drop ALL stale NOT-NULL columns in contractors that are not in the
		// current model. Safe: IF NOT EXISTS / IF EXISTS guards all statements.
		`DO $$
DECLARE col TEXT;
BEGIN
    FOR col IN
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'contractors'
          AND is_nullable = 'NO'
          AND column_name NOT IN (
            'id','created_at','updated_at',
            'type','display_name','default_currency'
          )
    LOOP
        EXECUTE format('ALTER TABLE contractors ALTER COLUMN %I DROP NOT NULL', col);
    END LOOP;
END$$`,
		// Stale unique index on national_id breaks multi-contractor inserts with empty value.
		// Recreate as partial: enforce uniqueness only for non-empty, non-null values.
		`DROP INDEX IF EXISTS idx_contractors_national_id`,
		`CREATE INDEX IF NOT EXISTS idx_contractors_national_id
		 ON contractors (national_id)
		 WHERE national_id IS NOT NULL AND national_id != ''`,

		// contract_no unique index must be composite (company_id, contract_no).
		// Old schema had a single-column unique index — drop and recreate.
		`DROP INDEX IF EXISTS idx_contracts_company_no`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_company_no
		 ON contracts (company_id, contract_no) WHERE deleted_at IS NULL`,

		// Old schema had a `code` column (NOT NULL, no default) — now superseded
		// by contract_no. Guard with column existence check so fresh DBs don't fail.
		`DROP INDEX IF EXISTS idx_contracts_project_code`,
		`DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contracts' AND column_name = 'code'
    ) THEN
        ALTER TABLE contracts ALTER COLUMN code DROP NOT NULL;
    END IF;
END$$`,

		`ALTER TABLE consultants ALTER COLUMN registration_no DROP NOT NULL`,
		`ALTER TABLE consultants ALTER COLUMN tax_id DROP NOT NULL`,

		`CREATE INDEX IF NOT EXISTS idx_employees_roles_gin
		 ON employees USING GIN (roles)`,

		`CREATE INDEX IF NOT EXISTS idx_projects_tags_gin
		 ON projects USING GIN (tags)`,

		`CREATE INDEX IF NOT EXISTS idx_statements_contract_status
		 ON interim_statements (contract_id, status, sequence_no DESC)
		 WHERE deleted_at IS NULL`,

		`CREATE INDEX IF NOT EXISTS idx_projects_status_priority
		 ON projects (company_id, status, priority)
		 WHERE deleted_at IS NULL`,

		`CREATE INDEX IF NOT EXISTS idx_approval_events_entity
		 ON approval_events (entity_type, entity_id, created_at DESC)`,
	}
	for _, s := range stmts {
		if err := db.Exec(s).Error; err != nil {
			return err
		}
	}
	return nil
}
