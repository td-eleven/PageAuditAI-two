import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: resolve(process.cwd(), "..", ".env") });
loadEnv({ path: resolve(process.cwd(), ".env"), override: true });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const [keywordCount, historyCount, latestKeyword] = await Promise.all([
    prisma.keyword.count(),
    prisma.keywordHistory.count(),
    prisma.keyword.findFirst({
      orderBy: [{ lastRefreshedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        term: true,
        lastRefreshedAt: true,
        nextRefreshAt: true,
      },
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        keywordCount,
        historyCount,
        latestKeyword,
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
