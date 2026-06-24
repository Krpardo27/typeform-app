-- CreateTable
CREATE TABLE "form" (
    "id" TEXT NOT NULL,
    "typeformId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "selfUrl" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_typeformId_key" ON "form"("typeformId");

-- CreateIndex
CREATE INDEX "form_workspaceId_idx" ON "form"("workspaceId");

-- AddForeignKey
ALTER TABLE "form" ADD CONSTRAINT "form_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
