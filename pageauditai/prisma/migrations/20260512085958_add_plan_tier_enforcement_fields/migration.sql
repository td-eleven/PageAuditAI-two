-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('Starter', 'Growth', 'Pro');

-- AlterTable
ALTER TABLE "plan_limits" ADD COLUMN     "credit_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "plan_tier" "PlanTier" NOT NULL DEFAULT 'Starter';
