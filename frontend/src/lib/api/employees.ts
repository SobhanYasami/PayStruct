import { apiFetch } from "./client";

export interface Employee {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  national_id?: string;
  employment_type: string;
  roles: string[];
  is_head: boolean;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEmployeeReq {
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  national_id?: string;
  phone?: string;
  employment_type?: string;
  roles?: string[];
}

export interface UpdateEmployeeReq {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  phone?: string;
  company_id?: string;
  employment_type?: string;
  roles?: string[];
  active?: boolean;
}

interface Envelope<T> { status: string; data: T; message: string }
interface ListPayload<T> { data: T[]; total: number; page: number; limit: number }

export const employeesApi = {
  list: (page = 1, limit = 20, companyId?: string) =>
    apiFetch<Envelope<ListPayload<Employee>>>(
      `/users/employees/list?page=${page}&limit=${limit}${companyId ? `&company_id=${companyId}` : ""}`
    ),

  get: (id: string) =>
    apiFetch<Envelope<Employee>>(`/users/employees/${id}`),

  create: (req: CreateEmployeeReq) =>
    apiFetch<Envelope<Employee>>("/users/employees/create", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  update: (id: string, req: UpdateEmployeeReq) =>
    apiFetch<Envelope<Employee>>(`/users/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/users/employees/${id}`, { method: "DELETE" }),
};
