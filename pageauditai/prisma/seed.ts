/**
 * Local admin seed — creates or updates a single credentials user.
 * Run: `npm run db:seed` (requires DATABASE_URL and applied migrations).
 *
 * To use different defaults, edit the constants below before running,
 * or follow `prisma/ADMIN-SEED.md` to change credentials after seeding.
 */
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getPlanConfig } from "@/lib/plans";

// Parent `.env` then app `.env` / `.env.local` (later files override).
loadEnv({ path: resolve(process.cwd(), "..", ".env") });
loadEnv({ path: resolve(process.cwd(), ".env"), override: true });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

/** Default local admin — change here before seeding if you prefer. */
const ADMIN_EMAIL = "thippeshdigital@gmail.com";
const ADMIN_PASSWORD = "Admin@12345";
const ADMIN_NAME = "Admin";

/** Default local admin plan is Pro for internal testing. */
const DEFAULT_PLAN = getPlanConfig("Pro");

const BCRYPT_ROUNDS = 12;

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      "DATABASE_URL is not set. Add it to `pageauditai/.env` (or parent `.env`) before seeding.",
    );
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      password: passwordHash,
    },
    update: {
      name: ADMIN_NAME,
      password: passwordHash,
    },
  });

  await prisma.planLimit.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      planTier: DEFAULT_PLAN.tier,
      maxDomains: DEFAULT_PLAN.maxDomains,
      maxKeywords: DEFAULT_PLAN.maxKeywords,
      monthlyOpportunityCredits: DEFAULT_PLAN.monthlyOpportunityCredits,
      usedOpportunityCredits: 0,
      creditPeriodStart: new Date(),
    },
    update: {
      planTier: DEFAULT_PLAN.tier,
      maxDomains: DEFAULT_PLAN.maxDomains,
      maxKeywords: DEFAULT_PLAN.maxKeywords,
      monthlyOpportunityCredits: DEFAULT_PLAN.monthlyOpportunityCredits,
    },
  });

  console.log("Admin user ready (credentials provider):");
  console.log(`  Email:    ${user.email}`);
  console.log(`  Name:     ${user.name ?? "(none)"}`);
  console.log(`  User id:  ${user.id}`);
  console.log("");
  console.log(
    `Plan limits for this user: tier=${DEFAULT_PLAN.tier}, maxDomains=${DEFAULT_PLAN.maxDomains}, maxKeywords=${DEFAULT_PLAN.maxKeywords}, monthlyOpportunityCredits=${DEFAULT_PLAN.monthlyOpportunityCredits} (usedOpportunityCredits left unchanged on re-seed).`,
  );
  console.log("");
  console.log(
    "Sign in at /login with the password from this seed script (see prisma/ADMIN-SEED.md).",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
