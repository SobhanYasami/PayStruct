import { apiFetch } from "./client";

export interface Consultant {
  id: string;
  company_id?: string;
  created_by_id?: string;
  name: string;
  legal_name?: string;
  registration_no?: string;
  tax_id?: string;
  specialization?: string;
  license_no?: string;
  license_expiry?: string;
  default_currency: string;
  contact?: string;
  rating?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateConsultantReq {
  name: string;
  legal_name?: string;
  registration_no?: string;
  tax_id?: string;
  specialization?: string;
  license_no?: string;
  license_expiry?: string;
  default_currency?: string;
  contact?: string;
  rating?: number;
  is_active?: boolean;
}

export type UpdateConsultantReq = Partial<CreateConsultantReq>;

interface Envelope<T> { status: string; data: T; message: string }
interface ListPayload<T> { data: T[]; total: number; page: number; limit: number }

export const consultantsApi = {
  list: (page = 1, limit = 20, search?: string, companyId?: string) =>
    apiFetch<Envelope<ListPayload<Consultant>>>(
      `/consultants?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}${companyId ? `&company_id=${companyId}` : ""}`
    ),

  get: (id: string) =>
    apiFetch<Envelope<Consultant>>(`/consultants/${id}`),

  create: (req: CreateConsultantReq) =>
    apiFetch<Envelope<Consultant>>("/consultants", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  update: (id: string, req: UpdateConsultantReq) =>
    apiFetch<Envelope<Consultant>>(`/consultants/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/consultants/${id}`, { method: "DELETE" }),
};
