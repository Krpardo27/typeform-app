-- CreateTable
CREATE TABLE "form_winner" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "responseToken" TEXT NOT NULL,
    "participantEmail" TEXT,
    "reason" TEXT,
    "selectedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_winner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_winner_formId_idx" ON "form_winner"("formId");

-- CreateIndex
CREATE INDEX "form_winner_workspaceId_idx" ON "form_winner"("workspaceId");

-- CreateIndex
CREATE INDEX "form_winner_selectedByUserId_idx" ON "form_winner"("selectedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "form_winner_formId_responseToken_key" ON "form_winner"("formId", "responseToken");

-- AddForeignKey
ALTER TABLE "form_winner" ADD CONSTRAINT "form_winner_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_winner" ADD CONSTRAINT "form_winner_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_winner" ADD CONSTRAINT "form_winner_selectedByUserId_fkey" FOREIGN KEY ("selectedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
