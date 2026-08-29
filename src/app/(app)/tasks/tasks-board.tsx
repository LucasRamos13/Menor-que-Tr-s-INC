"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, CheckSquare, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toggleTaskDone, deleteTask } from "@/services/tasks/tasks-service";
import { createTaskList } from "@/services/tasks/task-lists-service";
import { logAndFormat } from "@/lib/errors";
import { formatDate, isPast, isToday, todayISODate } from "@/lib/dates";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import type { Tables, TaskPriority } from "@/types/database";

const PRIORITY_VARIANT: Record<TaskPriority, "secondary" | "default" | "warning" | "danger"> = {
  low: "secondary",
  normal: "default",
  high: "warning",
  urgent: "danger",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };

type QuickFilter = "all" | "today" | "overdue" | "mine" | "partner";

interface TasksBoardProps {
  coupleId: string;
  userId: string;
  lists: Tables<"task_lists">[];
  tasks: Tables<"tasks">[];
  members: { id: string; fullName: string | null }[];
}

export function TasksBoard({ coupleId, userId, lists, tasks, members }: TasksBoardProps) {
  const [selectedListId, setSelectedListId] = useState<string | "all">("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"tasks"> | null>(null);
  const [deleting, setDeleting] = useState<Tables<"tasks"> | null>(null);
  const [newListName, setNewListName] = useState("");
  const router = useRouter();

  const memberById = new Map(members.map((m) => [m.id, m]));
  const today = todayISODate();

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedListId !== "all" && t.list_id !== selectedListId) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (quickFilter === "today") return t.due_date === today && t.status !== "done";
      if (quickFilter === "overdue") return !!t.due_date && t.due_date < today && t.status !== "done";
      if (quickFilter === "mine") return t.assignee_id === userId;
      if (quickFilter === "partner") return !!t.assignee_id && t.assignee_id !== userId;
      return true;
    });
  }, [tasks, selectedListId, search, quickFilter, today, userId]);

  const pending = filtered.filter((t) => t.status !== "done");
  const done = filtered.filter((t) => t.status === "done");

  async function handleToggle(task: Tables<"tasks">, checked: boolean) {
    try {
      const supabase = createClient();
      await toggleTaskDone(supabase, task.id, checked);
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "toggle-task"));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const supabase = createClient();
      await deleteTask(supabase, deleting.id);
      toast.success("Tarefa excluída");
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "delete-task"));
    }
  }

  async function handleCreateList() {
    if (!newListName.trim()) return;
    try {
      const supabase = createClient();
      await createTaskList(supabase, coupleId, { name: newListName.trim() });
      setNewListName("");
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "create-list"));
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[200px_1fr]">
      <aside className="space-y-1">
        <button
          onClick={() => setSelectedListId("all")}
          className={cn("w-full rounded-lg px-3 py-2 text-left text-sm font-medium", selectedListId === "all" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}
        >
          Todas as listas
        </button>
        {lists.map((list) => (
          <button
            key={list.id}
            onClick={() => setSelectedListId(list.id)}
            className={cn("w-full rounded-lg px-3 py-2 text-left text-sm font-medium", selectedListId === list.id ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}
          >
            {list.icon} {list.name}
          </button>
        ))}
        <div className="flex gap-1 pt-2">
          <Input placeholder="Nova lista" value={newListName} onChange={(e) => setNewListName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateList()} className="h-8 text-xs" />
          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleCreateList} aria-label="Criar lista">
            <ListPlus className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {([
            ["all", "Todas"],
            ["today", "Hoje"],
            ["overdue", "Atrasadas"],
            ["mine", "Minhas"],
            ["partner", "Do par"],
          ] as [QuickFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setQuickFilter(value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                quickFilter === value ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <Input placeholder="Buscar tarefa..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-40 text-xs" />
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> Nova
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={CheckSquare} title="Nenhuma tarefa por aqui" description="Adicione a primeira tarefa dessa lista." />
        ) : (
          <div className="space-y-4">
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {pending.map((task) => (
                <TaskRow key={task.id} task={task} assigneeName={task.assignee_id ? memberById.get(task.assignee_id)?.fullName ?? null : null} onToggle={handleToggle} onEdit={() => { setEditing(task); setFormOpen(true); }} onDelete={() => setDeleting(task)} />
              ))}
            </div>

            {done.length > 0 && (
              <details className="rounded-xl border border-slate-200 p-1 dark:border-slate-700">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-500">Concluídas ({done.length})</summary>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {done.map((task) => (
                    <TaskRow key={task.id} task={task} assigneeName={task.assignee_id ? memberById.get(task.assignee_id)?.fullName ?? null : null} onToggle={handleToggle} onEdit={() => { setEditing(task); setFormOpen(true); }} onDelete={() => setDeleting(task)} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        coupleId={coupleId}
        userId={userId}
        lists={lists}
        members={members}
        task={editing}
        defaultListId={selectedListId !== "all" ? selectedListId : undefined}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Excluir tarefa?" description="Esta tarefa será excluída permanentemente." confirmLabel="Excluir" onConfirm={handleDelete} />
    </div>
  );
}

function TaskRow({
  task,
  assigneeName,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Tables<"tasks">;
  assigneeName: string | null;
  onToggle: (task: Tables<"tasks">, checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const overdue = !!task.due_date && isPast(task.due_date) && task.status !== "done";
  return (
    <div className="flex items-center gap-3 p-3">
      <Checkbox checked={task.status === "done"} onChange={(e) => onToggle(task, e.target.checked)} />
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className={cn("truncate text-sm font-medium", task.status === "done" && "text-slate-400 line-through")}>{task.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          {task.due_date && <span className={overdue ? "font-medium text-red-500" : isToday(task.due_date) ? "font-medium text-amber-600" : ""}>{formatDate(task.due_date)}</span>}
          {assigneeName && <span>· {assigneeName}</span>}
        </div>
      </button>
      <Badge variant={PRIORITY_VARIANT[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
      <Button variant="ghost" size="icon" aria-label="Excluir" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
