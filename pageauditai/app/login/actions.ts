"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export type LoginState = { error?: string } | null;

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
    await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError && err.type === "CredentialsSignin") {
      return { error: "Invalid email or password." };
    }
    console.error(err);
    return { error: "Something went wrong. Please try again." };
  }

  redirect("/dashboard");
}
