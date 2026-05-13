import type { PlanLimit, PlanTier } from "@prisma/client";

export type PlanConfig = {
  tier: PlanTier;
  maxDomains: number;
  maxKeywords: number;
  monthlyOpportunityCredits: number;
};

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  Starter: {
    tier: "Starter",
    maxDomains: 1,
    maxKeywords: 50,
    monthlyOpportunityCredits: 3,
  },
  Growth: {
    tier: "Growth",
    maxDomains: 3,
    maxKeywords: 250,
    monthlyOpportunityCredits: 10,
  },
  Pro: {
    tier: "Pro",
    maxDomains: 5,
    maxKeywords: 1000,
    monthlyOpportunityCredits: 25,
  },
};

export function getPlanConfig(tier: PlanTier): PlanConfig {
  return PLAN_CONFIGS[tier];
}

export function getCreditPeriodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
}

export function isNewCreditPeriod(planLimit: Pick<PlanLimit, "creditPeriodStart">, now: Date) {
  return getCreditPeriodKey(planLimit.creditPeriodStart) !== getCreditPeriodKey(now);
}
