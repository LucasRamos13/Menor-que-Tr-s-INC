"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { createCategory, deleteCategory } from "@/services/finance/categories-service";
import { categorySchema } from "@/validation/finance";
import { logAndFormat } from "@/lib/errors";
import type { CategoryKind, Tables } from "@/types/database";

const KIND_LABEL: Record<CategoryKind, string> = { income: "Receita", expense: "Despesa", both: "Ambos" };

export function CategoriesManager({ coupleId, categories }: { coupleId: string; categories: Tables<"categories">[] }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🏷️");
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [deleting, setDeleting] = useState<Tables<"categories"> | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const parsed = categorySchema.safeParse({ name, icon, kind });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      await createCategory(supabase, coupleId, parsed.data);
      toast.success("✓ Categoria criada");
      setName("");
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "create-category", "Não foi possível criar a categoria."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const supabase = createClient();
      await deleteCategory(supabase, deleting.id);
      toast.success("Categoria excluída");
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "delete-category", "Não foi possível excluir. Ela pode estar em uso por alguma transação."));
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-14 text-center" maxLength={4} aria-label="Ícone" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da categoria" className="flex-1 min-w-32" required />
        <Select value={kind} onChange={(e) => setKind(e.target.value as CategoryKind)} className="w-32">
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
          <option value="both">Ambos</option>
        </Select>
        <Button type="submit" disabled={saving}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </form>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3">
            <span>
              {c.icon} {c.name} <span className="text-xs text-slate-400">· {KIND_LABEL[c.kind]}</span>
            </span>
            <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setDeleting(c)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir categoria?"
        description="Transações que usam esta categoria ficarão sem categoria."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
      />
    </div>
  );
}
