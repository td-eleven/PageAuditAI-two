"use server";

import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { log } from "@/lib/logger";

export type LoginState = { error?: string } | null;

function authErrorFromCallbackUrl(callbackUrl: string): string | null {
  try {
    const base =
      process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    const u = new URL(callbackUrl, base);
    return u.searchParams.get("error");
  } catch {
    const m = /[?&]error=([^&]+)/i.exec(callbackUrl);
    return m ? decodeURIComponent(m[1]) : null;
  }
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/dashboard",
    });

    // With `redirect: false`, Auth.js usually returns a URL string instead of throwing.
    if (typeof result === "string") {
      const errCode = authErrorFromCallbackUrl(result);
      if (errCode === "CredentialsSignin") {
        return { error: "Invalid email or password." };
      }
      if (errCode) {
        log.error("[login]", "auth returned error code", { errCode });
        return {
          error:
            process.env.NODE_ENV === "development"
              ? `Sign-in failed (${errCode}). Check the terminal, DATABASE_URL, migrations, and that the admin user was seeded.`
              : "Could not sign in. Please try again later.",
        };
      }
      // `redirect()` throws a special error; must not be treated as a failed login.
      redirect(result);
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    if (err instanceof AuthError && err.type === "CredentialsSignin") {
      return { error: "Invalid email or password." };
    }
    log.error("[login]", "unexpected sign-in error", err);
    return {
      error:
        process.env.NODE_ENV === "development"
          ? "Sign-in failed (see server logs)."
          : "Something went wrong. Please try again.",
    };
  }

  redirect("/dashboard");
}
