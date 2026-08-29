"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { logAndFormat } from "@/lib/errors";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.76c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  );
}

function LoginCard() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  async function handleLogin() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(logAndFormat(error, "login", "Não foi possível entrar com o Google. Tente novamente."));
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600">
        <Heart className="h-7 w-7 text-white" fill="white" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Menor que Três</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        O espaço do casal para organizar finanças, agenda, tarefas e objetivos.
      </p>

      <Button className="mt-6 w-full" size="lg" variant="outline" onClick={handleLogin} disabled={loading}>
        <GoogleIcon />
        {loading ? "Entrando..." : "Entrar com o Google"}
      </Button>

      <p className="mt-6 text-xs text-slate-400">
        Ao entrar, você concorda que os dados inseridos são de uso pessoal do casal e ficam protegidos por regras de acesso no banco de dados.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4 dark:from-slate-950 dark:to-slate-900">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </main>
  );
}
