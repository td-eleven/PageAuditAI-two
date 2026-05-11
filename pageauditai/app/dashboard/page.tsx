const sidebarItems = [
  "Dashboard",
  "Keywords",
  "Opportunities",
  "Reports",
  "Billing",
  "Settings",
];

const analyticsCards = [
  { label: "Tracked Pages", value: "128", note: "Across active projects" },
  { label: "Keyword Groups", value: "24", note: "Placeholder scope" },
  { label: "Open Opportunities", value: "11", note: "Needs review" },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fd] text-[#1f3044]">
      <div className="mx-auto flex w-full max-w-[1280px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 rounded-3xl border border-[#d3e1ef] bg-white p-5 shadow-[0_12px_30px_rgba(36,77,115,0.08)] lg:block">
          <p className="text-xs font-medium tracking-[0.2em] text-[#6f89a4] uppercase">
            PageAuditAI
          </p>
          <nav className="mt-6 space-y-1">
            {sidebarItems.map((item, index) => (
              <a
                key={item}
                href="#"
                className={`flex h-10 items-center rounded-xl px-3 text-sm font-medium transition ${
                  index === 0
                    ? "bg-[#eaf2fb] text-[#2f6faa]"
                    : "text-[#4d6783] hover:bg-[#f4f8fd]"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1 space-y-6">
          <header className="rounded-3xl border border-[#d3e1ef] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(36,77,115,0.06)] sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium tracking-wide text-[#6f89a4] uppercase">
                  Workspace Overview
                </p>
                <h1 className="mt-1 font-serif text-2xl font-semibold text-[#23415f] sm:text-3xl">
                  Dashboard
                </h1>
              </div>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#cbdceb] bg-white px-4 text-sm font-medium text-[#355777] transition hover:bg-[#eef4fb]"
              >
                New Report
              </button>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            {analyticsCards.map((card) => (
              <article
                key={card.label}
                className="rounded-2xl border border-[#d3e1ef] bg-white p-5 shadow-[0_6px_18px_rgba(36,77,115,0.06)]"
              >
                <p className="text-xs font-medium tracking-wide text-[#6f89a4] uppercase">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#23415f]">
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-[#58728d]">{card.note}</p>
              </article>
            ))}
          </div>

          <section className="rounded-3xl border border-[#d3e1ef] bg-white p-5 shadow-[0_8px_24px_rgba(36,77,115,0.06)] sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold text-[#23415f]">
                Performance Table
              </h2>
              <a href="#" className="text-sm font-medium text-[#3e6487]">
                View all
              </a>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#e0eaf4]">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead className="bg-[#f7fbff] text-[#5f7a96]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Page</th>
                    <th className="px-4 py-3 font-medium">Health</th>
                    <th className="px-4 py-3 font-medium">Primary Keyword</th>
                    <th className="px-4 py-3 font-medium">Last Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t border-[#edf3f9] text-[#355777]">
                      <td className="px-4 py-3">/placeholder-page-{index + 1}</td>
                      <td className="px-4 py-3">Pending</td>
                      <td className="px-4 py-3">keyword placeholder</td>
                      <td className="px-4 py-3">--</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-3xl border border-[#d3e1ef] bg-white p-5 shadow-[0_8px_24px_rgba(36,77,115,0.06)] sm:p-6 lg:col-span-1">
              <h3 className="font-serif text-xl font-semibold text-[#23415f]">
                Keyword Tracking
              </h3>
              <p className="mt-2 text-sm text-[#58728d]">
                Placeholder area for tracked terms, movement, and visibility
                summaries.
              </p>
              <div className="mt-5 space-y-3">
                {["Core Product Terms", "Feature Terms", "Comparison Terms"].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] px-3 py-2 text-sm text-[#4d6783]"
                    >
                      {item}
                    </div>
                  )
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-[#d3e1ef] bg-white p-5 shadow-[0_8px_24px_rgba(36,77,115,0.06)] sm:p-6 lg:col-span-1">
              <h3 className="font-serif text-xl font-semibold text-[#23415f]">
                Opportunities
              </h3>
              <p className="mt-2 text-sm text-[#58728d]">
                Placeholder for prioritized ideas based on page quality and
                ranking potential.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-[#4d6783]">
                <li className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] px-3 py-2">
                  Improve heading clarity on landing pages
                </li>
                <li className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] px-3 py-2">
                  Expand copy depth on high-intent pages
                </li>
              </ul>
            </section>

            <section className="rounded-3xl border border-[#d3e1ef] bg-white p-5 shadow-[0_8px_24px_rgba(36,77,115,0.06)] sm:p-6 lg:col-span-1">
              <h3 className="font-serif text-xl font-semibold text-[#23415f]">
                Recent Updates
              </h3>
              <p className="mt-2 text-sm text-[#58728d]">
                Placeholder timeline for team activity and report changes.
              </p>
              <div className="mt-4 space-y-3 text-sm text-[#4d6783]">
                <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] px-3 py-2">
                  New weekly audit template created
                </div>
                <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] px-3 py-2">
                  Keyword group synced successfully
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
