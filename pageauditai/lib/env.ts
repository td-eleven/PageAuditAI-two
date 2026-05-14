/**
 * Startup environment checks for Vercel / production vs local development.
 */

function isProductionBuild(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    (process.env.npm_lifecycle_event === "build" ||
      process.env.NEXT_PHASE === "phase-production-build")
  );
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" && !isProductionBuild();
}

/**
 * Supabase pooler URLs need a separate DIRECT_URL for Prisma migrations (direct host).
 */
function warnIfSupabasePoolerWithoutDirectUrl(): void {
  const db = process.env.DATABASE_URL ?? "";
  if (!/pooler\.supabase\.com/i.test(db)) return;
  if (process.env.DIRECT_URL?.trim()) return;
  console.warn(
    "[env] DATABASE_URL uses a Supabase pooler but DIRECT_URL is not set. " +
      "Prisma migrations need DIRECT_URL (direct db.*.supabase.co:5432). See pageauditai/.env.example and npm run db:sync-direct-url.",
  );
}

/**
 * Supabase "Session" / direct URLs use `db.<ref>.supabase.co:5432`. Vercel serverless
 * often cannot reach that host (IPv6 / routing / cold starts). Use the Transaction
 * pooler URI from Supabase → Settings → Database (port 6543, `*.pooler.supabase.com`).
 */
function warnIfSupabaseDirectDatabaseUrlOnVercel(databaseUrl: string): void {
  if (process.env.VERCEL !== "1") return;
  try {
    const normalized = databaseUrl
      .replace(/^postgresql:/i, "http:")
      .replace(/^postgres:/i, "http:");
    const u = new URL(normalized);
    if (!u.hostname.startsWith("db.") || !u.hostname.endsWith(".supabase.co")) {
      return;
    }
    const port = u.port || "5432";
    if (port !== "5432") return;
    console.warn(
      "[env] DATABASE_URL uses Supabase direct DB (db.*.supabase.co:5432). " +
        "Vercel serverless often cannot reach it. Replace with the Transaction pooler " +
        "connection string (Supabase Dashboard → Settings → Database), and add " +
        "`?pgbouncer=true` (and your `schema=` query param) to the pooler URL for Prisma.",
    );
  } catch {
    /* ignore parse errors */
  }
}

/**
 * Call from `instrumentation.ts` (Node runtime). Throws on fatal misconfiguration
 * so the process fails fast with a clear message (Vercel logs).
 */
export function validateProductionEnvironment(): void {
  if (!isProductionRuntime()) {
    return;
  }

  const missing: string[] = [];
  const requireEnv = (name: string, value: string | undefined) => {
    if (!value?.trim()) missing.push(name);
  };

  requireEnv("DATABASE_URL", process.env.DATABASE_URL);
  requireEnv("AUTH_SECRET", process.env.AUTH_SECRET);
  requireEnv("AUTH_URL", process.env.AUTH_URL);

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables for production: ${missing.join(", ")}. ` +
        "Set them in Vercel Project Settings → Environment Variables.",
    );
  }

  warnIfSupabaseDirectDatabaseUrlOnVercel(process.env.DATABASE_URL ?? "");
  warnIfSupabasePoolerWithoutDirectUrl();

  if (process.env.VERCEL === "1" && !process.env.CRON_SECRET?.trim()) {
    console.warn(
      "[env] CRON_SECRET is not set. Vercel Cron calls to /api/cron/keyword-refresh will return 401 until you set CRON_SECRET and redeploy.",
    );
  }

  if (process.env.BILLING_TEST_MODE === "true") {
    throw new Error(
      "[env] BILLING_TEST_MODE must not be enabled in production. Set it to false or unset.",
    );
  }
}

/**
 * Development warnings only (does not throw).
 */
export function validateDevelopmentEnvironment(): void {
  if (isProductionRuntime() || isProductionBuild()) return;

  if (!process.env.DATABASE_URL?.trim()) {
    console.warn(
      "[env] DATABASE_URL is not set. Prisma and auth will fail until you configure it.",
    );
  }
  if (!process.env.AUTH_URL?.trim()) {
    console.warn(
      "[env] AUTH_URL is not set. Auth redirects may be wrong; set e.g. http://localhost:3000",
    );
  }
}

export function validateEnvironmentOnStartup(): void {
  validateDevelopmentEnvironment();
  try {
    validateProductionEnvironment();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    throw e;
  }
}
