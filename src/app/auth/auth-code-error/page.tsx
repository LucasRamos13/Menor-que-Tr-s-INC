import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
        <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="text-xl font-semibold">Não foi possível concluir o login</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        O link de autenticação expirou ou já foi utilizado. Tente entrar novamente.
      </p>
      <Button asChild>
        <Link href="/login">Voltar para o login</Link>
      </Button>
    </main>
  );
}
