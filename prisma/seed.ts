import { prisma } from "@/lib/prisma";
import { allowedUsers } from "./data/allowed-users";

async function main() {
  for (const email of allowedUsers) {
    await prisma.allowedUser.upsert({
      where: { email },
      update: {},
      create: { email },
    });
  }

  console.log(`Seed completado. ${allowedUsers.length} usuarios procesados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

