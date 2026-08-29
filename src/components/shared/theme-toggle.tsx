"use client";

import { Moon, Sun, MonitorSmartphone } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light" as const, icon: Sun, label: "Claro" },
  { value: "dark" as const, icon: Moon, label: "Escuro" },
  { value: "system" as const, icon: MonitorSmartphone, label: "Sistema" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            theme === value && "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
