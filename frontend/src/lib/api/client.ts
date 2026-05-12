import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail: string,
    public type = "about:blank"
  ) {
    super(detail);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let body: { title?: string; detail?: string; type?: string } = {};
    try {
      body = await res.json();
    } catch {}
    throw new ApiError(res.status, body.title ?? res.statusText, body.detail ?? "", body.type);
  }
  return res.json() as Promise<T>;
}

export interface PageParams {
  after?: string;
  limit?: number;
}

export async function fetchPage<T>(path: string, params?: PageParams): Promise<T> {
  const qs = new URLSearchParams();
  if (params?.after) qs.set("after", params.after);
  if (params?.limit) qs.set("limit", String(params.limit));
  const sep = path.includes("?") ? "&" : "?";
  return apiFetch<T>(`${path}${qs.toString() ? sep + qs.toString() : ""}`);
}
