package model

import (
	"fmt"
	"sort"
	"strings"
	"sync"

	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

// AutoMigrate runs gorm.AutoMigrate over every model, then installs FK
// constraints and bespoke indexes. FK creation is deferred to
// MigrateForeignKeys because GORM's tag-driven FK emission can't handle
// the companies.manager_id ↔ employees.company_id cycle.
//
// Use in dev and tests; production should switch to atlas/goose so DDL
// changes are reviewable and reversible.
func AutoMigrate(db *gorm.DB) error {
	ordered := []any{
		&Company{}, &Employee{}, &Project{}, &Contractor{}, &Contract{},
		&WBS{}, &StatusStatement{}, &WorksDone{}, &ExtraWork{}, &Deduction{},
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

// fk is the normalized projection of a BelongsTo relationship onto a
// concrete ALTER TABLE ADD CONSTRAINT statement.
type fk struct {
	name, table, col, refTable, refCol, onDelete, onUpdate string
}

// collectFKs walks every model via the GORM schema parser and projects each
// BelongsTo relationship into an installable fk record. Source of truth is
// the struct tag — renaming a field or column can no longer desynchronize
// the installer from the schema.
//
// Defaults when the `constraint:` clause is absent on a tag:
//   - ON DELETE: SET NULL when the FK column is nullable, else RESTRICT.
//     Matches the prior hardcoded intent and refuses to default to CASCADE
//     (which should always be explicit on a destructive action).
//   - ON UPDATE: CASCADE. PK mutations are vanishingly rare with UUIDv7
//     surrogates; cascading is the safe default.
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
					// Real composite FKs would collide here. The schema
					// uses single-column UUID PKs everywhere, so a hit
					// indicates a duplicate relationship declaration.
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

	// Deterministic order — DDL diffs across boots stay reviewable.
	sort.Slice(out, func(i, j int) bool { return out[i].name < out[j].name })
	return out, nil
}

// parseConstraintTag extracts OnDelete / OnUpdate from GORM's compact
// constraint syntax: "OnUpdate:CASCADE,OnDelete:SET NULL". Tolerant of
// case and whitespace. Unknown actions pass through verbatim — Postgres
// rejects them at ALTER TABLE time, which is the correct failure mode
// (loud, immediate, with the offending tag named in the error).
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

// constraintName produces a stable, ≤63-byte (Postgres NAMEDATALEN-1)
// constraint identifier. Strips a trailing "_id" for readability:
// (employees, company_id) → fk_employees_company.
func constraintName(table, col string) string {
	name := fmt.Sprintf("fk_%s_%s", table, strings.TrimSuffix(col, "_id"))
	if len(name) > 63 {
		name = name[:63] // collisions surface in the seen-map dup check
	}
	return name
}

// MigrateForeignKeys installs FK constraints after every table exists.
// Required because postgre.go opens GORM with
// DisableForeignKeyConstraintWhenMigrating: true to break the
// companies↔employees cycle.
//
// DEFERRABLE INITIALLY IMMEDIATE lets a seeder run
// `SET CONSTRAINTS ALL DEFERRED` inside a tx when inserting circularly
// referenced rows (e.g. create company, then its manager employee).
//
// Idempotent via pg_constraint lookup — Postgres has no
// `ADD CONSTRAINT IF NOT EXISTS`, so each statement is wrapped in a
// PL/pgSQL guard.
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

// MigrateIndexes applies indexes that GORM struct tags can't cleanly
// express — Postgres-specific GIN on TEXT[] columns, partial / functional
// indexes.
//
// Trade-offs:
//   - GIN is larger and slower to update than B-tree but the only sane
//     choice for `array @> ARRAY[...]` and `&&` containment used by
//     role/tag filters.
//   - Trigram index on company.name is optional; uncomment if substring
//     search ("ILIKE '%foo%'") is exposed on the listing UI, after
//     `CREATE EXTENSION IF NOT EXISTS pg_trgm`.
func MigrateIndexes(db *gorm.DB) error {
	stmts := []string{
		`CREATE INDEX IF NOT EXISTS idx_employees_roles_gin
		 ON employees USING GIN (roles)`,

		`CREATE INDEX IF NOT EXISTS idx_projects_tags_gin
		 ON projects USING GIN (tags)`,

		`CREATE INDEX IF NOT EXISTS idx_statements_contract_status
		 ON status_statements (contract_id, status, sequence_no DESC)
		 WHERE deleted_at IS NULL`,

		`CREATE INDEX IF NOT EXISTS idx_projects_status_priority
		 ON projects (company_id, status, priority)
		 WHERE deleted_at IS NULL`,

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
