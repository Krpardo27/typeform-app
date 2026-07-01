/*
  Warnings:

  - You are about to drop the `audit_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `form` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "form" DROP CONSTRAINT "form_workspaceId_fkey";

-- DropTable
DROP TABLE "audit_log";

-- DropTable
DROP TABLE "form";

-- DropEnum
DROP TYPE "AuditAction";
