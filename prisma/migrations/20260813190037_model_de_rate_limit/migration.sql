-- DropIndex
DROP INDEX "security_rate_limit_updated_at_idx";

-- AlterTable
ALTER TABLE "security_rate_limit" ALTER COLUMN "updated_at" DROP DEFAULT;
