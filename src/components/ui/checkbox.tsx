import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, checked, ...props }, ref) => (
  <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
    <input ref={ref} type="checkbox" checked={checked} className="peer absolute h-5 w-5 cursor-pointer opacity-0" {...props} />
    <span
      className={cn(
        "pointer-events-none flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 bg-white transition-colors peer-checked:border-emerald-600 peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900",
        className,
      )}
    >
      {checked ? <Check className="h-3.5 w-3.5 text-white" /> : null}
    </span>
  </span>
));
Checkbox.displayName = "Checkbox";
