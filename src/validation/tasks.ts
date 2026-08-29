import { z } from "zod";

export const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export const taskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export const taskListSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome para a lista").max(60),
  icon: z.string().trim().max(8).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
});

export const taskSchema = z.object({
  list_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1, "Informe um título").max(140),
  description: z.string().trim().max(1000).optional().nullable(),
  status: taskStatusSchema.default("todo"),
  priority: taskPrioritySchema.default("normal"),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  recurrence_rule: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
      interval: z.number().int().positive().default(1),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    .optional()
    .nullable(),
});

export type TaskListInput = z.infer<typeof taskListSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
