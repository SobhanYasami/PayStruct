# 📋 Contractor Management Portal — Enhanced Specification

> _"A dashboard provides a bird’s eye view of all contractor activities… an intuitive interface helps teams track hours, milestones, and compliance."_ [[6]]

This document outlines a comprehensive, modern contractor management interface and backend logic, going beyond basic CRUD to deliver real business value.

---

## 🧭 Core Principles

1.  **User-Centric Workflows**: Guide users through logical sequences (e.g., create contract → add WBS → submit status) [[4]].
2.  **Real-time Visibility**: Centralized dashboard with key metrics [[14]].
3.  **Proactive Compliance**: Automated alerts for expirations, document renewals, and risk thresholds [[5]].
4.  **Data Integrity**: Robust validation and audit trails [[1]].

---

## 📊 Central Dashboard (Home View)

_Visual contract data is an extremely powerful means to accelerate productivity and decision-making_ [[20]].

| Widget                   | Description                                                                                     | Data Source                      |
| :----------------------- | :---------------------------------------------------------------------------------------------- | :------------------------------- |
| **Contracts Overview**   | Cards: Total Active, Expiring in 30 Days, Over Budget, On Hold                                  | `Contract` table filters         |
| **Financial Summary**    | Charts: Total Contract Value (TCV), Invoiced to Date, Remaining Budget (GrossBudget - Invoiced) | `Contract`, `StatusStatement`    |
| **Top WBS Items**        | Table: Project, Description, % Complete, Variance (Planned vs. Actual Cost)                     | `ContractWBS`, `StatusStatement` |
| **Recent Activity Feed** | Log of: New Contracts, WBS Edits, Status Submissions, Approvals                                 | Audit Log                        |

---

## 📝 Contract Management

### 🆕 Create Contract

_(Guided, multi-step wizard recommended)_

| Section                        | Fields                                                                                                                      | Validation & Enhancements                                                                                                                                                                                 |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Basic Information**          | `FullName`, `LegalEntity`, `PreferentialID`, `NationalID`                                                                   | • Conditional fields: `PreferentialID` required if `LegalEntity=true`<br>• ID fields auto-validate format (e.g., national ID checksum)                                                                    |
| **Contract Details**           | `ContractNo`, `GrossBudget`, `StartDate`, `Duration`, `InsuranceRate`, `PerformanceBond`, `AddedValueTax`, `ScannedFileUrl` | • `EndDate` = `StartDate` + `Duration` (auto-calculated, editable)<br>• `ContractNo` uniqueness check on blur<br>• File upload with virus scan & preview<br>• Rate fields: 0.00%–100.00% range validation |
| **Risk & Compliance** _(New!)_ | `InsuranceExpiryDate`, `BondExpiryDate`, `ComplianceStatus` (enum: Pending/Verified/Expired)                                | • Auto-alerts 60/30/7 days before expiry [[5]]                                                                                                                                                            |

### ♻️ Update Contract

_Track changes in an audit log. Require reason for major edits (e.g., >10% budget change)._

### 🗑️ Delete Contract

_Safeguard: Soft-delete only. Require confirmation & reason. Check for dependent WBS/Statements._

### 🔍 Get & Search Contracts

_Advanced filters:_ Status (Active/Expired/Terminated), Date Range, Budget Range, LegalEntity, Project. Export to CSV/PDF.

---

## 🧱 Work Breakdown Structure (WBS) Management

_A WBS is a "deliverable-oriented hierarchical decomposition of the work to be executed"_ [[23]].

### 🆕 Create/Update ContractWBS

_Enable bulk import (Excel/CSV template)._

| Field                           | Enhancement                                                                                       |
| :------------------------------ | :------------------------------------------------------------------------------------------------ |
| `Description`                   | Support markdown for rich text (e.g., `**Milestone:** Site Prep`)                                 |
| `Unit`, `Quantity`, `UnitPrice` | Auto-calculate `TotalPrice = Quantity * UnitPrice` (client-side + server validation)              |
| `ProjectID`                     | Dropdown filtered by active projects                                                              |
| `ParentWBSItemID`               | _(New!)_ Enable hierarchical nesting (e.g., Phase 1 → Task 1.1) for true project structure [[30]] |

### 📉 WBS Dashboard View

_Tree-grid view showing hierarchy, % complete (from StatusStatements), cost variance, and timeline vs. schedule._

---

## 📈 Status Statement Management

_Critical for progress tracking, invoicing, and risk mitigation._

### 🆕 Create StatusStatement _(Key Enhancement!)_

| Field                       | Type  | Validation                                                                                                                                                     |
| :-------------------------- | :---- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PeriodStart` / `PeriodEnd` | Date  | Must align with contract period; non-overlapping                                                                                                               |
| `WBSItems`                  | Array | Select from contract's WBS. For each:<br>• `PlannedQuantity`, `ActualQuantity`<br>• `PlannedCost`, `ActualCost`<br>• `Progress` (0–100%)<br>• `Remarks` (text) |
| `Attachments`               | Files | Photos, reports, signed timesheets                                                                                                                             |
| `SubmittedBy`               | Auto  | Current user ID                                                                                                                                                |
| `Status`                    | enum  | Draft → Submitted → Approved/Rejected                                                                                                                          |

### ⚙️ Update/Delete StatusStatement

_Rules:_ Drafts editable by submitter. Submitted items require approver role to edit/delete.

### 📊 Get StatusStatements

_Filter by:_ Contract, Date Range, Status (Draft/Submitted/Approved). Show trend charts (cost vs. baseline, progress % over time).

---

## 🛡️ Security & Compliance Features _(New Section)_

| Feature                   | Description                                                                                                |
| :------------------------ | :--------------------------------------------------------------------------------------------------------- |
| **Document Vault**        | Secure storage for IDs, insurance certs, bonds. Auto-alert on expiry [[5]].                                |
| **Audit Trail**           | Log all create/update/delete actions (Who, When, What Changed).                                            |
| **Role-Based Access**     | Roles: Admin, PM, Contractor, Finance. Granular permissions (e.g., Contractor can only see own contracts). |
| **Data Export & Reports** | Pre-built reports: Expiring Contracts, Budget Utilization, Contractor Performance.                         |

---

## 🚀 Recommended Next Steps

1.  **Implement Dashboard First**: Start with the KPI widgets for immediate ROI [[18]].
2.  **Add WBS Hierarchy**: Supports complex projects and better cost tracking [[28]].
3.  **Integrate Approvals Workflow**: For contracts and status statements.
4.  **Mobile Optimization**: Field teams need to submit status/photos on-site [[3]].

This structure transforms your page from a simple data entry form into a strategic management tool, aligning with industry standards for contractor and contract oversight [[6]].
