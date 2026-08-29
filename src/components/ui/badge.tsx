import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
      secondary: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
      danger: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
      outline: "border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
