import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { listTaskLists } from "@/services/tasks/task-lists-service";
import { listTasks } from "@/services/tasks/tasks-service";
import { TasksBoard } from "./tasks-board";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  const [lists, tasks] = await Promise.all([listTaskLists(supabase, couple.coupleId), listTasks(supabase, couple.coupleId)]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">Tarefas</h1>
      <TasksBoard coupleId={couple.coupleId} userId={user!.id} lists={lists} tasks={tasks} members={couple.members} />
    </div>
  );
}
