import { apiFetch } from "./client";

export interface Project {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  status: string;
  priority: string;
  budget_estimate: string;
  budget_actual?: string;
  currency: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateProjectReq {
  code: string;
  name: string;
  description?: string;
  category?: string;
  status?: string;
  priority?: string;
  budget_estimate?: string;
  currency?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
}

export type UpdateProjectReq = Partial<CreateProjectReq> & { budget_actual?: string };

interface Envelope<T> { status: string; data: T; message: string }
interface ListPayload<T> { data: T[]; total: number; page: number; limit: number }

export const projectsApi = {
  list: (page = 1, limit = 20, status?: string) =>
    apiFetch<Envelope<ListPayload<Project>>>(
      `/projects?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`
    ),

  get: (id: string) =>
    apiFetch<Envelope<Project>>(`/projects/${id}`),

  create: (req: CreateProjectReq) =>
    apiFetch<Envelope<Project>>("/projects", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  update: (id: string, req: UpdateProjectReq) =>
    apiFetch<Envelope<Project>>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/projects/${id}`, { method: "DELETE" }),
};
