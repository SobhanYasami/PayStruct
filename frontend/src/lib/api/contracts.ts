import { apiFetch } from "./client";

export interface Contract {
  id: string;
  company_id: string;
  project_id: string;
  contractor_id: string;
  contract_no: string;
  title: string;
  description?: string;
  type: "lump_sum" | "unit_rate" | "cost_plus" | "time_material";
  status: string;
  gross_budget: string;
  currency: string;
  performance_bond_pct_bps: number;
  insurance_rate_pct_bps: number;
  vat_pct_bps: number;
  retention_pct_bps: number;
  advance_pct_bps: number;
  social_security_pct_bps: number;
  starts_on?: string;
  ends_on?: string;
  scanned_file_url?: string;
  contractor_name?: string;
  project_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractLineItem {
  id: string;
  contract_id: string;
  contractor_id?: string;
  project_id?: string;
  sort_order: number;
  description: string;
  unit: string;
  quantity: string;
  unit_rate: string;
  currency_code: string;
  created_at: string;
}

export interface CreateContractReq {
  project_id: string;
  contractor_id: string;
  contract_no?: string;
  title: string;
  description?: string;
  type?: string;
  status?: string;
  gross_budget?: string;
  currency?: string;
  starts_on?: string;
  ends_on?: string;
  performance_bond_pct_bps?: number;
  insurance_rate_pct_bps?: number;
  vat_pct_bps?: number;
  retention_pct_bps?: number;
  advance_pct_bps?: number;
  social_security_pct_bps?: number;
}

export type UpdateContractReq = Partial<Omit<CreateContractReq, "project_id" | "contractor_id">>;

export interface CreateLineItemReq {
  description: string;
  unit: string;
  quantity: string;
  unit_rate: string;
  currency_code?: string;
  sort_order?: number;
}

export interface UpdateLineItemReq {
  description?: string;
  unit?: string;
  quantity?: string;
  unit_rate?: string;
  currency_code?: string;
  sort_order?: number;
}

interface Envelope<T> { status: string; data: T; message: string }
interface ListPayload<T> { data: T[]; total: number; page: number; limit: number }

export const contractsApi = {
  list: (page = 1, limit = 20, projectId?: string, search?: string) =>
    apiFetch<Envelope<ListPayload<Contract>>>(
      `/contracts?page=${page}&limit=${limit}${projectId ? `&project_id=${projectId}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`
    ),

  get: (id: string) =>
    apiFetch<Envelope<Contract>>(`/contracts/${id}`),

  create: (req: CreateContractReq) =>
    apiFetch<Envelope<Contract>>("/contracts", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  update: (id: string, req: UpdateContractReq) =>
    apiFetch<Envelope<Contract>>(`/contracts/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/contracts/${id}`, { method: "DELETE" }),

  listLineItems: (contractId: string) =>
    apiFetch<Envelope<ContractLineItem[]>>(`/contracts/${contractId}/line-items`),

  createLineItem: (contractId: string, req: CreateLineItemReq) =>
    apiFetch<Envelope<ContractLineItem>>(`/contracts/${contractId}/line-items`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  updateLineItem: (contractId: string, itemId: string, req: UpdateLineItemReq) =>
    apiFetch<Envelope<ContractLineItem>>(`/contracts/${contractId}/line-items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  deleteLineItem: (contractId: string, itemId: string) =>
    apiFetch<void>(`/contracts/${contractId}/line-items/${itemId}`, { method: "DELETE" }),
};
