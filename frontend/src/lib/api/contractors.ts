import { apiFetch } from "./client";

export interface Contractor {
  id: string;
  company_id?: string;
  created_by_id?: string;
  type: "individual" | "company";
  first_name?: string;
  last_name?: string;
  company_name?: string;
  display_name: string;
  legal_name?: string;
  tax_id?: string;
  registration_no?: string;
  national_id?: string;
  preferential_id?: string;
  default_currency: string;
  bank_account?: string;
  contact?: string;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateContractorReq {
  type: "individual" | "company";
  first_name?: string;
  last_name?: string;
  company_name?: string;
  legal_name?: string;
  tax_id?: string;
  registration_no?: string;
  national_id?: string;
  preferential_id?: string;
  default_currency?: string;
  rating?: number;
}

export type UpdateContractorReq = Partial<CreateContractorReq>;

interface Envelope<T> { status: string; data: T; message: string }
interface ListPayload<T> { data: T[]; total: number; page: number; limit: number }

export const contractorsApi = {
  list: (page = 1, limit = 20, search?: string) =>
    apiFetch<Envelope<ListPayload<Contractor>>>(
      `/contractors?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`
    ),

  get: (id: string) =>
    apiFetch<Envelope<Contractor>>(`/contractors/${id}`),

  create: (req: CreateContractorReq) =>
    apiFetch<Envelope<Contractor>>("/contractors", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  update: (id: string, req: UpdateContractorReq) =>
    apiFetch<Envelope<Contractor>>(`/contractors/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/contractors/${id}`, { method: "DELETE" }),
};
