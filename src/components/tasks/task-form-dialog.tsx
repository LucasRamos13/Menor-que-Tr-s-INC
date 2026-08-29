"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogCloseButton } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { createTask, updateTask } from "@/services/tasks/tasks-service";
import { taskSchema } from "@/validation/tasks";
import { logAndFormat } from "@/lib/errors";
import type { Tables, TaskPriority } from "@/types/database";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId: string;
  userId: string;
  lists: Tables<"task_lists">[];
  members: { id: string; fullName: string | null }[];
  task?: Tables<"tasks"> | null;
  defaultListId?: string;
  onSaved?: () => void;
}

export function TaskFormDialog({ open, onOpenChange, coupleId, userId, lists, members, task, defaultListId, onSaved }: TaskFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listId, setListId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setListId(task?.list_id ?? defaultListId ?? "");
    setPriority(task?.priority ?? "normal");
    setAssigneeId(task?.assignee_id ?? "");
    setDueDate(task?.due_date ?? "");
  }, [open, task, defaultListId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = taskSchema.safeParse({
      list_id: listId || null,
      title,
      description: description || null,
      priority,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      if (task) await updateTask(supabase, task.id, parsed.data);
      else await createTask(supabase, coupleId, userId, parsed.data);
      toast.success("✓ Salvo");
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(logAndFormat(error, "task-form", "Não foi possível salvar a tarefa."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        <DialogCloseButton onClick={() => onOpenChange(false)} />
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="task-title">Título</Label>
          <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>
        <div>
          <Label htmlFor="task-description">Descrição</Label>
          <Textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-list">Lista</Label>
            <Select id="task-list" value={listId} onChange={(e) => setListId(e.target.value)}>
              <option value="">Sem lista</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.icon} {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="task-priority">Prioridade</Label>
            <Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-assignee">Responsável</Label>
            <Select id="task-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Compartilhada</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="task-due">Data limite</Label>
            <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
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
