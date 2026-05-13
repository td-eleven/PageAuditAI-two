import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { runDailyKeywordRefreshCycle } from "@/lib/keyword-refresh/service";

loadEnv({ path: resolve(process.cwd(), "..", ".env") });
loadEnv({ path: resolve(process.cwd(), ".env"), override: true });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error("No user found. Seed an admin user before verification.");
  }

  const domain = await prisma.domain.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: "refresh-check.local",
      },
    },
    update: {},
    create: {
      userId: user.id,
      name: "refresh-check.local",
    },
    select: { id: true, name: true },
  });

  const keyword = await prisma.keyword.upsert({
    where: {
      domainId_term: {
        domainId: domain.id,
        term: "page audit ai",
      },
    },
    update: {
      nextRefreshAt: new Date(Date.now() - 60_000),
    },
    create: {
      domainId: domain.id,
      term: "page audit ai",
      currentRank: 42,
      nextRefreshAt: new Date(Date.now() - 60_000),
    },
    select: { id: true },
  });

  const beforeCount = await prisma.keywordHistory.count({
    where: { keywordId: keyword.id },
  });

  const summary = await runDailyKeywordRefreshCycle();

  const after = await prisma.keyword.findUnique({
    where: { id: keyword.id },
    select: {
      id: true,
      term: true,
      currentRank: true,
      previousRank: true,
      lastRefreshedAt: true,
      nextRefreshAt: true,
      history: {
        select: { id: true, rank: true, capturedAt: true },
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
    },
  });

  const afterCount = await prisma.keywordHistory.count({
    where: { keywordId: keyword.id },
  });

  console.log(
    JSON.stringify(
      {
        verifiedUser: user.email,
        domain: domain.name,
        summary,
        keywordHistoryBefore: beforeCount,
        keywordHistoryAfter: afterCount,
        keywordSnapshot: after,
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
