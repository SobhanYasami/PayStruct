# `internal/model`

Persistent domain layer for PayStruct. Schema is derived from `EER Diagram 1405.01.09.drawio`.

## Required modules

```
go get github.com/google/uuid           # UUIDv7 PKs
go get github.com/lib/pq                # pq.StringArray for TEXT[]
go get github.com/shopspring/decimal    # money — never float
go get gorm.io/gorm gorm.io/driver/postgres
```

## Entity → table map

| Go type           | Table               | Notes                                           |
|-------------------|---------------------|-------------------------------------------------|
| `Company`         | `companies`         | Self-referential (`parent_id`), 1:1 manager FK  |
| `Employee`        | `employees`         | Disjoint `employment_type`, overlap `roles[]`   |
| `Project`         | `projects`          | Owned by Company; parents Contracts             |
| `Contractor`      | `contractors`       | Counterparty on Contract                        |
| `Contract`        | `contracts`         | Project (N:1) + Contractor (N:1)                |
| `StatusStatement` | `status_statements` | Weak entity of Contract; `(contract_id,seq_no)` |
| `WorksDone`       | `works_done`        | Weak; cascades on parent delete                 |
| `ExtraWork`       | `extra_works`       | Weak; cascades                                  |
| `Deduction`       | `deductions`        | Weak; cascades                                  |

## Bootstrap

```go
import (
    "github.com/SobhanYasami/PayStruct/backend/internal/model"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
if err != nil { /* … */ }
if err := model.AutoMigrate(db); err != nil { /* … */ }
```

`AutoMigrate` runs GORM's reflection migration over `AllModels()` and then applies
the bespoke GIN / partial indexes in `MigrateIndexes`. In production swap the
GORM migrator for atlas / goose so DDL is reviewable and reversible.

## Insertion ordering caveats

- `Company.ManagerID` and `Employee.CompanyID` form a soft cycle. Both FKs are
  nullable — insert the company with `manager_id = NULL`, insert the employee,
  then `UPDATE companies SET manager_id = ?`. Wrap in a single transaction.
- `StatusStatement.SequenceNo` is allocated per-contract. Do
  `SELECT … FROM contracts WHERE id = ? FOR UPDATE` before computing the next
  sequence to avoid two concurrent statements claiming the same number until
  the unique index rejects one.

## Specialization mapping

```
Employee
  ├─ disjoint:  employment_type ∈ {official, contractual}        single column + CHECK
  └─ overlap:   roles[] ⊆ {manager, juridical, financial,        TEXT[] + GIN
                            engineering, security}
```

Single-table inheritance was chosen over table-per-subclass because the EER
defines no subclass-distinct attributes today. Add a sibling table only if /
when the subclasses diverge in their fields.

## Money & precision

All currency-bearing columns are `numeric(20,2)` (or `(20,4)` for unit prices /
quantities, rounded to `(20,2)` at the line total). Go-side type is
`shopspring/decimal.Decimal`. Float64 is **not used anywhere**; a single
`0.1 + 0.2` rounding error in a finance app is one too many.

`Contract.RetentionBps` is basis-points × 100 stored as `int16`
(10.00% → 1000) — bypasses decimal arithmetic entirely for a hot per-statement
calculation.

## Status statement aggregates

`status_statements.gross_amount`, `extra_amount`, `deduction_amount`,
`net_amount` are denormalized rollups of the children. Source of truth is the
child rows. Recompute via `(*StatusStatement).Recompute()` before persist, or
attach `AfterSave` hooks to `WorksDone` / `ExtraWork` / `Deduction`.

If rollup contention becomes a problem (write amplification on the parent row),
swap the cached fields for a Postgres materialized view refreshed
`CONCURRENTLY` on demand.
