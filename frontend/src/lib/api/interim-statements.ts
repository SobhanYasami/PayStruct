import { apiFetch } from "./client";

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
  retention_amount: string;
  advance_recovered: string;
  vat_amount: string;
  social_security_amount: string;
  ld_amount: string;
  net_amount: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkDoneItem {
  id?: string;
  boq_item_code?: string;
  description: string;
  unit_code?: string;
  quantity: string;
  unit_price: string;
}

export interface ExtraWorkItem {
  id?: string;
  description: string;
  reason?: string;
  amount: string;
  variation_ref?: string;
  approved_by_client?: boolean;
  approval_ref?: string;
  created_at?: string;
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

  setWorksDone: (id: string, items: WorkDoneItem[]) =>
    apiFetch<Envelope<InterimStatement>>(`/statements/${id}/works-done`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    }),

  addExtraWork: (id: string, item: Omit<ExtraWorkItem, "id" | "created_at">) =>
    apiFetch<Envelope<ExtraWorkItem>>(`/statements/${id}/extra-works`, {
      method: "POST",
      body: JSON.stringify(item),
    }),

  transition: (id: string, payload: TransitionPayload) =>
    apiFetch<Envelope<InterimStatement>>(`/statements/${id}/transition`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/statements/${id}`, { method: "DELETE" }),
};
