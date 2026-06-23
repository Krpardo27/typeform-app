/*
  Warnings:

  - The values [ADMIN,MEMBER] on the enum `WorkspaceRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('SUPER_ADMIN', 'USER');

-- AlterEnum
BEGIN;
CREATE TYPE "WorkspaceRole_new" AS ENUM ('EDITOR', 'VIEWER');
ALTER TABLE "public"."user_workspace" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "user_workspace" ALTER COLUMN "role" TYPE "WorkspaceRole_new" USING ("role"::text::"WorkspaceRole_new");
ALTER TYPE "WorkspaceRole" RENAME TO "WorkspaceRole_old";
ALTER TYPE "WorkspaceRole_new" RENAME TO "WorkspaceRole";
DROP TYPE "public"."WorkspaceRole_old";
ALTER TABLE "user_workspace" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
COMMIT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "globalRole" "GlobalRole" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "user_workspace" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
