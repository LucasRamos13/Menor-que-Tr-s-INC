"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { renameCouple, createCoupleInvite, type CoupleContext } from "@/services/couples/couples-service";
import { logAndFormat } from "@/lib/errors";

export function CoupleSettingsForm({ couple, userId }: { couple: CoupleContext; userId: string }) {
  const [name, setName] = useState(couple.coupleName);
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      await renameCouple(supabase, couple.coupleId, name.trim());
      toast.success("✓ Salvo");
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "rename-couple"));
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateInvite() {
    try {
      const supabase = createClient();
      const result = await createCoupleInvite(supabase, couple.coupleId, userId);
      setInvite(result);
    } catch (error) {
      toast.error(logAndFormat(error, "create-invite", "Não foi possível gerar o convite."));
    }
  }

  function handleCopy() {
    if (!invite) return;
    navigator.clipboard.writeText(invite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nome do espaço</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRename} className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {couple.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              {m.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatarUrl} alt="" className="h-9 w-9 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  {(m.fullName ?? m.email).slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{m.fullName}</p>
                <p className="text-xs text-slate-400">{m.email}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {couple.members.length < 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Convidar seu par</CardTitle>
            <CardDescription>Gere um código e compartilhe. Ele expira em 7 dias.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invite ? (
              <div className="flex items-center gap-2">
                <Label className="mb-0 flex-1 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-center font-mono text-lg tracking-widest dark:border-slate-600">{invite.code}</Label>
                <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copiar">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <Button onClick={handleGenerateInvite}>Gerar convite</Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
