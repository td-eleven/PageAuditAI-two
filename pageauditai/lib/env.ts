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
