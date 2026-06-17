"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { companiesApi } from "@/lib/api/companies";

const inputCls =
  "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

export function CompanyCombobox({
  value,
  onChange,
  placeholder = "جستجوی شرکت...",
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["companies-search", debouncedQuery],
    queryFn: () => companiesApi.list(1, 30, debouncedQuery),
    enabled: open,
    staleTime: 10_000,
  });

  const results = data?.data?.data ?? [];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value ? selectedLabel || value.slice(0, 8) + "…" : query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) {
            onChange(undefined);
            setSelectedLabel("");
          }
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputCls}
        dir="rtl"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 w-full bg-white border border-border rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setSelectedLabel("");
                setQuery("");
              }}
              className="w-full text-right px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50"
            >
              همه شرکت‌ها
            </button>
          )}
          {isFetching && (
            <p className="px-3 py-2 text-xs text-muted-foreground">در حال جستجو...</p>
          )}
          {!isFetching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">نتیجه‌ای یافت نشد</p>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.id);
                setSelectedLabel(c.name);
                setQuery("");
                setOpen(false);
              }}
              className={`w-full text-right px-3 py-2 text-sm hover:bg-primary/5 flex items-center justify-between gap-2 ${
                value === c.id ? "bg-primary/10 font-medium" : ""
              }`}
            >
              <span>{c.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{c.reg_num}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
