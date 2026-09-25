-- AlterTable
ALTER TABLE "workspace" ADD COLUMN     "templateFormTypeformId" TEXT;

-- CreateIndex
CREATE INDEX "workspace_templateFormTypeformId_idx" ON "workspace"("templateFormTypeformId");
