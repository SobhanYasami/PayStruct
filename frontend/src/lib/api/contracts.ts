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
  contract_value: string;
  currency: string;
  retention_pct_bps: number;
  advance_pct_bps: number;
  vat_pct_bps: number;
  social_security_pct_bps: number;
  signed_at?: string;
  starts_on?: string;
  ends_on?: string;
  scanned_file_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractLineItem {
  id: string;
  contract_id: string;
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
  contract_no: string;
  title: string;
  description?: string;
  type?: string;
  contract_value?: string;
  currency?: string;
  retention_pct_bps?: number;
  advance_pct_bps?: number;
  vat_pct_bps?: number;
  social_security_pct_bps?: number;
  starts_on?: string;
  ends_on?: string;
}

export type UpdateContractReq = Partial<Omit<CreateContractReq, "project_id">>;

export interface CreateLineItemReq {
  description: string;
  unit: string;
  quantity: string;
  unit_rate: string;
  currency_code?: string;
  sort_order?: number;
}

interface Envelope<T> { status: string; data: T; message: string }
interface ListPayload<T> { data: T[]; total: number; page: number; limit: number }

export const contractsApi = {
  list: (projectId: string, page = 1, limit = 20) =>
    apiFetch<Envelope<ListPayload<Contract>>>(
      `/contracts?project_id=${projectId}&page=${page}&limit=${limit}`
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
};
