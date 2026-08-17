CREATE TABLE "security_rate_limit" (
  "key" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "window_started_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "security_rate_limit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "security_rate_limit_updated_at_idx"
  ON "security_rate_limit"("updated_at");
