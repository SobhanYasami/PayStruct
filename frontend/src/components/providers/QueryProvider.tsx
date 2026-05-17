"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      })
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="bottom-left"
        toastOptions={{
          duration: 4000,
          style: { direction: "rtl", fontFamily: "inherit" },
          success: { iconTheme: { primary: "oklch(50% 0.15 155)", secondary: "#fff" } },
          error: { iconTheme: { primary: "oklch(45% 0.20 25)", secondary: "#fff" } },
        }}
      />
    </QueryClientProvider>
  );
}
