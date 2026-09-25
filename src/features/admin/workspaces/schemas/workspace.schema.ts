import { z } from "zod";

export const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede superar los 100 caracteres"),
  templateFormTypeformId: z
    .string()
    .min(1, "Debes ingresar el ID del formulario plantilla")
    .max(100, "El ID del formulario plantilla no puede superar 100 caracteres"),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
