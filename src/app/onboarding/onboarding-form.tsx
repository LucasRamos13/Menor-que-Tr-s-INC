"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, Users, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { createCouple, joinCoupleByInvite } from "@/services/couples/couples-service";
import { logAndFormat } from "@/lib/errors";

export function OnboardingForm({ userName }: { userName: string }) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [name, setName] = useState(`${userName.split(" ")[0]} & Amor`);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    setLoading(true);
    try {
      const supabase = createClient();
      await createCouple(supabase, name.trim() || "Nosso espaço");
      toast.success("Espaço criado! Agora convide seu par nas Configurações.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "onboarding-create", "Não foi possível criar o espaço do casal."));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setLoading(true);
    try {
      const supabase = createClient();
      await joinCoupleByInvite(supabase, code);
      toast.success("Você entrou no espaço do casal!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Código inválido ou expirado. Peça um novo convite ao seu par.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600">
          <Heart className="h-6 w-6 text-white" fill="white" />
        </div>
        <CardTitle>Bem-vindo(a), {userName.split(" ")[0]}!</CardTitle>
        <CardDescription>Vamos configurar o espaço compartilhado do casal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "choose" && (
          <div className="grid gap-3">
            <button
              onClick={() => setMode("create")}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-700 dark:hover:bg-emerald-900/10"
            >
              <Users className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium">Criar nosso espaço</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Você é a primeira pessoa a entrar</p>
              </div>
            </button>
            <button
              onClick={() => setMode("join")}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-700 dark:hover:bg-emerald-900/10"
            >
              <UserPlus className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium">Entrar com um convite</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Seu par já criou o espaço</p>
              </div>
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="couple-name">Nome do espaço</Label>
              <Input id="couple-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Lucas & Ana" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMode("choose")} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleCreate} disabled={loading} className="flex-1">
                {loading ? "Criando..." : "Criar espaço"}
              </Button>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="invite-code">Código de convite</Label>
              <Input id="invite-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ex: AB12CD" maxLength={6} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMode("choose")} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleJoin} disabled={loading || code.length < 4} className="flex-1">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
