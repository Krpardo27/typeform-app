import { z } from "zod";

export const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede superar los 100 caracteres"),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
