import { prisma } from "@/lib/prisma";
import { adminEmails, editorTestEmail } from "./data/usuarios";
import { allowedUsers } from "./data/allowed-users";
import { radioWorkspaces } from "./data/workspaces";
import { WorkspaceRole } from "@/generated/prisma/client";

async function main() {
  console.log("🌱 Iniciando seed...");

  const superAdminEmails = new Set<string>([
    ...adminEmails,
    "kevin.pardov26@gmail.com",
  ]);

  const allEmails = [...new Set([...allowedUsers, ...adminEmails, editorTestEmail])];

  // 1. Whitelist
  await Promise.all(
    allEmails.map((email) =>
      prisma.allowedUser.upsert({
        where: { email },
        update: {},
        create: { email },
      }),
    ),
  );

  console.log("Allowed users creados");

  // 2. Upsert usuarios (garantiza existencia real)
  const users = await Promise.all(
    allEmails.map((email) =>
      prisma.user.upsert({
        where: { email },
        update: {
          globalRole: superAdminEmails.has(email) ? "SUPER_ADMIN" : "USER",
          status: superAdminEmails.has(email) ? "ACTIVE" : undefined,
        },
        create: {
          id: crypto.randomUUID(),
          email,
          name: email.split("@")[0],
          globalRole: superAdminEmails.has(email) ? "SUPER_ADMIN" : "USER",
          status: superAdminEmails.has(email) ? "ACTIVE" : "PENDING",
        },
      }),
    ),
  );

  console.log("Usuarios garantizados");

  // 3. Workspaces
  await prisma.workspace.createMany({
    data: radioWorkspaces,
    skipDuplicates: true,
  });

  console.log("Workspaces creados");

  const workspaces = await prisma.workspace.findMany();

  // 4. Relaciones RBAC base
  const relations: {
    userId: string;
    workspaceId: string;
    role: WorkspaceRole;
  }[] = [];

  for (const user of users) {
    if (user.globalRole === "SUPER_ADMIN") {
      relations.push(
        ...workspaces.map((ws) => ({
          userId: user.id,
          workspaceId: ws.id,
          role: WorkspaceRole.EDITOR,
        })),
      );
    }
  }

  await prisma.userWorkspace.createMany({
    data: relations,
    skipDuplicates: true,
  });

  console.log("Relaciones user-workspace creadas");

  console.log("🎉 Seed completado correctamente");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
