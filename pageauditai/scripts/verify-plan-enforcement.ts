import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PLAN_CONFIGS } from "@/lib/plans";

loadEnv({ path: resolve(process.cwd(), "..", ".env") });
loadEnv({ path: resolve(process.cwd(), ".env"), override: true });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });
  if (!user?.email) throw new Error("No user found for verification.");

  const domainCount = await prisma.domain.count({ where: { userId: user.id } });
  const keywordCount = await prisma.keyword.count({ where: { domain: { userId: user.id } } });

  const byTier = Object.values(PLAN_CONFIGS).map((tier) => ({
    tier: tier.tier,
    domains: {
      used: domainCount,
      max: tier.maxDomains,
      blocked: domainCount >= tier.maxDomains,
    },
    keywords: {
      used: keywordCount,
      max: tier.maxKeywords,
      remaining: Math.max(tier.maxKeywords - keywordCount, 0),
      blocked: keywordCount >= tier.maxKeywords,
    },
    credits: {
      monthly: tier.monthlyOpportunityCredits,
    },
  }));

  const previousPlan = await prisma.planLimit.findUnique({
    where: { userId: user.id },
    select: {
      usedOpportunityCredits: true,
      monthlyOpportunityCredits: true,
    },
  });
  if (!previousPlan) throw new Error("No PlanLimit row found.");

  await prisma.planLimit.update({
    where: { userId: user.id },
    data: { usedOpportunityCredits: 0 },
  });
  await prisma.planLimit.update({
    where: { userId: user.id },
    data: { usedOpportunityCredits: { increment: 1 } },
  });
  const afterIncrement = await prisma.planLimit.findUnique({
    where: { userId: user.id },
    select: {
      usedOpportunityCredits: true,
      monthlyOpportunityCredits: true,
    },
  });

  await prisma.planLimit.update({
    where: { userId: user.id },
    data: { usedOpportunityCredits: previousPlan.usedOpportunityCredits },
  });

  console.log(
    JSON.stringify(
      {
        verifiedUser: user.email,
        planBlockChecks: byTier,
        creditCounterUpdateCheck: {
          beforeUsed: 0,
          afterUsed: afterIncrement?.usedOpportunityCredits ?? null,
          remainingAfterOneUse:
            afterIncrement == null
              ? null
              : Math.max(
                  afterIncrement.monthlyOpportunityCredits -
                    afterIncrement.usedOpportunityCredits,
                  0,
                ),
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
