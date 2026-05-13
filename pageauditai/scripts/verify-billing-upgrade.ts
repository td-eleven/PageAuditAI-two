import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { upgradeUserPlan } from "@/lib/billing/upgrade";
import { providerForCountry, displayPlanPricing } from "@/lib/billing/config";

loadEnv({ path: resolve(process.cwd(), "..", ".env") });
loadEnv({ path: resolve(process.cwd(), ".env"), override: true });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });
  if (!user) throw new Error("No user found for billing verification.");

  const before = await prisma.planLimit.findUnique({ where: { userId: user.id } });
  const upgraded = await upgradeUserPlan(user.id, "Growth");
  const after = await prisma.planLimit.findUnique({ where: { userId: user.id } });

  if (before?.planTier) {
    await upgradeUserPlan(user.id, before.planTier);
  }

  console.log(
    JSON.stringify(
      {
        verifiedUser: user.email,
        providerRouting: {
          IN: providerForCountry("IN"),
          US: providerForCountry("US"),
        },
        pricingSamples: {
          starter: displayPlanPricing("Starter"),
          growth: displayPlanPricing("Growth"),
          pro: displayPlanPricing("Pro"),
        },
        before: before
          ? {
              tier: before.planTier,
              maxDomains: before.maxDomains,
              maxKeywords: before.maxKeywords,
              monthlyOpportunityCredits: before.monthlyOpportunityCredits,
            }
          : null,
        upgraded: {
          tier: upgraded.planTier,
          maxDomains: upgraded.maxDomains,
          maxKeywords: upgraded.maxKeywords,
          monthlyOpportunityCredits: upgraded.monthlyOpportunityCredits,
        },
        after: after
          ? {
              tier: after.planTier,
              maxDomains: after.maxDomains,
              maxKeywords: after.maxKeywords,
              monthlyOpportunityCredits: after.monthlyOpportunityCredits,
            }
          : null,
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
