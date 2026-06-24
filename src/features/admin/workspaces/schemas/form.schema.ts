import { z } from "zod";

export const CreateFormSchema = z.object({
  title: z
    .string()
    .min(2, "El título debe tener al menos 2 caracteres")
    .max(200, "El título no puede superar los 200 caracteres"),
  description: z
    .string()
    .max(500, "La descripción no puede superar los 500 caracteres")
    .optional(),
  workspaceId: z.string().min(1, "Debes seleccionar un workspace"),
  type: z.enum(["form", "quiz"]).default("form"),
});

export type CreateFormInput = z.infer<typeof CreateFormSchema>;