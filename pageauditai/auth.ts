import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { log } from "@/lib/logger";

/**
 * Full Auth.js instance (Node / server only). Imports Prisma — do not import
 * this module from `middleware.ts` or any Edge bundle.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);
        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.password) {
            return null;
          }
          const valid = await bcrypt.compare(password, user.password);
          if (!valid) {
            return null;
          }
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch (e) {
          log.error("[auth]", "credentials authorize database error", e);
          return null;
        }
      },
    }),
  ],
});
