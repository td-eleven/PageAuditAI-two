"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f4f8fd] text-[#1f3044] antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-md rounded-3xl border border-[#d3e1ef] bg-white p-8 text-center shadow-[0_12px_30px_rgba(36,77,115,0.08)]">
            <p className="text-xs font-medium tracking-wide text-[#6f89a4] uppercase">
              Application error
            </p>
            <h1 className="mt-3 font-serif text-2xl font-semibold text-[#23415f]">
              PageAuditAI hit a critical error
            </h1>
            <p className="mt-3 text-sm text-[#58728d]">
              Please refresh the page or try again later.
            </p>
            {error.digest ? (
              <p className="mt-4 rounded-xl bg-[#f4f8fd] px-3 py-2 font-mono text-xs text-[#4d6783]">
                Reference: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#2f6faa] text-sm font-medium text-white transition hover:bg-[#285e90]"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
