import type { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPlanConfig } from "@/lib/plans";

export async function upgradeUserPlan(userId: string, tier: PlanTier) {
  const plan = getPlanConfig(tier);
  const now = new Date();

  return prisma.planLimit.upsert({
    where: { userId },
    create: {
      userId,
      planTier: tier,
      maxDomains: plan.maxDomains,
      maxKeywords: plan.maxKeywords,
      monthlyOpportunityCredits: plan.monthlyOpportunityCredits,
      usedOpportunityCredits: 0,
      creditPeriodStart: now,
    },
    update: {
      planTier: tier,
      maxDomains: plan.maxDomains,
      maxKeywords: plan.maxKeywords,
      monthlyOpportunityCredits: plan.monthlyOpportunityCredits,
      // Preserve current usage and period to keep enforcement behavior stable.
    },
  });
}
