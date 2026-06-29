"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      openMobile: () => set({ mobileOpen: true }),
      closeMobile: () => set({ mobileOpen: false }),
      toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
    }),
    {
      name: "sidebar-state",
      partialize: (s) => ({ collapsed: s.collapsed }),
    }
  )
);
