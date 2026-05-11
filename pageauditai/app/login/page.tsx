import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fd] px-6 py-12 text-[#1f3044] sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center justify-center">
        <section className="w-full rounded-3xl border border-[#d3e1ef] bg-white p-7 shadow-[0_16px_40px_rgba(36,77,115,0.10)] sm:p-8">
          <div className="mb-8 text-center">
            <p className="text-xs font-medium tracking-[0.2em] text-[#6f89a4] uppercase">
              PageAuditAI
            </p>
            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#23415f]">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-[#58728d]">
              Sign in to continue to your workspace.
            </p>
          </div>

          <form className="space-y-5" action="#">
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
                placeholder="Enter your password"
                className="h-11 w-full rounded-xl border border-[#cbdceb] bg-white px-3 text-sm text-[#1f3044] outline-none transition focus:border-[#8cb1d4] focus:ring-2 focus:ring-[#dbe9f6]"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#2f6faa] text-sm font-medium text-white transition hover:bg-[#285e90]"
            >
              Log In
            </button>
          </form>

          <div className="mt-5 text-center">
            <a
              href="#"
              className="text-sm font-medium text-[#3e6487] transition hover:text-[#2f6faa]"
            >
              Forgot password?
            </a>
          </div>

          <div className="mt-8 border-t border-[#e4edf6] pt-5 text-center">
            <Link
              href="/"
              className="text-xs font-medium tracking-wide text-[#6f89a4] uppercase transition hover:text-[#3e6487]"
            >
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
