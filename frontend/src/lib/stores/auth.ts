"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: string;
  companyId: string;
  rootCompanyId: string;
  roles: string[];
  name: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setToken: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const TOKEN_COOKIE = "auth_token";

function setCookie(value: string) {
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(value)}; path=/; SameSite=Lax; max-age=86400`;
}

function clearCookie() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token, user) => {
        setCookie(token);
        set({ token, user });
      },
      logout: () => {
        clearCookie();
        set({ token: null, user: null });
      },
    }),
    { name: "auth" }
  )
);
