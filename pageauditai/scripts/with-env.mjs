/**
 * Load env from parent repo `.env`, then app `.env` / `.env.local`, then exec Prisma.
 * Usage: node scripts/with-env.mjs migrate dev
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { config } from "dotenv";

const root = process.cwd();
config({ path: resolve(root, "..", ".env") });
config({ path: resolve(root, ".env"), override: true });
config({ path: resolve(root, ".env.local"), override: true });

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/with-env.mjs <prisma-args...>");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["prisma", ...prismaArgs],
  { stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
