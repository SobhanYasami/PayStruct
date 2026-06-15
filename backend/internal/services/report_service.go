package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	model "github.com/sobhan-yasami/docs-db-panel/internal/models"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ReportService struct{ db *gorm.DB }

func NewReportService(db *gorm.DB) *ReportService { return &ReportService{db: db} }

type reportData struct {
	Stmt         *model.InterimStatement
	Contract     *model.Contract
	Contractor   *model.Contractor
	Project      *model.Project
	PrevCumGross decimal.Decimal
	LineItemMap  map[uuid.UUID]*model.ContractLineItem
}

// Build generates the Excel report for a given statement ID.
// Returns the workbook, suggested filename, and any error.
func (s *ReportService) Build(ctx context.Context, stmtID string) (*excelize.File, string, error) {
	d, err := s.load(ctx, stmtID)
	if err != nil {
		return nil, "", err
	}
	f, err := buildExcel(d)
	if err != nil {
		return nil, "", &ServiceError{Message: "Excel generation failed: " + err.Error(), Code: 500}
	}
	name := fmt.Sprintf("statement-%s-%d-%s.xlsx",
		strings.ReplaceAll(d.Contract.ContractNo, "/", "-"),
		d.Stmt.SequenceNo,
		jalaliDateASCII(d.Stmt.IssuedOn),
	)
	return f, name, nil
}

func (s *ReportService) load(ctx context.Context, stmtID string) (*reportData, error) {
	uid, err := uuid.Parse(stmtID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid statement ID", Code: 400}
	}

	var stmt model.InterimStatement
	if err := s.db.WithContext(ctx).
		Preload("WorkDoneItems").
		Preload("ExtraWorkItems").
		Preload("DeductionItems").
		First(&stmt, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Statement not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}

	var ct model.Contract
	if err := s.db.WithContext(ctx).First(&ct, "id = ?", stmt.ContractID).Error; err != nil {
		return nil, &ServiceError{Message: "Contract not found", Code: 500}
	}

	var contractor model.Contractor
	s.db.WithContext(ctx).First(&contractor, "id = ?", ct.ContractorID)

	var project model.Project
	s.db.WithContext(ctx).First(&project, "id = ?", ct.ProjectID)

	var lineItems []model.ContractLineItem
	s.db.WithContext(ctx).Where("contract_id = ?", ct.ID).Order("sort_order ASC").Find(&lineItems)
	liMap := make(map[uuid.UUID]*model.ContractLineItem, len(lineItems))
	for i := range lineItems {
		liMap[lineItems[i].ID] = &lineItems[i]
	}

	// Sum gross+extra of all prior statements in the same contract.
	var prevCum decimal.Decimal
	s.db.WithContext(ctx).Model(&model.InterimStatement{}).
		Where("contract_id = ? AND sequence_no < ?", ct.ID, stmt.SequenceNo).
		Select("COALESCE(SUM(gross_amount + extra_amount), 0)").
		Scan(&prevCum)

	return &reportData{
		Stmt:         &stmt,
		Contract:     &ct,
		Contractor:   &contractor,
		Project:      &project,
		PrevCumGross: prevCum,
		LineItemMap:  liMap,
	}, nil
}

// ─── Excel builder ────────────────────────────────────────────────────────────

const sheetName = "صورت وضعیت"

type styles struct {
	title      int
	sectionHdr int
	tableHdr   int
	label      int
	value      int
	data       int
	dataNum    int
	summaryLbl int
	summaryAmt int
	summaryNot int
	signLabel  int
	signBox    int
}

func strPtr(s string) *string { return &s }

func buildExcel(d *reportData) (*excelize.File, error) {
	f := excelize.NewFile()
	f.SetSheetName("Sheet1", sheetName)

	rtlTrue := true
	if err := f.SetSheetView(sheetName, 0, &excelize.ViewOptions{RightToLeft: &rtlTrue}); err != nil {
		return nil, err
	}

	// Column widths: A(5), B(32), C(16), D(22), E(26)
	for col, w := range map[string]float64{"A": 5, "B": 32, "C": 16, "D": 22, "E": 26} {
		f.SetColWidth(sheetName, col, col, w)
	}

	st, err := createStyles(f)
	if err != nil {
		return nil, err
	}

	row := 1
	row = writeTitle(f, d, st, row)
	row = writeHeaderSection(f, d, st, row)
	row++
	row = writeItemTable(f, "جدول کارکرد", d.Stmt.WorkDoneItems, d.LineItemMap, d.Contract.GrossBudget, st, row)
	row++
	row = writeExtraTable(f, d.Stmt.ExtraWorkItems, st, row)
	row++
	row = writeDeductionTable(f, d.Stmt.DeductionItems, st, row)
	row++
	row = writeFinancialSummary(f, d, st, row)
	row++
	writeSignatures(f, st, row)

	return f, nil
}

func cell(col string, row int) string { return fmt.Sprintf("%s%d", col, row) }
func mergeRange(f *excelize.File, from, to string) {
	f.MergeCell(sheetName, from, to)
}
func setStyle(f *excelize.File, from, to string, style int) {
	f.SetCellStyle(sheetName, from, to, style)
}
func setValue(f *excelize.File, c string, v any) {
	f.SetCellValue(sheetName, c, v)
}

func writeTitle(f *excelize.File, d *reportData, st styles, row int) int {
	f.SetRowHeight(sheetName, row, 28)
	mergeRange(f, cell("A", row), cell("E", row))
	title := fmt.Sprintf("صورت وضعیت شماره %d  —  قرارداد %s", d.Stmt.SequenceNo, d.Contract.ContractNo)
	setValue(f, cell("A", row), title)
	setStyle(f, cell("A", row), cell("E", row), st.title)
	return row + 1
}

func writeHeaderSection(f *excelize.File, d *reportData, st styles, row int) int {
	type hRow struct{ leftLabel, leftVal, rightLabel, rightVal string }

	ct := d.Contract
	tr := d.Contractor
	proj := d.Project
	stmt := d.Stmt

	contractorName := tr.DisplayName
	contractorType := "حقیقی"
	if tr.Type == "company" {
		contractorType = "حقوقی"
	}
	nationalID := tr.NationalID
	if nationalID == "" {
		nationalID = "—"
	}
	taxID := ""
	if tr.TaxID != nil {
		taxID = *tr.TaxID
	}
	if taxID == "" {
		taxID = "—"
	}

	startDate := "—"
	if ct.StartsOn != nil {
		startDate = jalaliDate(*ct.StartsOn)
	}
	endDate := "—"
	if ct.EndsOn != nil {
		endDate = jalaliDate(*ct.EndsOn)
	}

	durationDays := "—"
	if ct.StartsOn != nil && ct.EndsOn != nil {
		days := int(ct.EndsOn.Sub(*ct.StartsOn).Hours() / 24)
		durationDays = toPersianDigits(fmt.Sprintf("%d", days)) + " روز"
	}

	prevPct := "—"
	if stmt.PrevProgressPct != nil {
		prevPct = fmtPersianPct(mustFloat64(stmt.PrevProgressPct))
	}
	currPct := "—"
	if stmt.ProgressPct != nil {
		currPct = fmtPersianPct(mustFloat64(stmt.ProgressPct))
	}
	periodPct := "—"
	if stmt.PrevProgressPct != nil && stmt.ProgressPct != nil {
		diff := mustFloat64(stmt.ProgressPct) - mustFloat64(stmt.PrevProgressPct)
		periodPct = fmtPersianPct(diff)
	}

	rows := []hRow{
		{"نام و نام خانوادگی / شرکت:", contractorName, "شماره قرارداد:", ct.ContractNo},
		{"نوع پیمانکار:", contractorType, "تاریخ شروع قرارداد:", startDate},
		{"شناسه تفضیلی پیمانکار:", taxID, "مدت قرارداد:", durationDays},
		{"شناسه ملی پیمانکار:", nationalID, "تاریخ پایان قرارداد:", endDate},
		{"مبلغ ناخالص قرارداد:", fmtPersianNum(ct.GrossBudget) + " " + ct.Currency, "از تاریخ کارکرد:", jalaliDate(stmt.PeriodStart)},
		{"پروژه:", proj.Name, "تا تاریخ کارکرد:", jalaliDate(stmt.PeriodEnd)},
		{"درصد پیشرفت تا صورت وضعیت قبلی:", prevPct, "شماره صورت وضعیت:", toPersianDigits(fmt.Sprintf("%d", stmt.SequenceNo))},
		{"درصد پیشرفت تا صورت وضعیت جدید:", currPct, "تاریخ صدور:", jalaliDate(stmt.IssuedOn)},
		{"میزان پیشرفت این صورت وضعیت:", periodPct, "", ""},
	}

	for _, r := range rows {
		f.SetRowHeight(sheetName, row, 18)
		// right panel: cols D-E
		setValue(f, cell("D", row), r.rightLabel)
		setValue(f, cell("E", row), r.rightVal)
		setStyle(f, cell("D", row), cell("D", row), st.label)
		setStyle(f, cell("E", row), cell("E", row), st.value)
		// left panel: cols A-B-C  (label in A:B merged, value in C)
		mergeRange(f, cell("A", row), cell("B", row))
		setValue(f, cell("A", row), r.leftLabel)
		setValue(f, cell("C", row), r.leftVal)
		setStyle(f, cell("A", row), cell("B", row), st.label)
		setStyle(f, cell("C", row), cell("C", row), st.value)
		row++
	}
	return row
}

func writeSectionTitle(f *excelize.File, title string, st styles, row int) int {
	f.SetRowHeight(sheetName, row, 22)
	mergeRange(f, cell("A", row), cell("E", row))
	setValue(f, cell("A", row), title)
	setStyle(f, cell("A", row), cell("E", row), st.sectionHdr)
	return row + 1
}

func writeTableHeader(f *excelize.File, st styles, row int) int {
	f.SetRowHeight(sheetName, row, 18)
	setValue(f, cell("A", row), "ردیف")
	setValue(f, cell("B", row), "شرح آیتم")
	setValue(f, cell("C", row), "درصد پیشرفت")
	setValue(f, cell("D", row), "قیمت کل")
	mergeRange(f, cell("D", row), cell("E", row))
	setStyle(f, cell("A", row), cell("E", row), st.tableHdr)
	return row + 1
}

func writeItemTable(f *excelize.File, title string, items []model.WorkDoneItem, liMap map[uuid.UUID]*model.ContractLineItem, _ decimal.Decimal, st styles, row int) int {
	row = writeSectionTitle(f, title, st, row)
	row = writeTableHeader(f, st, row)

	for i, item := range items {
		f.SetRowHeight(sheetName, row, 18)
		pct := ""
		if item.LineItemID != nil {
			if li, ok := liMap[*item.LineItemID]; ok && li.Quantity.GreaterThan(decimal.Zero) {
				p := item.Quantity.Div(li.Quantity).Mul(decimal.NewFromInt(100))
				s := fmt.Sprintf("%.1f%%", mustFloat64Decimal(p))
				s = strings.ReplaceAll(s, ".", "٫")
				pct = toPersianDigits(s)
			}
		}
		setValue(f, cell("A", row), toPersianDigits(fmt.Sprintf("%d", i+1)))
		setValue(f, cell("B", row), item.Description)
		setValue(f, cell("C", row), pct)
		setValue(f, cell("D", row), fmtPersianNum(item.Amount))
		mergeRange(f, cell("D", row), cell("E", row))
		setStyle(f, cell("A", row), cell("A", row), st.data)
		setStyle(f, cell("B", row), cell("B", row), st.data)
		setStyle(f, cell("C", row), cell("C", row), st.data)
		setStyle(f, cell("D", row), cell("E", row), st.dataNum)
		row++
	}

	if len(items) == 0 {
		f.SetRowHeight(sheetName, row, 18)
		mergeRange(f, cell("A", row), cell("E", row))
		setValue(f, cell("A", row), "— بدون آیتم —")
		setStyle(f, cell("A", row), cell("E", row), st.data)
		row++
	}

	return row
}

func writeExtraTable(f *excelize.File, items []model.ExtraWorkItem, st styles, row int) int {
	row = writeSectionTitle(f, "جدول اضافه کاری و دستورها", st, row)
	row = writeTableHeader(f, st, row)

	for i, item := range items {
		f.SetRowHeight(sheetName, row, 18)
		setValue(f, cell("A", row), toPersianDigits(fmt.Sprintf("%d", i+1)))
		setValue(f, cell("B", row), item.Description)
		setValue(f, cell("C", row), "۱۰۰٪")
		setValue(f, cell("D", row), fmtPersianNum(item.Amount))
		mergeRange(f, cell("D", row), cell("E", row))
		setStyle(f, cell("A", row), cell("A", row), st.data)
		setStyle(f, cell("B", row), cell("B", row), st.data)
		setStyle(f, cell("C", row), cell("C", row), st.data)
		setStyle(f, cell("D", row), cell("E", row), st.dataNum)
		row++
	}

	if len(items) == 0 {
		f.SetRowHeight(sheetName, row, 18)
		mergeRange(f, cell("A", row), cell("E", row))
		setValue(f, cell("A", row), "— بدون آیتم —")
		setStyle(f, cell("A", row), cell("E", row), st.data)
		row++
	}

	return row
}

func writeDeductionTable(f *excelize.File, items []model.StatementDeductionItem, st styles, row int) int {
	row = writeSectionTitle(f, "جدول کسور (خدمات کارگاهی، جرائم و خسارات)", st, row)
	row = writeTableHeader(f, st, row)

	for i, item := range items {
		f.SetRowHeight(sheetName, row, 18)
		setValue(f, cell("A", row), toPersianDigits(fmt.Sprintf("%d", i+1)))
		setValue(f, cell("B", row), item.Description)
		setValue(f, cell("C", row), "")
		setValue(f, cell("D", row), fmtPersianNum(item.Amount))
		mergeRange(f, cell("D", row), cell("E", row))
		setStyle(f, cell("A", row), cell("A", row), st.data)
		setStyle(f, cell("B", row), cell("B", row), st.data)
		setStyle(f, cell("C", row), cell("C", row), st.data)
		setStyle(f, cell("D", row), cell("E", row), st.dataNum)
		row++
	}

	if len(items) == 0 {
		f.SetRowHeight(sheetName, row, 18)
		mergeRange(f, cell("A", row), cell("E", row))
		setValue(f, cell("A", row), "— بدون کسر —")
		setStyle(f, cell("A", row), cell("E", row), st.data)
		row++
	}

	return row
}

func writeFinancialSummary(f *excelize.File, d *reportData, st styles, row int) int {
	stmt := d.Stmt
	ct := d.Contract
	bpsDivisor := decimal.NewFromInt(10000)

	periodGross := stmt.GrossAmount.Add(stmt.ExtraAmount)
	currCum := d.PrevCumGross.Add(periodGross)

	// Legal deductions
	retentionRate := decimal.NewFromInt(int64(ct.PerformanceBondPctBps)).Div(bpsDivisor).Mul(decimal.NewFromInt(100))
	socialRate := decimal.NewFromInt(int64(ct.SocialSecurityPctBps)).Div(bpsDivisor).Mul(decimal.NewFromInt(100))
	vatRate := decimal.NewFromInt(int64(ct.VatPctBps)).Div(bpsDivisor).Mul(decimal.NewFromInt(100))
	advanceRate := decimal.NewFromInt(int64(ct.AdvancePctBps)).Div(bpsDivisor).Mul(decimal.NewFromInt(100))

	row = writeSectionTitle(f, "جدول خلاصه مالی", st, row)

	// Table header
	f.SetRowHeight(sheetName, row, 18)
	setValue(f, cell("A", row), "ردیف")
	setValue(f, cell("B", row), "شرح")
	setValue(f, cell("C", row), "مبلغ ("+ct.Currency+")")
	setValue(f, cell("D", row), "توضیحات")
	mergeRange(f, cell("D", row), cell("E", row))
	setStyle(f, cell("A", row), cell("E", row), st.tableHdr)
	row++

	type summaryRow struct{ label, amount, notes string }
	summaryRows := []summaryRow{
		{"مبلغ ناخالص کارکرد تجمعی فعلی", fmtPersianNum(currCum), ""},
		{"مبلغ ناخالص کارکرد تجمعی قبلی", fmtPersianNum(d.PrevCumGross), ""},
		{"مبلغ ناخالص کارکرد دوره", fmtPersianNum(periodGross), ""},
	}

	for i, r := range summaryRows {
		f.SetRowHeight(sheetName, row, 18)
		setValue(f, cell("A", row), toPersianDigits(fmt.Sprintf("%d", i+1)))
		setValue(f, cell("B", row), r.label)
		setValue(f, cell("C", row), r.amount)
		mergeRange(f, cell("D", row), cell("E", row))
		setValue(f, cell("D", row), r.notes)
		setStyle(f, cell("A", row), cell("A", row), st.summaryLbl)
		setStyle(f, cell("B", row), cell("B", row), st.summaryLbl)
		setStyle(f, cell("C", row), cell("C", row), st.summaryAmt)
		setStyle(f, cell("D", row), cell("E", row), st.summaryNot)
		row++
	}

	// Legal deductions section
	f.SetRowHeight(sheetName, row, 20)
	mergeRange(f, cell("A", row), cell("E", row))
	setValue(f, cell("A", row), "کسورات قانونی")
	setStyle(f, cell("A", row), cell("E", row), st.sectionHdr)
	row++

	legalDeductions := []summaryRow{
		{
			"سپرده حسن انجام کار (ضمانت اجرا)",
			fmtPersianNum(stmt.RetentionAmount),
			"با نرخ " + fmtPersianPct(mustFloat64Decimal(retentionRate)) + " مطابق قرارداد",
		},
		{
			"سپرده حق بیمه تأمین اجتماعی",
			fmtPersianNum(stmt.SocialSecurityAmount),
			"با نرخ " + fmtPersianPct(mustFloat64Decimal(socialRate)) + " مطابق قرارداد",
		},
	}
	for i, r := range legalDeductions {
		f.SetRowHeight(sheetName, row, 18)
		setValue(f, cell("A", row), toPersianDigits(fmt.Sprintf("%d", i+1)))
		setValue(f, cell("B", row), r.label)
		setValue(f, cell("C", row), r.amount)
		mergeRange(f, cell("D", row), cell("E", row))
		setValue(f, cell("D", row), r.notes)
		setStyle(f, cell("A", row), cell("A", row), st.summaryLbl)
		setStyle(f, cell("B", row), cell("B", row), st.summaryLbl)
		setStyle(f, cell("C", row), cell("C", row), st.summaryAmt)
		setStyle(f, cell("D", row), cell("E", row), st.summaryNot)
		row++
	}

	// Other deductions
	f.SetRowHeight(sheetName, row, 20)
	mergeRange(f, cell("A", row), cell("E", row))
	setValue(f, cell("A", row), "سایر کسورات")
	setStyle(f, cell("A", row), cell("E", row), st.sectionHdr)
	row++

	advanceNote := "با نرخ " + fmtPersianPct(mustFloat64Decimal(advanceRate)) + " مطابق قرارداد"
	f.SetRowHeight(sheetName, row, 18)
	setValue(f, cell("A", row), "۱")
	setValue(f, cell("B", row), "پیش‌پرداخت – علی‌الحساب")
	setValue(f, cell("C", row), fmtPersianNum(stmt.AdvanceRecovered))
	mergeRange(f, cell("D", row), cell("E", row))
	setValue(f, cell("D", row), advanceNote)
	setStyle(f, cell("A", row), cell("A", row), st.summaryLbl)
	setStyle(f, cell("B", row), cell("B", row), st.summaryLbl)
	setStyle(f, cell("C", row), cell("C", row), st.summaryAmt)
	setStyle(f, cell("D", row), cell("E", row), st.summaryNot)
	row++

	// Custom deduction items
	for i, item := range stmt.DeductionItems {
		f.SetRowHeight(sheetName, row, 18)
		setValue(f, cell("A", row), toPersianDigits(fmt.Sprintf("%d", i+2)))
		setValue(f, cell("B", row), item.Description)
		setValue(f, cell("C", row), fmtPersianNum(item.Amount))
		mergeRange(f, cell("D", row), cell("E", row))
		setValue(f, cell("D", row), "")
		setStyle(f, cell("A", row), cell("A", row), st.summaryLbl)
		setStyle(f, cell("B", row), cell("B", row), st.summaryLbl)
		setStyle(f, cell("C", row), cell("C", row), st.summaryAmt)
		setStyle(f, cell("D", row), cell("E", row), st.summaryNot)
		row++
	}

	// Other additions (VAT)
	f.SetRowHeight(sheetName, row, 20)
	mergeRange(f, cell("A", row), cell("E", row))
	setValue(f, cell("A", row), "سایر اضافات")
	setStyle(f, cell("A", row), cell("E", row), st.sectionHdr)
	row++

	vatNote := "با نرخ " + fmtPersianPct(mustFloat64Decimal(vatRate)) + " مصوب دولت"
	f.SetRowHeight(sheetName, row, 18)
	setValue(f, cell("A", row), "۱")
	setValue(f, cell("B", row), "مالیات بر ارزش افزوده")
	setValue(f, cell("C", row), fmtPersianNum(stmt.VatAmount))
	mergeRange(f, cell("D", row), cell("E", row))
	setValue(f, cell("D", row), vatNote)
	setStyle(f, cell("A", row), cell("A", row), st.summaryLbl)
	setStyle(f, cell("B", row), cell("B", row), st.summaryLbl)
	setStyle(f, cell("C", row), cell("C", row), st.summaryAmt)
	setStyle(f, cell("D", row), cell("E", row), st.summaryNot)
	row++

	// Net payable
	f.SetRowHeight(sheetName, row, 22)
	mergeRange(f, cell("A", row), cell("B", row))
	setValue(f, cell("A", row), "خالص پرداختی")
	setValue(f, cell("C", row), fmtPersianNum(stmt.NetAmount))
	mergeRange(f, cell("D", row), cell("E", row))
	setValue(f, cell("D", row), "مبلغ پرداختی نهایی به پیمانکار")
	setStyle(f, cell("A", row), cell("B", row), st.sectionHdr)
	setStyle(f, cell("C", row), cell("C", row), st.summaryAmt)
	setStyle(f, cell("D", row), cell("E", row), st.summaryNot)
	row++

	return row
}

func writeSignatures(f *excelize.File, st styles, row int) {
	f.SetRowHeight(sheetName, row, 20)
	mergeRange(f, cell("A", row), cell("E", row))
	setValue(f, cell("A", row), "محل امضاها")
	setStyle(f, cell("A", row), cell("E", row), st.sectionHdr)
	row++

	// Row 1: labels
	f.SetRowHeight(sheetName, row, 18)
	labels := []string{"مدیر عامل", "مدیر مالی", "مدیر حقوقی", "مدیر فنی", "پیمانکار"}
	cols := []string{"A", "B", "C", "D", "E"}
	for i, lbl := range labels {
		setValue(f, cell(cols[i], row), lbl)
		setStyle(f, cell(cols[i], row), cell(cols[i], row), st.signLabel)
	}
	row++

	// Row 2: signature date
	f.SetRowHeight(sheetName, row, 18)
	dateLbl := "تاریخ: " + jalaliDate(time.Now())
	for _, col := range cols {
		setValue(f, cell(col, row), dateLbl)
		setStyle(f, cell(col, row), cell(col, row), st.signBox)
	}
	row++

	// Row 3: blank signing area
	f.SetRowHeight(sheetName, row, 60)
	for _, col := range cols {
		setValue(f, cell(col, row), "")
		setStyle(f, cell(col, row), cell(col, row), st.signBox)
	}
}

// ─── Style definitions ────────────────────────────────────────────────────────

func createStyles(f *excelize.File) (styles, error) {
	var st styles
	var err error

	border := []excelize.Border{
		{Type: "left", Color: "8EA8C3", Style: 1},
		{Type: "right", Color: "8EA8C3", Style: 1},
		{Type: "top", Color: "8EA8C3", Style: 1},
		{Type: "bottom", Color: "8EA8C3", Style: 1},
	}
	thickBorder := []excelize.Border{
		{Type: "left", Color: "1B3A6B", Style: 2},
		{Type: "right", Color: "1B3A6B", Style: 2},
		{Type: "top", Color: "1B3A6B", Style: 2},
		{Type: "bottom", Color: "1B3A6B", Style: 2},
	}

	rtl := func(h string) *excelize.Alignment {
		return &excelize.Alignment{Horizontal: h, Vertical: "center", ReadingOrder: 2, WrapText: true}
	}

	numFmt := strPtr("#,##0.##")

	// Title: deep navy bg, white bold 13pt
	st.title, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 13, Color: "FFFFFF", Family: "Arial"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1B3A6B"}, Pattern: 1},
		Alignment: rtl("center"),
		Border:    thickBorder,
	})
	if err != nil {
		return st, err
	}

	// Section header: medium blue, white bold 11pt
	st.sectionHdr, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 11, Color: "FFFFFF", Family: "Arial"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"2B6CB0"}, Pattern: 1},
		Alignment: rtl("right"),
		Border:    border,
	})
	if err != nil {
		return st, err
	}

	// Table header: light blue fill, dark bold 10pt
	st.tableHdr, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "1B3A6B", Family: "Arial"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"BEE3F8"}, Pattern: 1},
		Alignment: rtl("center"),
		Border:    border,
	})
	if err != nil {
		return st, err
	}

	// Label: light gray bg, bold dark text
	st.label, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "2D3748", Family: "Arial"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"EDF2F7"}, Pattern: 1},
		Alignment: rtl("right"),
		Border:    border,
	})
	if err != nil {
		return st, err
	}

	// Value: white bg, normal text
	st.value, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Color: "2D3748", Family: "Arial"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment: rtl("right"),
		Border:    border,
	})
	if err != nil {
		return st, err
	}

	// Data row text
	st.data, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Color: "2D3748", Family: "Arial"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment: rtl("right"),
		Border:    border,
	})
	if err != nil {
		return st, err
	}

	// Data row numeric (green, right→left number)
	st.dataNum, err = f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Size: 10, Color: "276749", Family: "Arial"},
		Fill:         excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment:    &excelize.Alignment{Horizontal: "right", Vertical: "center", ReadingOrder: 2},
		Border:       border,
		CustomNumFmt: numFmt,
	})
	if err != nil {
		return st, err
	}

	// Summary label: very light blue
	st.summaryLbl, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Color: "2D3748", Family: "Arial"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"EBF8FF"}, Pattern: 1},
		Alignment: rtl("right"),
		Border:    border,
	})
	if err != nil {
		return st, err
	}

	// Summary amount: teal-green bold
	st.summaryAmt, err = f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Bold: true, Size: 10, Color: "276749", Family: "Arial"},
		Fill:         excelize.Fill{Type: "pattern", Color: []string{"EBF8FF"}, Pattern: 1},
		Alignment:    &excelize.Alignment{Horizontal: "right", Vertical: "center", ReadingOrder: 2},
		Border:       border,
		CustomNumFmt: numFmt,
	})
	if err != nil {
		return st, err
	}

	// Summary notes
	st.summaryNot, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 9, Color: "718096", Family: "Arial", Italic: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"EBF8FF"}, Pattern: 1},
		Alignment: rtl("right"),
		Border:    border,
	})
	if err != nil {
		return st, err
	}

	// Signature label
	st.signLabel, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 9, Color: "2D3748", Family: "Arial"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"EDF2F7"}, Pattern: 1},
		Alignment: rtl("center"),
		Border:    border,
	})
	if err != nil {
		return st, err
	}

	// Signature box
	st.signBox, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 9, Color: "718096", Family: "Arial"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "top", ReadingOrder: 2},
		Border:    border,
	})
	if err != nil {
		return st, err
	}

	return st, nil
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func mustFloat64(d *decimal.Decimal) float64 {
	if d == nil {
		return 0
	}
	f, _ := d.Float64()
	return f
}

func mustFloat64Decimal(d decimal.Decimal) float64 {
	f, _ := d.Float64()
	return f
}

// ─── Persian/Jalali helpers ───────────────────────────────────────────────────

var persianDigits = [10]rune{'۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'}

func toPersianDigits(s string) string {
	var b strings.Builder
	b.Grow(len(s) * 2)
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(persianDigits[r-'0'])
		} else {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// gregorianToJalali converts a Gregorian date to Jalali (Solar Hijri).
// Valid for dates in the range roughly 1300-1500 Jalali.
func gregorianToJalali(gy, gm, gd int) (jy, jm, jd int) {
	g := []int{0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334}

	gy2 := gy - 1600
	gd2 := gd - 1

	gDayNo := 365*gy2 + (gy2+3)/4 - (gy2+99)/100 + (gy2+399)/400
	gDayNo += g[gm-1]
	if gm > 2 && ((gy%4 == 0 && gy%100 != 0) || gy%400 == 0) {
		gDayNo++
	}
	gDayNo += gd2

	jDayNo := gDayNo - 79

	jNp := jDayNo / 12053
	jDayNo = jDayNo % 12053

	jy = 979 + 33*jNp + 4*(jDayNo/1461)
	jDayNo = jDayNo % 1461

	if jDayNo >= 366 {
		jy += (jDayNo - 1) / 365
		jDayNo = (jDayNo - 1) % 365
	}

	months := []int{31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30}
	for i := 0; i < 11; i++ {
		if jDayNo < months[i] {
			jm = i + 1
			jd = jDayNo + 1
			return
		}
		jDayNo -= months[i]
	}
	jm = 12
	jd = jDayNo + 1
	return
}

// jalaliDate formats a time.Time as a Jalali date string with Persian numerals.
func jalaliDate(t time.Time) string {
	jy, jm, jd := gregorianToJalali(t.Year(), int(t.Month()), t.Day())
	return toPersianDigits(fmt.Sprintf("%d/%02d/%02d", jy, jm, jd))
}

// jalaliDateASCII formats a Jalali date with ASCII digits (for filenames).
func jalaliDateASCII(t time.Time) string {
	jy, jm, jd := gregorianToJalali(t.Year(), int(t.Month()), t.Day())
	return fmt.Sprintf("%d-%d-%d", jy, jm, jd)
}

// fmtPersianNum formats a decimal.Decimal as a Persian-digit string with comma separators.
func fmtPersianNum(d decimal.Decimal) string {
	f, _ := d.Float64()
	s := fmt.Sprintf("%.0f", f)
	n := len(s)
	if n <= 3 {
		return toPersianDigits(s)
	}
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (n-i)%3 == 0 {
			b.WriteRune('٬') // Persian thousands separator
		}
		b.WriteRune(c)
	}
	return toPersianDigits(b.String())
}

// fmtPersianPct formats a float as a Persian percentage string, e.g. "۱۲٫۵۰٪".
func fmtPersianPct(f float64) string {
	s := fmt.Sprintf("%.2f%%", f)
	s = strings.ReplaceAll(s, ".", "٫")
	return toPersianDigits(s)
}
