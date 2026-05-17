import { apiFetch } from "./client";

export interface Company {
  id: string;
  name: string;
  reg_num: string;
  parent_id?: string;
}

export interface CreateCompanyReq {
  name: string;
  reg_num: string;
  parent_id?: string;
}

export type UpdateCompanyReq = CreateCompanyReq;

interface Envelope<T> { status: string; data: T; message: string }
interface ListPayload<T> { data: T[]; total: number; page: number; limit: number; total_pages: number }

export const companiesApi = {
  list: (page = 1, limit = 20, search = "") =>
    apiFetch<Envelope<ListPayload<Company>>>(
      `/company/management?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`
    ),

  get: (id: string) =>
    apiFetch<Envelope<Company>>(`/company/management/${id}`),

  create: (req: CreateCompanyReq) =>
    apiFetch<Envelope<Company>>("/company/management", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  update: (id: string, req: UpdateCompanyReq) =>
    apiFetch<Envelope<Company>>(`/company/management/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  delete: (id: string) =>
    apiFetch<Envelope<null>>(`/company/management/${id}`, { method: "DELETE" }),
};
