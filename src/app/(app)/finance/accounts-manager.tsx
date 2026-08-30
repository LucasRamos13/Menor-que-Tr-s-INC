"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Archive, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogCloseButton } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/shared/currency-input";
import { createClient } from "@/lib/supabase/client";
import { createAccount, updateAccount, archiveAccount } from "@/services/finance/accounts-service";
import { accountSchema } from "@/validation/finance";
import { logAndFormat } from "@/lib/errors";
import { centsToBRL } from "@/lib/money";
import type { AccountType, Tables, Visibility } from "@/types/database";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  wallet: "Carteira",
  credit_card: "Cartão de crédito",
  investment: "Investimento",
  other: "Outra",
};

interface AccountsManagerProps {
  coupleId: string;
  userId: string;
  accounts: Tables<"accounts">[];
  balances: Record<string, number>;
  members: { id: string; fullName: string | null }[];
}

export function AccountsManager({ coupleId, userId, accounts, balances, members }: AccountsManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"accounts"> | null>(null);
  const router = useRouter();

  const active = accounts.filter((a) => a.is_active);

  async function handleArchive(account: Tables<"accounts">) {
    try {
      const supabase = createClient();
      await archiveAccount(supabase, account.id, userId);
      toast.success("Conta arquivada");
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "archive-account"));
    }
  }

  return (
    <div className="space-y-3">
      {active.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma conta cadastrada" description="Cadastre sua conta corrente, carteira ou cartão." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((account) => (
            <div key={account.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-xs text-slate-400">
                  {ACCOUNT_TYPE_LABELS[account.type]}
                  {account.visibility === "personal" && (
                    <Badge variant="outline" className="ml-2">
                      Pessoal
                    </Badge>
                  )}
                </p>
                <p className="mt-1 text-sm font-semibold">{centsToBRL(balances[account.id] ?? account.initial_balance_cents)}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => { setEditing(account); setDialogOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Arquivar" onClick={() => handleArchive(account)}>
                  <Archive className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" onClick={() => { setEditing(null); setDialogOpen(true); }}>
        <Plus className="h-4 w-4" /> Nova conta
      </Button>

      <AccountFormDialog open={dialogOpen} onOpenChange={setDialogOpen} coupleId={coupleId} userId={userId} account={editing} members={members} onSaved={() => router.refresh()} />
    </div>
  );
}

function AccountFormDialog({
  open,
  onOpenChange,
  coupleId,
  userId,
  account,
  members,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId: string;
  userId: string;
  account: Tables<"accounts"> | null;
  members: { id: string; fullName: string | null }[];
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [institution, setInstitution] = useState("");
  const [initialBalanceCents, setInitialBalanceCents] = useState(0);
  const [visibility, setVisibility] = useState<Visibility>("shared");
  const [ownerId, setOwnerId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(account?.name ?? "");
    setType(account?.type ?? "checking");
    setInstitution(account?.institution ?? "");
    setInitialBalanceCents(account?.initial_balance_cents ?? 0);
    setVisibility(account?.visibility ?? "shared");
    setOwnerId(account?.owner_id ?? "");
  }, [open, account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = accountSchema.safeParse({
      name,
      type,
      institution: institution || null,
      initial_balance_cents: initialBalanceCents,
      is_active: true,
      visibility,
      owner_id: visibility === "personal" ? ownerId : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      if (account) await updateAccount(supabase, account.id, userId, parsed.data);
      else await createAccount(supabase, coupleId, userId, parsed.data);
      toast.success("✓ Salvo");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(logAndFormat(error, "account-form", "Não foi possível salvar a conta."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{account ? "Editar conta" : "Nova conta"}</DialogTitle>
        <DialogCloseButton onClick={() => onOpenChange(false)} />
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="acc-name">Nome</Label>
          <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="acc-type">Tipo</Label>
            <Select id="acc-type" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="acc-institution">Instituição</Label>
            <Input id="acc-institution" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div>
          <Label htmlFor="acc-balance">Saldo inicial</Label>
          <CurrencyInput id="acc-balance" valueCents={initialBalanceCents} onChangeCents={setInitialBalanceCents} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="acc-visibility">Visibilidade</Label>
            <Select id="acc-visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
              <option value="shared">Compartilhada</option>
              <option value="personal">Pessoal</option>
            </Select>
          </div>
          {visibility === "personal" && (
            <div>
              <Label htmlFor="acc-owner">Dono(a)</Label>
              <Select id="acc-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required>
                <option value="" disabled>
                  Selecione
                </option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
