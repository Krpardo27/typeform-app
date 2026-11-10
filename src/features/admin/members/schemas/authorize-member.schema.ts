import { z } from "zod";

export const authorizeMemberSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Ingresa un correo electrónico válido.")),
  assignments: z.array(z.object({
    workspaceId: z.string().trim().min(1, "Selecciona un workspace válido."),
    role: z.enum(["VIEWER", "EDITOR"], { error: "Selecciona un rol válido." }),
  })).min(1, "Selecciona al menos un workspace."),
}).superRefine(({ assignments }, context) => {
  const ids = new Set<string>();
  for (const assignment of assignments) {
    if (ids.has(assignment.workspaceId)) {
      context.addIssue({ code: "custom", path: ["assignments"], message: "Hay workspaces repetidos en la selección." });
      return;
    }
    ids.add(assignment.workspaceId);
  }
});

export type AuthorizeMemberInput = z.infer<typeof authorizeMemberSchema>;