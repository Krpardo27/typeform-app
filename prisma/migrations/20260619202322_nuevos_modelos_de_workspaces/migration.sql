/*
  Warnings:

  - You are about to drop the `AllowedUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('ADMIN', 'EDITOR', 'MEMBER', 'VIEWER');

-- DropTable
DROP TABLE "AllowedUser";

-- CreateTable
CREATE TABLE "alloweduser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alloweduser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace" (
    "id" TEXT NOT NULL,
    "typeformId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "formsCount" INTEGER NOT NULL DEFAULT 0,
    "selfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_workspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_workspace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alloweduser_email_key" ON "alloweduser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_typeformId_key" ON "workspace"("typeformId");

-- CreateIndex
CREATE INDEX "workspace_typeformId_idx" ON "workspace"("typeformId");

-- CreateIndex
CREATE INDEX "user_workspace_workspaceId_idx" ON "user_workspace"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_workspace_userId_workspaceId_key" ON "user_workspace"("userId", "workspaceId");

-- AddForeignKey
ALTER TABLE "user_workspace" ADD CONSTRAINT "user_workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_workspace" ADD CONSTRAINT "user_workspace_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
