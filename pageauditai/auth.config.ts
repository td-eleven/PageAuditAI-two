import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no Prisma, no DB, no credentials `authorize`).
 * Used by `middleware.ts` for JWT session checks and redirects only.
 * Keep in sync with session/JWT behavior in `auth.ts`.
 *
 * Do not call `getAuthSecret()` here: that helper throws in production when the
 * secret is missing, which runs at module load and crashes the Edge middleware
 * bundle (Vercel `MIDDLEWARE_INVOCATION_FAILED`). Resolve from env only; the
 * full `auth.ts` NextAuth instance enforces `getAuthSecret()` on Node routes.
 */
const DEV_AUTH_SECRET_FALLBACK =
  "pageauditai-dev-only-secret-min-32-chars-do-not-use-in-prod";

/** Edge bundle: never use `""` here — that blocks NextAuth's `secret ??= env` merge. */
const middlewareAuthSecret =
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  (process.env.NODE_ENV !== "production" ? DEV_AUTH_SECRET_FALLBACK : undefined);

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  ...(middlewareAuthSecret !== undefined ? { secret: middlewareAuthSecret } : {}),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
