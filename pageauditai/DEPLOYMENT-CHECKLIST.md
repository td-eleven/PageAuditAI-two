# PageAuditAI — Production deployment checklist

Use this list when deploying to **Vercel** with **Supabase (PostgreSQL)**, **Auth.js**, **Razorpay (India)**, **Lemon Squeezy (international)**, and **scheduled keyword refresh**. Check items as you complete them.

---

## 1. Vercel setup

- [ ] Create a Vercel project linked to the correct Git repository and branch (e.g. `main`).
- [ ] Set **Root Directory** to `pageauditai` if the repo root is `PageAuditAI` (monorepo-style layout).
- [ ] Confirm **Framework Preset** is Next.js and **Build Command** matches your repo (e.g. `npm run build` from `pageauditai`).
- [ ] Confirm **Output** / Node version matches Next.js 16 requirements (see Vercel defaults for Next).
- [ ] Enable **Vercel Cron Jobs** for the project (required for keyword refresh on serverless).
- [ ] Add **CRON_SECRET** in Vercel → Settings → Environment Variables, and ensure the same value is configured for Cron Jobs (Vercel injects `Authorization: Bearer <CRON_SECRET>` when set).
- [ ] Deploy **Production** environment first; use **Preview** for PRs after production is stable.
- [ ] After first deploy, open the **Production URL** and confirm the app responds (even if auth redirects to login).

---

## 2. Required environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you use a preview database).

### Core (required in production runtime)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma / PostgreSQL connection string (use Supabase **pooled** URL for serverless when recommended by Supabase). |
| `AUTH_SECRET` | Auth.js signing secret (long random string; e.g. `openssl rand -base64 32`). |
| `AUTH_URL` | Canonical public site URL **with no trailing slash** (e.g. `https://app.yourdomain.com`). Used for redirects and callbacks. |

### Keyword refresh (Vercel Cron)

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Shared secret; cron route expects `Authorization: Bearer <CRON_SECRET>`. |
| `KEYWORD_REFRESH_HOUR_UTC` | Optional; default `2` (align cron schedule in `vercel.json` with this). |
| `KEYWORD_REFRESH_MINUTE_UTC` | Optional; default `0`. |

### Billing — Razorpay (India)

| Variable | Purpose |
|----------|---------|
| `RAZORPAY_KEY_ID` | Live key id. |
| `RAZORPAY_KEY_SECRET` | Live key secret (server only). |

### Billing — Lemon Squeezy (international)

| Variable | Purpose |
|----------|---------|
| `LEMON_SQUEEZY_API_KEY` | API key (server only). |
| `LEMON_SQUEEZY_STORE_ID` | Store id for checkout API. |
| `LEMON_SQUEEZY_VARIANT_ID` | Variant id used for checkout (map tiers to variants in Lemon Squeezy dashboard as your product requires). |

### Billing — state / safety

| Variable | Purpose |
|----------|---------|
| `BILLING_STATE_SECRET` | Optional; HMAC for signed billing callback payload (defaults to `AUTH_SECRET` if unset). |
| `BILLING_TEST_MODE` | Must be **`false` or unset** in production (app startup validation rejects `true`). |

### DataForSEO (keyword rank refresh)

| Variable | Purpose |
|----------|---------|
| `DATAFORSEO_LOGIN` | API login (if using live rank fetch). |
| `DATAFORSEO_PASSWORD` | API password (server only). |
| `DATAFORSEO_LOCATION_CODE` | Optional (e.g. `2840` for US). |
| `DATAFORSEO_LANGUAGE_CODE` | Optional (e.g. `en`). |

### Optional / TLS

| Variable | Purpose |
|----------|---------|
| `NODE_TLS_REJECT_UNAUTHORIZED` | Avoid setting to `0` in production; fix CA/certs instead. |

**Notes**

- Do **not** commit `.env` with secrets; use Vercel env UI only for production values.
- After changing env vars, **redeploy** so serverless functions pick up new values.

---

## 3. Supabase production setup

- [ ] Create a **production** Supabase project (separate from dev/staging).
- [ ] In Supabase → **SQL** or **Database**: ensure schema matches Prisma migrations (run `prisma migrate deploy` from CI or locally against production `DATABASE_URL`, or use Supabase migration workflow you prefer).
- [ ] Prefer a **connection pooler** connection string for Vercel (Supabase documents “Transaction” vs “Session” modes); avoid exhausting direct connections on cold starts.
- [ ] If you use a non-`public` schema (e.g. `?schema=pageauditai`), keep `DATABASE_URL` consistent with what Prisma migrations applied.
- [ ] Enable **RLS** policies only if you add them; current app uses Prisma with service role–style URL — lock down network and credentials instead if not using RLS.
- [ ] Configure **backups** and **Point-in-Time Recovery** per Supabase plan.
- [ ] Store **service role** / DB password only in Vercel secrets, not in the repo.
- [ ] Run **seed** only if intentional for production (usually avoid default admin seed on prod; create admin via controlled process).

---

## 4. Razorpay production setup

- [ ] Switch Razorpay dashboard to **Live** mode; use **live** API keys in Vercel (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
- [ ] Configure **webhooks** only if you add server-side webhook handlers later (current flow uses redirect + payment verification on return).
- [ ] Verify **Payment Links** or checkout API permissions match what the app calls (`/v1/payment_links` as implemented).
- [ ] Test a **small real payment** in live mode on a staging domain before full launch (optional but recommended).
- [ ] Document **support contact** and refund policy for Indian customers.

---

## 5. Lemon Squeezy production setup

- [ ] Use **live** API key in Vercel (`LEMON_SQUEEZY_API_KEY`).
- [ ] Confirm **store** and **variant** IDs match live products (`LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_VARIANT_ID`).
- [ ] If you need **separate variants per plan** (Starter / Growth / Pro), extend product configuration in Lemon Squeezy and align env or app mapping (today’s checklist assumes one variant id — adjust when you split products).
- [ ] Set **success / redirect** URLs in Lemon Squeezy product settings to match `AUTH_URL` + `/dashboard/billing/complete` behavior as implemented.
- [ ] Test checkout end-to-end on a **staging** Lemon Squeezy product if available.

---

## 6. Cron verification (keyword refresh)

- [ ] In Vercel → **Cron Jobs**: confirm a job hits `GET /api/cron/keyword-refresh` on the expected schedule (project `vercel.json` should define this).
- [ ] Confirm **`CRON_SECRET`** is set in Vercel env and matches what Cron Jobs use for the `Authorization` header.
- [ ] After deploy, open **Vercel → Logs** (or Observability) and trigger cron manually if Vercel allows, or wait for the scheduled run.
- [ ] Verify log lines for `[cron:keyword-refresh]` and **HTTP 200** responses (not 401).
- [ ] In Supabase (or Prisma Studio against prod), confirm **`keyword_history`** rows appear after a run when keywords are due.
- [ ] Confirm embedded in-process scheduler is **not** relied upon on Vercel (serverless); cron is the source of truth in production.

---

## 7. Domain configuration

- [ ] Add your **production apex or subdomain** in Vercel → Domains (e.g. `app.example.com`).
- [ ] Complete **DNS** records (CNAME / A) as instructed by Vercel; wait for SSL **certificate issued**.
- [ ] Set **`AUTH_URL`** to the **exact** public origin users use (`https://app.example.com`, no trailing slash).
- [ ] Avoid mixing `www` and non-`www` without redirects; pick one canonical host.
- [ ] If using Supabase Auth or external links later, align allowed origins — for this app, **Auth.js** + `AUTH_URL` is primary.

---

## 8. Auth callback URLs

- [ ] **Auth.js / NextAuth**: ensure production `AUTH_URL` matches the deployed origin (cookies and redirects depend on it).
- [ ] If you use **OAuth providers** later, register redirect URIs in each provider as `{AUTH_URL}/api/auth/callback/{provider}` — **Credentials-only** flows still need correct `AUTH_URL` for `signIn` / redirects.
- [ ] **Middleware** protects `/dashboard/*` and redirects unauthenticated users to `/login`; verify `/login` and `/dashboard` work on the production domain.
- [ ] Test **session persistence**: log in, hard refresh, navigate dashboard, log out (when sign-out UI exists).

---

## 9. Production security checklist

- [ ] **`AUTH_SECRET`**: long, random, unique per environment; never committed.
- [ ] **`BILLING_TEST_MODE`**: off in production (startup validation enforces this).
- [ ] **`CRON_SECRET`**: strong random value; rotate if leaked.
- [ ] **HTTPS only** (Vercel default); HSTS is set via Next config in production builds.
- [ ] **Cookie flags**: session cookies use `secure` in production (`auth.ts`); keep `AUTH_URL` on `https`.
- [ ] **No secrets in client bundles** — billing and rank APIs stay server-side only.
- [ ] **Database URL**: least privilege DB user if possible; not the Supabase dashboard “postgres” superuser in prod if avoidable.
- [ ] **Dependencies**: run `npm audit` periodically; keep Next / Prisma patched.
- [ ] **Error UI**: confirm `app/error.tsx` / `global-error.tsx` show friendly messages (no stack traces to end users).
- [ ] **Logging**: confirm production logs do not include passwords, raw tokens, or full payment payloads (central logger redacts sensitive keys).

---

## 10. Post-deployment smoke tests

Run these in order on the **production URL** (or a staging URL that mirrors prod config).

### Auth

- [ ] Open `/login`, sign in with a known production user (or create user via controlled process).
- [ ] Confirm redirect to `/dashboard` and no middleware loop.

### Dashboard — domains & keywords

- [ ] List domains; add domain (within plan); edit name; delete (if allowed).
- [ ] Add keyword; edit term; delete; confirm counts and caps match **PlanLimit**.

### Plan enforcement

- [ ] Confirm **Starter / Growth / Pro** limits block when at cap (domains / keywords / opportunity credits) with clear messages.

### Opportunity scanner

- [ ] Select domain with keywords in rank **11–20**; confirm preview (3 rows) and gated unlock after email capture (if applicable).

### Billing

- [ ] Open `/dashboard/billing`; confirm current plan and pricing display.
- [ ] **India**: start checkout → Razorpay flow opens (live keys).
- [ ] **International**: start checkout → Lemon Squeezy flow opens.
- [ ] Complete a **test** or small real payment; land on `/dashboard/billing/complete`; confirm **PlanLimit** tier and limits updated.

### Keyword refresh

- [ ] After cron window (or manual cron), confirm `lastRefreshedAt` / `nextRefreshAt` and new **`keyword_history`** rows for due keywords.

### Resilience

- [ ] Hit a non-existent route → 404 (`/_not-found`).
- [ ] Temporarily break a server component (staging only) → error boundary shows friendly message.

---

## Quick reference — minimum Production env block

```
DATABASE_URL=postgresql://...?sslmode=require (or pooler URL)
AUTH_SECRET=<32+ bytes random>
AUTH_URL=https://your-production-host
CRON_SECRET=<random>
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
LEMON_SQUEEZY_API_KEY=...
LEMON_SQUEEZY_STORE_ID=...
LEMON_SQUEEZY_VARIANT_ID=...
DATAFORSEO_LOGIN=...   (optional if ranks required)
DATAFORSEO_PASSWORD=...
```

Optional: `BILLING_STATE_SECRET`, `KEYWORD_REFRESH_HOUR_UTC`, `KEYWORD_REFRESH_MINUTE_UTC`.

---

**Document version:** generated for PageAuditAI (Next.js app in `pageauditai/`). Adjust provider-specific steps when you split Lemon Squeezy variants per tier or add webhooks.
