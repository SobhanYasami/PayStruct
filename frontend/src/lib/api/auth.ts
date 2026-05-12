import { apiFetch } from "./client";

export interface LoginPayload {
  email: string;
  password: string;
}

interface LoginData {
  token: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    company_id: string;
    root_company_id: string;
    roles: string[];
  };
}

interface ApiEnvelope<T> {
  data: T;
  status: string;
  message: string;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiFetch<ApiEnvelope<LoginData>>("/users/auth/signin", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
