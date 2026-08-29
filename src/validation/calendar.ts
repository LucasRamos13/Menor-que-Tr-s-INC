import { z } from "zod";

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Informe um título").max(140),
    description: z.string().trim().max(1000).optional().nullable(),
    location: z.string().trim().max(200).optional().nullable(),
    start_at: z.string().min(1, "Informe a data/hora de início"),
    end_at: z.string().min(1, "Informe a data/hora de término"),
    all_day: z.boolean().default(false),
    category: z.string().trim().max(60).optional().nullable(),
    recurrence_rule: z.string().trim().max(200).optional().nullable(),
    visibility: z.enum(["shared", "personal"]).default("shared"),
    owner_id: z.string().uuid().optional().nullable(),
    participant_ids: z.array(z.string().uuid()).optional().default([]),
  })
  .refine((data) => new Date(data.end_at) >= new Date(data.start_at), {
    message: "O término deve ser depois do início",
    path: ["end_at"],
  })
  .refine((data) => (data.visibility === "personal" ? !!data.owner_id : true), {
    message: "Selecione a pessoa dona do evento pessoal",
    path: ["owner_id"],
  });

export const importantDateSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(120),
  emoji: z.string().trim().max(8).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  is_recurring_yearly: z.boolean().default(true),
  category: z.string().trim().max(60).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type EventInput = z.infer<typeof eventSchema>;
export type ImportantDateInput = z.infer<typeof importantDateSchema>;
