/**
 * Quick check: does the seeded admin exist, and does the default password verify?
 * Run: npm run db:verify-admin
 */
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

loadEnv({ path: resolve(process.cwd(), "..", ".env") });
loadEnv({ path: resolve(process.cwd(), ".env"), override: true });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

const ADMIN_EMAIL = "thippeshdigital@gmail.com";
const ADMIN_PASSWORD = "Admin@12345";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  let host = "(unknown)";
  try {
    const u = new URL(process.env.DATABASE_URL.replace(/^postgresql:/, "http:"));
    host = u.host;
  } catch {
    /* ignore */
  }
  console.log("Database host:", host);

  const user = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, email: true, password: true },
  });

  if (!user) {
    console.error(
      `\nNo user with email "${ADMIN_EMAIL}". Run: npm run db:seed\n` +
        "(Ensure migrations ran on this same DATABASE_URL / schema.)",
    );
    process.exit(1);
  }

  console.log("User id:", user.id);
  console.log("Email in DB:", user.email);
  console.log("password_hash set:", Boolean(user.password));

  if (!user.password) {
    console.error("\nUser exists but password_hash is empty. Re-run: npm run db:seed");
    process.exit(1);
  }

  const match = await bcrypt.compare(ADMIN_PASSWORD, user.password);
  console.log('Default password "Admin@12345" matches hash:', match);

  if (!match) {
    console.error(
      "\nPassword in DB does not match the default seed password.\n" +
        "Re-run `npm run db:seed` or set a new hash (see prisma/ADMIN-SEED.md).",
    );
    process.exit(1);
  }

  console.log("\nOK — use this email/password on /login");
}

main()
  .catch((e: unknown) => {
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2021") {
      console.error(
        "\nAuth tables are missing. Apply migrations on this DATABASE_URL (or use a dedicated `?schema=` — see prisma/ADMIN-SEED.md), then run:\n  npm run db:seed\n",
      );
    } else {
      console.error(e);
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
