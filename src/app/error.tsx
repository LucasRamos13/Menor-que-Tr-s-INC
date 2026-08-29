"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold">Algo deu errado</h1>
          <p className="max-w-sm text-sm text-slate-500">
            Não foi possível carregar esta página. Verifique sua conexão e tente novamente.
          </p>
          <Button onClick={reset}>Tentar novamente</Button>
        </main>
      </body>
    </html>
  );
}
