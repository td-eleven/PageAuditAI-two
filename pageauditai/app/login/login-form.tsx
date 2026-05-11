"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <>
      <form className="space-y-5" action={formAction}>
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-[#355777]"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className="h-11 w-full rounded-xl border border-[#cbdceb] bg-white px-3 text-sm text-[#1f3044] outline-none transition focus:border-[#8cb1d4] focus:ring-2 focus:ring-[#dbe9f6]"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-[#355777]"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            className="h-11 w-full rounded-xl border border-[#cbdceb] bg-white px-3 text-sm text-[#1f3044] outline-none transition focus:border-[#8cb1d4] focus:ring-2 focus:ring-[#dbe9f6]"
          />
        </div>

        {state?.error ? (
          <p className="text-center text-sm text-[#b42318]" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#2f6faa] text-sm font-medium text-white transition hover:bg-[#285e90] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Signing in…" : "Log In"}
        </button>
      </form>
    </>
  );
}
