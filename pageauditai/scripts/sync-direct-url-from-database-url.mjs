/**
 * Ensures DIRECT_URL exists for Prisma `directUrl` (migrations) when DATABASE_URL
 * uses Supabase transaction pooler. Reads/writes env files only; does not print secrets.
 *
 * Run from `pageauditai`: node scripts/sync-direct-url-from-database-url.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

const root = process.cwd();
const parentEnv = resolve(root, "..", ".env");
const appEnvProd = resolve(root, ".env.production");

config({ path: parentEnv });
config({ path: resolve(root, ".env"), override: true });
config({ path: resolve(root, ".env.local"), override: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Load .env first or set DATABASE_URL.");
  process.exit(1);
}

function buildDirectUrl(poolerUrlString) {
  const normalized = poolerUrlString
    .replace(/^postgresql:/i, "http:")
    .replace(/^postgres:/i, "http:");
  const u = new URL(normalized);
  const isPooler = /pooler\.supabase\.com/i.test(u.hostname);
  if (!isPooler) {
    return null;
  }
  const poolUser = u.username;
  const projectRef = poolUser.startsWith("postgres.")
    ? poolUser.slice("postgres.".length)
    : null;
  if (!projectRef) {
    console.error(
      "Could not parse project ref from DATABASE_URL username (expected postgres.<ref>).",
    );
    process.exit(1);
  }
  let password = u.password;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(password);
      if (next === password) break;
      password = next;
    } catch {
      break;
    }
  }
  const pathname = u.pathname || "/postgres";
  const params = new URLSearchParams(u.search);
  params.delete("pgbouncer");
  if (!params.get("schema")) {
    params.set("schema", "pageauditai");
  }
  if (!params.get("sslmode")) {
    params.set("sslmode", "require");
  }
  const search = params.toString();
  const directHost = `db.${projectRef}.supabase.co`;
  const out = new URL(`postgresql://postgres@${directHost}:5432${pathname}`);
  out.password = password;
  out.search = search;
  return out.toString();
}

const directUrl = buildDirectUrl(databaseUrl);
if (!directUrl) {
  console.log(
    "DATABASE_URL is not a Supabase pooler URL; set DIRECT_URL manually if you use directUrl.",
  );
  process.exit(0);
}

function upsertEnvKey(filePath, key, value) {
  const esc = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const line = `${key}="${esc}"`;
  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${line}\n`, "utf8");
    return;
  }
  let text = readFileSync(filePath, "utf8");
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) {
    text = text.replace(re, line);
  } else {
    if (!text.endsWith("\n")) text += "\n";
    text += `${line}\n`;
  }
  writeFileSync(filePath, text, "utf8");
}

upsertEnvKey(parentEnv, "DIRECT_URL", directUrl);
console.log("Updated DIRECT_URL in parent .env");

if (existsSync(appEnvProd)) {
  const prodText = readFileSync(appEnvProd, "utf8");
  if (/^DATABASE_URL=/m.test(prodText)) {
    upsertEnvKey(appEnvProd, "DIRECT_URL", directUrl);
    console.log("Updated DIRECT_URL in pageauditai/.env.production");
  } else {
    upsertEnvKey(appEnvProd, "DIRECT_URL", directUrl);
    console.log(
      "Appended DIRECT_URL to pageauditai/.env.production (DATABASE_URL not in file; set both in Vercel).",
    );
  }
}
