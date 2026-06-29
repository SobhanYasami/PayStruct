import { apiFetch } from "./client";
import { useAuthStore } from "@/lib/stores/auth";

export interface InterimStatement {
  id: string;
  company_id: string;
  contract_id: string;
  sequence_no: number;
  period_start: string;
  period_end: string;
  issued_on: string;
  status: string;
  currency: string;
  gross_amount: string;
  extra_amount: string;
  deduction_amount: string;
  retention_amount: string;
  advance_recovered: string;
  vat_amount: string;
  social_security_amount: string;
  ld_amount: string;
  net_amount: string;
  prev_progress_pct?: string;
  progress_pct?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Populated only by GET /statements/:id (not list)
  work_done_items?: WorkDoneItem[];
  extra_work_items?: ExtraWorkItem[];
  deduction_items?: DeductionItem[];
}

export interface WorkDoneItem {
  id: string;
  statement_id: string;
  line_item_id?: string;
  line_no: number;
  boq_item_code?: string;
  description: string;
  unit_code?: string;
  quantity: string;
  unit_price: string;
  amount: string;
}

export interface ExtraWorkItem {
  id: string;
  statement_id: string;
  line_no: number;
  description: string;
  unit?: string;
  quantity: string;
  unit_price: string;
  amount: string;
  reason?: string;
  variation_ref?: string;
  approved_by_client: boolean;
  approval_ref?: string;
  created_at: string;
}

export interface DeductionItem {
  id: string;
  statement_id: string;
  line_no: number;
  description: string;
  unit?: string;
  quantity: string;
  unit_price: string;
  amount: string;
  created_at: string;
}

export interface ApprovalEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  from_status: string;
  to_status: string;
  comment?: string;
  created_at: string;
}

export interface TransitionPayload {
  status: string;
  comment?: string;
}

export interface CreateExtraWorkPayload {
  description: string;
  unit?: string;
  quantity: string;
  unit_price: string;
  reason?: string;
  variation_ref?: string;
  approved_by_client?: boolean;
  approval_ref?: string;
}

export interface CreateDeductionPayload {
  description: string;
  unit?: string;
  quantity: string;
  unit_price: string;
}

export interface UpdateDeductionPayload {
  description?: string;
  unit?: string;
  quantity?: string;
  unit_price?: string;
}

export interface SetWorksDonePayload {
  items: { line_item_id: string; quantity_done: string }[];
}

export interface UpdateStatementPayload {
  period_start?: string;
  period_end?: string;
  issued_on?: string;
  notes?: string;
}

interface Envelope<T> { status: string; data: T; message: string }
interface ListPayload<T> { data: T[]; total: number; page: number; limit: number }

export const statementsApi = {
  list: (contractId: string, page = 1, limit = 20, status?: string) =>
    apiFetch<Envelope<ListPayload<InterimStatement>>>(
      `/contracts/${contractId}/statements?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`
    ),

  get: (id: string) =>
    apiFetch<Envelope<InterimStatement>>(`/statements/${id}`),

  create: (contractId: string, payload: { period_start: string; period_end: string; issued_on: string; notes?: string }) =>
    apiFetch<Envelope<InterimStatement>>(`/contracts/${contractId}/statements`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateStatementPayload) =>
    apiFetch<Envelope<InterimStatement>>(`/statements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  setWorksDone: (id: string, payload: SetWorksDonePayload) =>
    apiFetch<Envelope<InterimStatement>>(`/statements/${id}/works-done`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  addExtraWork: (id: string, item: CreateExtraWorkPayload) =>
    apiFetch<Envelope<ExtraWorkItem>>(`/statements/${id}/extra-works`, {
      method: "POST",
      body: JSON.stringify(item),
    }),

  deleteExtraWork: (id: string, ewId: string) =>
    apiFetch<void>(`/statements/${id}/extra-works/${ewId}`, { method: "DELETE" }),

  listDeductions: (id: string) =>
    apiFetch<Envelope<DeductionItem[]>>(`/statements/${id}/deductions`),

  addDeduction: (id: string, item: CreateDeductionPayload) =>
    apiFetch<Envelope<DeductionItem>>(`/statements/${id}/deductions`, {
      method: "POST",
      body: JSON.stringify(item),
    }),

  updateDeduction: (id: string, did: string, item: UpdateDeductionPayload) =>
    apiFetch<Envelope<DeductionItem>>(`/statements/${id}/deductions/${did}`, {
      method: "PUT",
      body: JSON.stringify(item),
    }),

  deleteDeduction: (id: string, did: string) =>
    apiFetch<void>(`/statements/${id}/deductions/${did}`, { method: "DELETE" }),

  transition: (id: string, payload: TransitionPayload) =>
    apiFetch<Envelope<InterimStatement>>(`/statements/${id}/transition`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/statements/${id}`, { method: "DELETE" }),

  downloadReport: async (id: string): Promise<{ blob: Blob; filename: string }> => {
    const token = useAuthStore.getState().token;
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
    const res = await fetch(`${base}/statements/${id}/report`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("خطا در دریافت گزارش");
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") ?? "";
    const match = cd.match(/filename="?([^";\n]+)"?/);
    return { blob, filename: match?.[1] ?? `statement-${id}.xlsx` };
  },
};
