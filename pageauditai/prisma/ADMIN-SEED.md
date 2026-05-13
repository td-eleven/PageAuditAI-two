# Local admin seed (PageAuditAI)

This project seeds **one** credentials user for local development. There is **no** public signup or registration UI.

## Default account (after seed)

| Field    | Value |
|----------|--------|
| Email    | `thippeshdigital@gmail.com` |
| Password | `Admin@12345` |

**Treat this as a local-only default.** Change the password (and ideally the email) before any real deployment.

## Prerequisites

1. PostgreSQL reachable from your machine.
2. `DATABASE_URL` in `pageauditai/.env` or `PageAuditAI/.env` (parent folder is also loaded — `npm run db:*` uses `scripts/with-env.mjs` so Prisma sees that URL).
3. Schema applied: `npm run db:migrate` (local dev) or `npm run db:migrate:deploy` (CI / production).

### Shared Supabase (or any DB with other tables in `public`)

If `npm run db:migrate` reports **drift** (other tables in `public`) or `db push` wants to **drop** unrelated tables, **do not reset** the whole database unless you intend to wipe it.

**Recommended:** give PageAuditAI its own Postgres schema:

1. In the SQL editor (or `psql`), run:  
   `CREATE SCHEMA IF NOT EXISTS pageauditai;`
2. Point Prisma at that schema (append to your URL):  
   `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?schema=pageauditai"`
3. Run:  
   `npm run db:migrate` (or `npm run db:migrate:deploy`)  
   then `npm run db:seed`.

Auth.js tables will live only under that schema and will not touch existing `public` tables.

## Run the seed

From the `pageauditai` directory:

```bash
npm run db:seed
```

Equivalent:

```bash
npx prisma db seed
```

## Change the password later

**Option A — Re-seed (simplest)**  
1. Edit `prisma/seed.ts`: set `ADMIN_PASSWORD` (and optionally `ADMIN_EMAIL`) to the new values.  
2. Run `npm run db:seed` again.  
   The script **upserts** by email, so the stored bcrypt hash is updated.

**Option B — Prisma Studio**  
1. Run `npm run db:studio`.  
2. Open the `users` table, find your admin row.  
3. Set `password_hash` to a bcrypt hash (see Option C for generating a hash).

**Option C — Generate a bcrypt hash in Node** (from `pageauditai`):

```bash
node -e "console.log(require('bcryptjs').hashSync('YourNewPassword', 12))"
```

Copy the output into `password_hash` for that user (Studio or SQL).

## Change the email later

Emails must stay **unique**.

1. **Prisma Studio:** edit the `email` field on the user row (ensure no conflict with another row).  
2. **Or** update `ADMIN_EMAIL` in `prisma/seed.ts`, run `npm run db:seed` to upsert the new email — then remove or rename the old row in Studio if you no longer need it.

## Auth

Sign in at **`/login`** with credentials only. The existing NextAuth + Prisma flow is unchanged; this seed only ensures a user row exists with a bcrypt `password_hash`.
