---
tags: [model, entity]
updated: 2026-06-15
---

# Contractor

Table: `contractors`  
File: `backend/internal/models/contract.go` (top of file)

External counterparty on a [[models/Contract]]. Two subtypes: `individual` (person) or `company` (legal entity).

## Key Fields

| Field | Type | Notes |
|-------|------|-------|
| `type` | varchar(16) | `individual` \| `company` — check constraint |
| `display_name` | varchar(255) | indexed; derived from FirstName+LastName or CompanyName |
| `first_name`, `last_name` | varchar(128) | individual only |
| `company_name` | varchar(255) | company type only |
| `legal_name` | varchar(255) | formal registered name, optional |
| `tax_id` | varchar(64) nullable | unique per value (`idx_contractors_tax`) |
| `registration_no` | varchar(64) nullable | unique per value (`idx_contractors_reg`) |
| `national_id` | varchar(32) | individual identifier |
| `default_currency` | char(3) | default `IRR` |
| `bank_account_json` | jsonb | bank details |
| `contact_json` | jsonb | contact info |
| `rating` | float32 nullable | 0–5 check constraint |
| `company_id` | UUID nullable | optional tenant scoping |

## Search

Frontend `ContractorCombobox` uses debounced `GET /contractors?search=…` (`page=1&limit=30`).  
`display_name` is the indexed field queried.

## Relations

- Optionally belongs to [[models/Company]] (legacy rows have NULL company_id)
- Has many [[models/Contract]]

## RBAC

Any authenticated user can read/write contractors.
