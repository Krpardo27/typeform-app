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
  const legacyWorkspaceTypeformIds = [
    { legacyTypeformId: "concierto", nextTypeformId: "1530584" },
    { legacyTypeformId: "los40", nextTypeformId: "416594" },
    { legacyTypeformId: "rockpop", nextTypeformId: "414850" },
    { legacyTypeformId: "futuro", nextTypeformId: "371901" },
    { legacyTypeformId: "adn", nextTypeformId: "2828888" },
    { legacyTypeformId: "fmdos", nextTypeformId: "282794" },
    { legacyTypeformId: "activa", nextTypeformId: "866034" },
    { legacyTypeformId: "pudahuel", nextTypeformId: "390974" },
  ];

  for (const workspace of legacyWorkspaceTypeformIds) {
    const nextWorkspaceExists = await prisma.workspace.findUnique({
      where: { typeformId: workspace.nextTypeformId },
      select: { id: true },
    });

    if (!nextWorkspaceExists) {
      await prisma.workspace.updateMany({
        where: { typeformId: workspace.legacyTypeformId },
        data: { typeformId: workspace.nextTypeformId },
      });
    }
  }

  await Promise.all(
    radioWorkspaces.map((workspace) =>
      prisma.workspace.upsert({
        where: { typeformId: workspace.typeformId },
        update: {
          name: workspace.name,
          accountId: workspace.accountId,
          templateFormTypeformId: workspace.templateFormTypeformId,
        },
        create: workspace,
      }),
    ),
  );

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
