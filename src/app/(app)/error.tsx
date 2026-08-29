"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-lg font-semibold">Não foi possível carregar esta página</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">Verifique sua conexão e tente novamente.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
