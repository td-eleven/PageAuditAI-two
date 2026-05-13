import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  getLastRefreshRun,
  getRefreshScheduleConfig,
} from "@/lib/keyword-refresh/service";
import {
  addDomainAction,
  addKeywordAction,
  captureOpportunityEmailAction,
  deleteDomainAction,
  deleteKeywordAction,
  runOpportunityAnalysisAction,
  updateDomainAction,
  updateKeywordAction,
} from "./actions";
import { NextRefreshCountdown } from "./next-refresh-countdown";

const sidebarItems = [
  "Dashboard",
  "Keywords",
  "Opportunities",
  "Reports",
  "Billing",
  "Settings",
];

function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function unlockCookieKey(domainId: string): string {
  return `opp_unlock_${domainId}`;
}

type DashboardSearchParams = Promise<{
  domainId?: string;
  error?: string;
  message?: string;
}>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const params = await searchParams;
  const selectedDomainIdFromParams = params.domainId?.trim();

  const [domains, rawPlanLimit] = await Promise.all([
    prisma.domain.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { keywords: true } } },
    }),
    prisma.planLimit.findUnique({ where: { userId } }),
  ]);
  const planLimit = rawPlanLimit;

  const selectedDomain =
    domains.find((item) => item.id === selectedDomainIdFromParams) ?? domains[0] ?? null;

  const keywords = selectedDomain
    ? await prisma.keyword.findMany({
        where: { domainId: selectedDomain.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          term: true,
          currentRank: true,
          previousRank: true,
          opportunityScore: true,
          lastRefreshedAt: true,
          nextRefreshAt: true,
          createdAt: true,
        },
      })
    : [];
  const cookieStore = await cookies();
  const opportunityKeywords = keywords.filter(
    (keyword) =>
      typeof keyword.currentRank === "number" &&
      keyword.currentRank >= 11 &&
      keyword.currentRank <= 20,
  );
  const previewCount = 3;
  const visibleOpportunityKeywords = opportunityKeywords.slice(0, previewCount);
  const isSessionUnlocked = selectedDomain
    ? cookieStore.get(unlockCookieKey(selectedDomain.id))?.value === "1"
    : false;
  const isUnlocked = isSessionUnlocked || opportunityKeywords.length <= previewCount;
  const displayedOpportunityKeywords = isUnlocked
    ? opportunityKeywords
    : visibleOpportunityKeywords;
  const lastScannedAt =
    opportunityKeywords.length > 0
      ? opportunityKeywords.reduce<Date | null>((latest, keyword) => {
          if (!keyword.lastRefreshedAt) return latest;
          if (!latest) return keyword.lastRefreshedAt;
          return keyword.lastRefreshedAt > latest ? keyword.lastRefreshedAt : latest;
        }, null)
      : null;

  const totalKeywords = domains.reduce((sum, item) => sum + item._count.keywords, 0);
  const remainingKeywords = planLimit
    ? Math.max(planLimit.maxKeywords - totalKeywords, 0)
    : null;
  const totalOpportunities = opportunityKeywords.length;
  const domainCapReached = !!planLimit && domains.length >= planLimit.maxDomains;
  const remainingOpportunityCredits = planLimit
    ? Math.max(
        planLimit.monthlyOpportunityCredits - planLimit.usedOpportunityCredits,
        0,
      )
    : null;
  const latestKeywordRefresh =
    keywords.length > 0
      ? keywords.reduce<Date | null>((latest, keyword) => {
          if (!keyword.lastRefreshedAt) return latest;
          if (!latest) return keyword.lastRefreshedAt;
          return keyword.lastRefreshedAt > latest ? keyword.lastRefreshedAt : latest;
        }, null)
      : null;
  const nextKeywordRefresh =
    keywords.length > 0
      ? keywords.reduce<Date | null>((nearest, keyword) => {
          if (!keyword.nextRefreshAt) return nearest;
          if (!nearest) return keyword.nextRefreshAt;
          return keyword.nextRefreshAt < nearest ? keyword.nextRefreshAt : nearest;
        }, null)
      : null;
  const schedule = getRefreshScheduleConfig();
  const lastRun = getLastRefreshRun();

  return (
    <main className="min-h-screen bg-[#f4f8fd] text-[#1f3044]">
      <div className="mx-auto flex w-full max-w-[1280px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 rounded-3xl border border-[#d3e1ef] bg-white p-5 shadow-[0_12px_30px_rgba(36,77,115,0.08)] lg:block">
          <p className="text-xs font-medium tracking-[0.2em] text-[#6f89a4] uppercase">
            PageAuditAI
          </p>
          <nav className="mt-6 space-y-1">
            {sidebarItems.map((item, index) => (
              <span
                key={item}
                className={`flex h-10 items-center rounded-xl px-3 text-sm font-medium transition ${
                  index === 0
                    ? "bg-[#eaf2fb] text-[#2f6faa]"
                    : "text-[#4d6783] hover:bg-[#f4f8fd]"
                }`}
              >
                {item}
              </span>
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
              <Link
                href="/dashboard/billing"
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#cbdceb] bg-white px-4 text-sm font-medium text-[#355777] transition hover:bg-[#eef4fb]"
              >
                Manage Billing
              </Link>
            </div>
            {params.error ? (
              <p className="mt-4 rounded-xl border border-[#f6d0cf] bg-[#fff7f7] px-4 py-2 text-sm text-[#b42318]">
                {params.error}
              </p>
            ) : null}
            {params.message ? (
              <p className="mt-4 rounded-xl border border-[#c9e8cf] bg-[#f5fff7] px-4 py-2 text-sm text-[#1f7a36]">
                {params.message}
              </p>
            ) : null}
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-[#d3e1ef] bg-white p-5 shadow-[0_6px_18px_rgba(36,77,115,0.06)]">
              <p className="text-xs font-medium tracking-wide text-[#6f89a4] uppercase">
                Tracked Domains
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#23415f]">
                {domains.length}
              </p>
              <p className="mt-2 text-sm text-[#58728d]">
                Plan limit: {planLimit?.maxDomains ?? "Unlimited"}
              </p>
            </article>
            <article className="rounded-2xl border border-[#d3e1ef] bg-white p-5 shadow-[0_6px_18px_rgba(36,77,115,0.06)]">
              <p className="text-xs font-medium tracking-wide text-[#6f89a4] uppercase">
                Tracked Keywords
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#23415f]">
                {totalKeywords}
              </p>
              <p className="mt-2 text-sm text-[#58728d]">
                {remainingKeywords !== null
                  ? `${remainingKeywords} remaining of ${planLimit?.maxKeywords}`
                  : selectedDomain
                    ? `For ${selectedDomain.name}`
                    : "Select a domain"}
              </p>
            </article>
            <article className="rounded-2xl border border-[#d3e1ef] bg-white p-5 shadow-[0_6px_18px_rgba(36,77,115,0.06)]">
              <p className="text-xs font-medium tracking-wide text-[#6f89a4] uppercase">
                Opportunity Credits
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#23415f]">
                {remainingOpportunityCredits ?? "—"}
              </p>
              <p className="mt-2 text-sm text-[#58728d]">
                {planLimit
                  ? `${planLimit.usedOpportunityCredits}/${planLimit.monthlyOpportunityCredits} used this period`
                  : "No plan assigned"}
              </p>
            </article>
          </div>

          <section className="rounded-3xl border border-[#d3e1ef] bg-white p-5 shadow-[0_8px_24px_rgba(36,77,115,0.06)] sm:p-6">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] p-3">
                <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Current Plan</p>
                <p className="mt-1 text-sm font-medium text-[#23415f]">
                  {planLimit?.planTier ?? "Starter"}
                </p>
              </div>
              <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] p-3">
                <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Domains Used</p>
                <p className="mt-1 text-sm font-medium text-[#23415f]">
                  {domains.length}/{planLimit?.maxDomains ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] p-3">
                <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Keywords Used</p>
                <p className="mt-1 text-sm font-medium text-[#23415f]">
                  {totalKeywords}/{planLimit?.maxKeywords ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] p-3">
                <p className="text-xs uppercase tracking-wide text-[#6f89a4]">
                  Remaining Opportunity Credits
                </p>
                <p className="mt-1 text-sm font-medium text-[#23415f]">
                  {remainingOpportunityCredits ?? "—"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#d3e1ef] bg-white p-5 shadow-[0_8px_24px_rgba(36,77,115,0.06)] sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-serif text-xl font-semibold text-[#23415f]">
                  Daily Keyword Refresh
                </h2>
                <p className="mt-1 text-sm text-[#58728d]">
                  Scheduled once daily at {schedule.hourUtc.toString().padStart(2, "0")}:
                  {schedule.minuteUtc.toString().padStart(2, "0")} UTC
                </p>
              </div>
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                  lastRun?.status === "failed"
                    ? "bg-[#fff1f0] text-[#a13830]"
                    : lastRun?.status === "success"
                      ? "bg-[#edf9f0] text-[#1f7a36]"
                      : "bg-[#eef4fb] text-[#355777]"
                }`}
              >
                {lastRun ? `Last run: ${lastRun.status}` : "Awaiting first run"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] p-3">
                <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Next Refresh In</p>
                <p className="mt-1 text-sm font-medium text-[#23415f]">
                  <NextRefreshCountdown
                    nextRefreshIso={nextKeywordRefresh ? nextKeywordRefresh.toISOString() : null}
                  />
                </p>
              </div>
              <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] p-3">
                <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Last Refreshed</p>
                <p className="mt-1 text-sm font-medium text-[#23415f]">
                  {formatDateTime(latestKeywordRefresh)}
                </p>
              </div>
              <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] p-3">
                <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Last Job Summary</p>
                <p className="mt-1 text-sm font-medium text-[#23415f]">
                  {lastRun
                    ? `${lastRun.refreshedKeywords}/${lastRun.scannedKeywords} refreshed`
                    : "No runs yet"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#d3e1ef] bg-white p-5 shadow-[0_8px_24px_rgba(36,77,115,0.06)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-xl font-semibold text-[#23415f]">
                  Opportunity Scanner
                </h2>
                <p className="mt-1 text-sm text-[#58728d]">
                  Position 11-20 keywords for{" "}
                  {selectedDomain ? selectedDomain.name : "the selected domain"}.
                </p>
              </div>
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                  isUnlocked
                    ? "bg-[#edf9f0] text-[#1f7a36]"
                    : "bg-[#eef4fb] text-[#355777]"
                }`}
              >
                {isUnlocked ? "Unlocked" : "Preview only"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] p-3">
                <p className="text-xs uppercase tracking-wide text-[#6f89a4]">
                  Total Opportunities
                </p>
                <p className="mt-1 text-sm font-medium text-[#23415f]">
                  {totalOpportunities}
                </p>
              </div>
              <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] p-3">
                <p className="text-xs uppercase tracking-wide text-[#6f89a4]">
                  Preview Visibility
                </p>
                <p className="mt-1 text-sm font-medium text-[#23415f]">
                  {Math.min(previewCount, totalOpportunities)} of {totalOpportunities} opportunities
                  visible
                </p>
              </div>
              <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] p-3">
                <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Unlocked Status</p>
                <p className="mt-1 text-sm font-medium text-[#23415f]">
                  {isUnlocked ? "Unlocked for this session" : "Email required"}
                </p>
              </div>
              <div className="rounded-xl border border-[#e0eaf4] bg-[#f9fcff] p-3">
                <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Last Scanned</p>
                <p className="mt-1 text-sm font-medium text-[#23415f]">
                  {formatDateTime(lastScannedAt)}
                </p>
              </div>
            </div>

            {selectedDomain ? (
              <form action={runOpportunityAnalysisAction} className="mt-4">
                <input type="hidden" name="domainId" value={selectedDomain.id} />
                <button
                  type="submit"
                  disabled={(remainingOpportunityCredits ?? 0) <= 0}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#cbdceb] bg-white px-4 text-sm font-medium text-[#355777] transition hover:bg-[#eef4fb] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Run Full Opportunity Analysis (1 credit)
                </button>
              </form>
            ) : null}

            {!isUnlocked && selectedDomain && totalOpportunities > previewCount ? (
              <form
                action={captureOpportunityEmailAction}
                className="mt-4 flex flex-col gap-2 rounded-2xl border border-[#dbe7f4] bg-[#f7fbff] p-4 sm:flex-row"
              >
                <input type="hidden" name="domainId" value={selectedDomain.id} />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Enter email to unlock full opportunities"
                  defaultValue={session.user?.email ?? ""}
                  className="h-10 flex-1 rounded-xl border border-[#cbdceb] bg-white px-3 text-sm text-[#1f3044] outline-none transition focus:border-[#8cb1d4] focus:ring-2 focus:ring-[#dbe9f6]"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#2f6faa] px-4 text-sm font-medium text-white transition hover:bg-[#285e90]"
                >
                  Unlock Full Report
                </button>
              </form>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-2xl border border-[#e0eaf4]">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-[#f7fbff] text-[#5f7a96]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Keyword</th>
                    <th className="px-4 py-3 font-medium">Current Rank</th>
                    <th className="px-4 py-3 font-medium">Previous Rank</th>
                    <th className="px-4 py-3 font-medium">Opportunity Score</th>
                    <th className="px-4 py-3 font-medium">Last Refresh</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedDomain ? (
                    <tr className="border-t border-[#edf3f9] text-[#355777]">
                      <td colSpan={5} className="px-4 py-6 text-center">
                        Select a domain to scan opportunities.
                      </td>
                    </tr>
                  ) : totalOpportunities === 0 ? (
                    <tr className="border-t border-[#edf3f9] text-[#355777]">
                      <td colSpan={5} className="px-4 py-6 text-center">
                        No opportunities found in rank positions 11-20.
                      </td>
                    </tr>
                  ) : (
                    displayedOpportunityKeywords.map((keyword) => (
                      <tr key={keyword.id} className="border-t border-[#edf3f9] text-[#355777]">
                        <td className="px-4 py-3">{keyword.term}</td>
                        <td className="px-4 py-3">{keyword.currentRank ?? "—"}</td>
                        <td className="px-4 py-3">{keyword.previousRank ?? "—"}</td>
                        <td className="px-4 py-3">{keyword.opportunityScore ?? "—"}</td>
                        <td className="px-4 py-3">{formatDateTime(keyword.lastRefreshedAt)}</td>
                      </tr>
                    ))
                  )}
                  {!isUnlocked && selectedDomain && totalOpportunities > previewCount
                    ? Array.from({ length: totalOpportunities - previewCount }).map((_, index) => (
                        <tr
                          key={`hidden-opportunity-${index}`}
                          className="border-t border-[#edf3f9] text-[#9aadc1]"
                        >
                          <td className="px-4 py-3 blur-[2px]">Locked keyword</td>
                          <td className="px-4 py-3 blur-[2px]">--</td>
                          <td className="px-4 py-3 blur-[2px]">--</td>
                          <td className="px-4 py-3 blur-[2px]">--</td>
                          <td className="px-4 py-3 blur-[2px]">--</td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-5">
            <section className="rounded-3xl border border-[#d3e1ef] bg-white p-5 shadow-[0_8px_24px_rgba(36,77,115,0.06)] sm:p-6 xl:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif text-xl font-semibold text-[#23415f]">Domains</h2>
                <span className="text-xs font-medium text-[#58728d]">
                  {domains.length}
                  {planLimit ? ` / ${planLimit.maxDomains}` : ""}
                </span>
              </div>

              <form action={addDomainAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  name="name"
                  placeholder="example.com"
                  className="h-10 flex-1 rounded-xl border border-[#cbdceb] bg-white px-3 text-sm text-[#1f3044] outline-none transition focus:border-[#8cb1d4] focus:ring-2 focus:ring-[#dbe9f6]"
                  disabled={domainCapReached}
                  required
                />
                <button
                  type="submit"
                  disabled={domainCapReached}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#2f6faa] px-4 text-sm font-medium text-white transition hover:bg-[#285e90] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add Domain
                </button>
              </form>

              {domainCapReached ? (
                <p className="mt-3 rounded-xl border border-[#f6d0cf] bg-[#fff7f7] px-3 py-2 text-sm text-[#b42318]">
                  You have reached your domain cap ({planLimit?.maxDomains}). Upgrade to add more domains.
                </p>
              ) : null}

              <div className="mt-4 space-y-3">
                {domains.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#d8e5f2] px-3 py-4 text-sm text-[#58728d]">
                    No domains yet. Add your first domain to start keyword tracking.
                  </p>
                ) : (
                  domains.map((domain) => {
                    const isSelected = selectedDomain?.id === domain.id;
                    return (
                      <article
                        key={domain.id}
                        className={`rounded-2xl border p-3 ${
                          isSelected
                            ? "border-[#9fc1e0] bg-[#f4f9ff]"
                            : "border-[#e0eaf4] bg-[#f9fcff]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Link
                            href={`/dashboard?domainId=${domain.id}`}
                            className="min-w-0 flex-1 truncate text-sm font-medium text-[#23415f] hover:text-[#2f6faa]"
                          >
                            {domain.name}
                          </Link>
                          <span className="text-xs text-[#58728d]">
                            {domain._count.keywords} keywords
                          </span>
                        </div>
                        <form action={updateDomainAction} className="mt-3 flex gap-2">
                          <input type="hidden" name="domainId" value={domain.id} />
                          <input
                            name="name"
                            defaultValue={domain.name}
                            required
                            className="h-9 min-w-0 flex-1 rounded-xl border border-[#cbdceb] bg-white px-3 text-sm text-[#1f3044] outline-none transition focus:border-[#8cb1d4] focus:ring-2 focus:ring-[#dbe9f6]"
                          />
                          <button
                            type="submit"
                            className="h-9 rounded-full border border-[#cbdceb] px-3 text-xs font-medium text-[#355777] transition hover:bg-[#eef4fb]"
                          >
                            Save
                          </button>
                        </form>
                        <form action={deleteDomainAction} className="mt-2">
                          <input type="hidden" name="domainId" value={domain.id} />
                          <input
                            type="hidden"
                            name="selectedDomainId"
                            value={selectedDomain?.id ?? ""}
                          />
                          <button
                            type="submit"
                            className="h-8 rounded-full px-3 text-xs font-medium text-[#a13830] transition hover:bg-[#fff1f0]"
                          >
                            Delete
                          </button>
                        </form>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-[#d3e1ef] bg-white p-5 shadow-[0_8px_24px_rgba(36,77,115,0.06)] sm:p-6 xl:col-span-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold text-[#23415f]">
                  {selectedDomain ? `Keywords for ${selectedDomain.name}` : "Keywords"}
                </h2>
                <span className="text-xs font-medium text-[#58728d]">
                  {selectedDomain ? `${keywords.length} tracked` : "Select a domain"}
                </span>
              </div>

              {selectedDomain ? (
                <form action={addKeywordAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="domainId" value={selectedDomain.id} />
                  <input
                    name="term"
                    placeholder="seo audit checklist"
                    required
                    className="h-10 flex-1 rounded-xl border border-[#cbdceb] bg-white px-3 text-sm text-[#1f3044] outline-none transition focus:border-[#8cb1d4] focus:ring-2 focus:ring-[#dbe9f6]"
                  />
                  <button
                    type="submit"
                    disabled={remainingKeywords !== null && remainingKeywords <= 0}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#2f6faa] px-4 text-sm font-medium text-white transition hover:bg-[#285e90]"
                  >
                    Add Keyword
                  </button>
                </form>
              ) : null}
              {remainingKeywords !== null ? (
                <p className="mt-2 text-xs text-[#58728d]">
                  {remainingKeywords} keywords remaining on your {planLimit?.planTier} plan.
                </p>
              ) : null}

              <div className="mt-4 overflow-hidden rounded-2xl border border-[#e0eaf4]">
                <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                  <thead className="bg-[#f7fbff] text-[#5f7a96]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Keyword</th>
                      <th className="px-4 py-3 font-medium">Current</th>
                      <th className="px-4 py-3 font-medium">Previous</th>
                      <th className="px-4 py-3 font-medium">Opportunity</th>
                      <th className="px-4 py-3 font-medium">Last Refresh</th>
                      <th className="px-4 py-3 font-medium">Next Refresh</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedDomain ? (
                      <tr className="border-t border-[#edf3f9] text-[#355777]">
                        <td colSpan={7} className="px-4 py-6 text-center">
                          Select a domain to view and manage keywords.
                        </td>
                      </tr>
                    ) : keywords.length === 0 ? (
                      <tr className="border-t border-[#edf3f9] text-[#355777]">
                        <td colSpan={7} className="px-4 py-6 text-center">
                          No keywords yet. Add one to start tracking.
                        </td>
                      </tr>
                    ) : (
                      keywords.map((keyword) => (
                        <tr key={keyword.id} className="border-t border-[#edf3f9] text-[#355777]">
                          <td className="px-4 py-3">
                            <form action={updateKeywordAction} className="flex items-center gap-2">
                              <input type="hidden" name="keywordId" value={keyword.id} />
                              <input type="hidden" name="domainId" value={selectedDomain.id} />
                              <input
                                name="term"
                                defaultValue={keyword.term}
                                required
                                className="h-9 w-56 rounded-xl border border-[#cbdceb] bg-white px-3 text-sm text-[#1f3044] outline-none transition focus:border-[#8cb1d4] focus:ring-2 focus:ring-[#dbe9f6]"
                              />
                              <button
                                type="submit"
                                className="h-9 rounded-full border border-[#cbdceb] px-3 text-xs font-medium text-[#355777] transition hover:bg-[#eef4fb]"
                              >
                                Save
                              </button>
                            </form>
                          </td>
                          <td className="px-4 py-3">{keyword.currentRank ?? "—"}</td>
                          <td className="px-4 py-3">{keyword.previousRank ?? "—"}</td>
                          <td className="px-4 py-3">{keyword.opportunityScore ?? "—"}</td>
                          <td className="px-4 py-3">
                            {formatDateTime(keyword.lastRefreshedAt)}
                          </td>
                          <td className="px-4 py-3">{formatDateTime(keyword.nextRefreshAt)}</td>
                          <td className="px-4 py-3">
                            <form action={deleteKeywordAction}>
                              <input type="hidden" name="keywordId" value={keyword.id} />
                              <input type="hidden" name="domainId" value={selectedDomain.id} />
                              <button
                                type="submit"
                                className="h-8 rounded-full px-3 text-xs font-medium text-[#a13830] transition hover:bg-[#fff1f0]"
                              >
                                Delete
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
