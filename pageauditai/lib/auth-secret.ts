/**
 * Auth.js requires a non-empty `secret` for JWT and cookies.
 *
 * - Set `AUTH_SECRET` in `.env` (see `.env.example`).
 * - `next build` may run with `NODE_ENV=production` but no `.env`; a temporary
 *   fallback is used only during the `build` npm lifecycle so the compile succeeds.
 * - `next start` / production hosting must set `AUTH_SECRET` or startup will fail.
 */
const DEV_FALLBACK_SECRET =
  "pageauditai-dev-only-secret-min-32-chars-do-not-use-in-prod";

let devWarned = false;

export function getAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }

  const isProd = process.env.NODE_ENV === "production";
  // Edge (middleware) has no `process.argv`; only Node has it.
  const argv = Array.isArray(globalThis.process?.argv)
    ? globalThis.process.argv.join(" ")
    : "";
  const isNextBuildContext =
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_PHASE === "phase-production-build" ||
    (argv.includes("next") && argv.includes("build"));

  if (isProd && !isNextBuildContext) {
    throw new Error(
      "AUTH_SECRET is missing or empty. Set AUTH_SECRET in your environment before running the production server (`next start`, Docker, Vercel env vars, etc.).",
    );
  }

  if (isProd && isNextBuildContext) {
    console.warn(
      "[auth] AUTH_SECRET not set during production build; using a temporary build-only default. Set AUTH_SECRET before `next start` or deploy.",
    );
    return DEV_FALLBACK_SECRET;
  }

  if (!devWarned) {
    devWarned = true;
    console.warn(
      "[auth] AUTH_SECRET is not set — using a local development fallback. Add AUTH_SECRET to .env for stable, private sessions.",
    );
  }

  return DEV_FALLBACK_SECRET;
}
