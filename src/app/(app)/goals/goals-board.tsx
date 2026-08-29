"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Target, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { deleteGoal } from "@/services/finance/goals-service";
import { logAndFormat } from "@/lib/errors";
import { centsToBRL, percentage } from "@/lib/money";
import { formatDate, daysUntil } from "@/lib/dates";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { ContributionDialog } from "@/components/goals/contribution-dialog";
import type { Tables } from "@/types/database";

interface GoalsBoardProps {
  coupleId: string;
  userId: string;
  goals: Tables<"financial_goals">[];
  members: { id: string; fullName: string | null }[];
}

export function GoalsBoard({ coupleId, userId, goals, members }: GoalsBoardProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"financial_goals"> | null>(null);
  const [contributingTo, setContributingTo] = useState<Tables<"financial_goals"> | null>(null);
  const [deleting, setDeleting] = useState<Tables<"financial_goals"> | null>(null);
  const router = useRouter();

  async function handleDelete() {
    if (!deleting) return;
    try {
      const supabase = createClient();
      await deleteGoal(supabase, deleting.id);
      toast.success("Objetivo excluído");
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "delete-goal"));
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
        <Plus className="h-4 w-4" /> Novo objetivo
      </Button>

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="Nenhum objetivo cadastrado" description="Ex: Viagem dos sonhos, Reserva de emergência, Carro novo." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => {
            const pct = percentage(g.current_amount_cents, g.target_amount_cents);
            const days = g.target_date ? daysUntil(g.target_date) : null;
            return (
              <Card key={g.id} className={g.is_completed ? "opacity-70" : ""}>
                <CardContent className="pt-4 sm:pt-5">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="font-semibold">
                        {g.icon} {g.name}
                      </p>
                      {g.description && <p className="text-xs text-slate-400">{g.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => { setEditing(g); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setDeleting(g)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-lg font-semibold">
                    {centsToBRL(g.current_amount_cents)} <span className="text-sm font-normal text-slate-400">/ {centsToBRL(g.target_amount_cents)}</span>
                  </p>
                  <Progress value={pct} className="mt-2" />
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{pct}%</span>
                    {g.target_date && <span>{days !== null && days >= 0 ? `Faltam ${days} dias` : formatDate(g.target_date)}</span>}
                  </div>

                  {!g.is_completed && (
                    <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setContributingTo(g)}>
                      <PlusCircle className="h-4 w-4" /> Registrar contribuição
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalFormDialog open={formOpen} onOpenChange={setFormOpen} coupleId={coupleId} userId={userId} goal={editing} members={members} onSaved={() => router.refresh()} />
      <ContributionDialog open={!!contributingTo} onOpenChange={(o) => !o && setContributingTo(null)} goal={contributingTo} userId={userId} onSaved={() => router.refresh()} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Excluir objetivo?" description="O histórico de contribuições também será excluído." confirmLabel="Excluir" onConfirm={handleDelete} />
    </div>
  );
}
