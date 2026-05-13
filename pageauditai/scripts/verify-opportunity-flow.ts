import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: resolve(process.cwd(), "..", ".env") });
loadEnv({ path: resolve(process.cwd(), ".env"), override: true });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });

  if (!user?.email) {
    throw new Error("No user with email found for verification.");
  }

  const domain = await prisma.domain.upsert({
    where: { userId_name: { userId: user.id, name: "opportunity-check.local" } },
    update: {},
    create: { userId: user.id, name: "opportunity-check.local" },
    select: { id: true, name: true },
  });

  const ranks = [11, 12, 14, 17, 20];
  for (let index = 0; index < ranks.length; index += 1) {
    const term = `opportunity keyword ${index + 1}`;
    await prisma.keyword.upsert({
      where: { domainId_term: { domainId: domain.id, term } },
      update: {
        currentRank: ranks[index],
        previousRank: ranks[index] + 1,
      },
      create: {
        domainId: domain.id,
        term,
        currentRank: ranks[index],
        previousRank: ranks[index] + 1,
      },
    });
  }

  const opportunities = await prisma.keyword.findMany({
    where: {
      domainId: domain.id,
      currentRank: { gte: 11, lte: 20 },
    },
    orderBy: { currentRank: "asc" },
    select: { id: true, term: true, currentRank: true },
  });

  const previewVisible = opportunities.slice(0, 3);
  const captureEmail = user.email.toLowerCase();

  await prisma.opportunityUnlock.upsert({
    where: { domainId_email: { domainId: domain.id, email: captureEmail } },
    update: {},
    create: { domainId: domain.id, email: captureEmail },
  });
  await prisma.opportunityUnlock.upsert({
    where: { domainId_email: { domainId: domain.id, email: captureEmail } },
    update: {},
    create: { domainId: domain.id, email: captureEmail },
  });

  const captureCount = await prisma.opportunityUnlock.count({
    where: { domainId: domain.id, email: captureEmail },
  });

  console.log(
    JSON.stringify(
      {
        domain: domain.name,
        totalOpportunities: opportunities.length,
        previewVisible: previewVisible.length,
        previewTerms: previewVisible.map((item) => item.term),
        unlockedVisibleAfterCapture: opportunities.length,
        captureCountForEmailDomain: captureCount,
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
