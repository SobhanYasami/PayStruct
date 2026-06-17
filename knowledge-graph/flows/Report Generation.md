---
tags: [flow, report, excel]
updated: 2026-06-15
---

# Report Generation — Excel Statement Export

Endpoint: `GET /statements/:id/report`  
Handler: `ReportHandler.StatementReport` → `ReportService.Build()`  
Library: `github.com/xuri/excelize/v2` v2.10.1

## Output

Streams `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.  
Filename: `statement-{contract_no}-{sequence_no}-{jalali_issued_on}.xlsx`  
Example: `statement-1404-3-1405-03-25.xlsx`

## Data Loaded

`ReportService.load()` eagerly fetches:
- `InterimStatement` with `WorkDoneItems`, `ExtraWorkItems`, `DeductionItems`
- Parent `Contract` → `Project`, `Contractor`
- Previous cumulative gross (sum of all approved/submitted statements before this one)
- `LineItemMap`: contract line items indexed by UUID

## Sheet Sections

| Section | Function | Content |
|---------|----------|---------|
| Header | `writeHeaderSection` | contract no, project name, contractor, period dates, gross_budget, sequence no |
| Work Done | `writeItemTable` | BoQ item rows with qty/unit/price/amount |
| Extra Work | `writeExtraTable` | extra work items |
| Deductions | `writeDeductionTable` | custom deduction lines |
| Financial Summary | `writeFinancialSummary` | retention, advance, VAT, social_sec, LD, net |
| Signatures | `writeSignatures` | signature block with today's Jalali date |

## Persian Formatting

All output is fully Persianised:
- **Numbers**: `toPersianDigits(s)` — maps ASCII `0-9` to `۰-۹`
- **Thousands separator**: `٬` (U+066C Arabic Thousands Separator)
- **Decimal separator**: `٫` (U+066B Arabic Decimal Separator)
- **Dates**: custom `gregorianToJalali()` → 33-year cycle algorithm; verified 2026-06-15 → 1405/03/25
- **Percent**: `fmtPersianPct()` — uses `٫` + `٪` (U+066A)
- **Filename**: `jalaliDateASCII()` — same algorithm but keeps ASCII digits for filesystem safety

## Go Helpers (all in `report_service.go`)

```go
toPersianDigits(s string) string
gregorianToJalali(gy, gm, gd int) (jy, jm, jd int)
jalaliDate(t time.Time) string          // Persian digits
jalaliDateASCII(t time.Time) string     // ASCII digits for filenames
fmtPersianNum(d decimal.Decimal) string // ٬ separator, ٫ decimal
fmtPersianPct(f float64) string         // ٫ decimal + ٪ suffix
```

## Frontend Trigger

Statement detail page → "دانلود گزارش" button → `GET /statements/:id/report` with auth header.  
Response streamed as file download.
