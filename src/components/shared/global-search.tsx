"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Receipt, CheckSquare, CalendarDays, Target } from "lucide-react";
import type { SearchResult } from "@/app/api/search/route";
import { cn } from "@/lib/utils";

const ICONS = { transaction: Receipt, task: CheckSquare, event: CalendarDays, goal: Target };

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar..."
        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 top-11 z-50 max-h-80 w-full min-w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Nenhum resultado para &quot;{query}&quot;</p>
          ) : (
            results.map((result) => {
              const Icon = ICONS[result.type];
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800")}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    router.push(result.href);
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{result.title}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
