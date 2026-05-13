import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { displayPlanPricing, PLAN_PRICES, planFeatures } from "@/lib/billing/config";
import { isBillingTestModeEnabled } from "@/lib/billing/test-mode";
import { simulateTestUpgradeAction, startCheckoutAction } from "./actions";

type BillingSearchParams = Promise<{ error?: string; message?: string }>;

const planOrder: Array<keyof typeof PLAN_PRICES> = ["Starter", "Growth", "Pro"];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: BillingSearchParams;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const params = await searchParams;
  const planLimit = await prisma.planLimit.findUnique({ where: { userId } });
  const domainCount = await prisma.domain.count({ where: { userId } });
  const keywordCount = await prisma.keyword.count({ where: { domain: { userId } } });

  const remainingDomains = planLimit
    ? Math.max(planLimit.maxDomains - domainCount, 0)
    : null;
  const remainingKeywords = planLimit
    ? Math.max(planLimit.maxKeywords - keywordCount, 0)
    : null;
  const remainingCredits = planLimit
    ? Math.max(
        planLimit.monthlyOpportunityCredits - planLimit.usedOpportunityCredits,
        0,
      )
    : null;

  const billingTestMode = isBillingTestModeEnabled();

  return (
    <main className="min-h-screen bg-[#f4f8fd] px-4 py-6 text-[#1f3044] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1120px] space-y-6">
        <header className="rounded-3xl border border-[#d3e1ef] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(36,77,115,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-[#6f89a4] uppercase">Billing</p>
              <h1 className="mt-1 font-serif text-3xl font-semibold text-[#23415f]">
                Pricing and Upgrades
              </h1>
              <p className="mt-2 text-sm text-[#58728d]">
                Current plan:{" "}
                <span className="font-medium text-[#23415f]">
                  {planLimit?.planTier ?? "Starter"}
                </span>
              </p>
            </div>
            {billingTestMode ? (
              <span className="inline-flex w-fit shrink-0 rounded-full border border-[#d4a574] bg-[#fff8ef] px-3 py-1 text-xs font-semibold tracking-wide text-[#8a5a2b] uppercase">
                Billing Test Mode Enabled
              </span>
            ) : null}
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

        <section className="grid gap-4 sm:grid-cols-4">
          <article className="rounded-2xl border border-[#d3e1ef] bg-white p-4 shadow-[0_6px_18px_rgba(36,77,115,0.06)]">
            <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Domains</p>
            <p className="mt-1 text-sm font-medium text-[#23415f]">
              {domainCount}/{planLimit?.maxDomains ?? "—"} used
            </p>
            <p className="text-xs text-[#58728d]">{remainingDomains ?? "—"} remaining</p>
          </article>
          <article className="rounded-2xl border border-[#d3e1ef] bg-white p-4 shadow-[0_6px_18px_rgba(36,77,115,0.06)]">
            <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Keywords</p>
            <p className="mt-1 text-sm font-medium text-[#23415f]">
              {keywordCount}/{planLimit?.maxKeywords ?? "—"} used
            </p>
            <p className="text-xs text-[#58728d]">{remainingKeywords ?? "—"} remaining</p>
          </article>
          <article className="rounded-2xl border border-[#d3e1ef] bg-white p-4 shadow-[0_6px_18px_rgba(36,77,115,0.06)]">
            <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Opportunity Credits</p>
            <p className="mt-1 text-sm font-medium text-[#23415f]">{remainingCredits ?? "—"} left</p>
            <p className="text-xs text-[#58728d]">
              {planLimit?.usedOpportunityCredits ?? "—"}/
              {planLimit?.monthlyOpportunityCredits ?? "—"} used
            </p>
          </article>
          <article className="rounded-2xl border border-[#d3e1ef] bg-white p-4 shadow-[0_6px_18px_rgba(36,77,115,0.06)]">
            <p className="text-xs uppercase tracking-wide text-[#6f89a4]">Subscription Status</p>
            <p className="mt-1 text-sm font-medium text-[#23415f]">Active</p>
            <p className="text-xs text-[#58728d]">Managed via secure checkout</p>
          </article>
        </section>

        {billingTestMode ? (
          <section className="rounded-3xl border border-dashed border-[#c9ab8a] bg-[#fffbf5] p-5 shadow-[0_6px_18px_rgba(36,77,115,0.04)] sm:p-6">
            <h2 className="font-serif text-lg font-semibold text-[#23415f]">Local simulation</h2>
            <p className="mt-1 text-sm text-[#58728d]">
              Upgrade buttons below skip live payment and complete using the same verification and
              plan update path. Use this block to pick tier and coupon explicitly.
            </p>
            <form action={simulateTestUpgradeAction} className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <select
                name="tier"
                required
                className="h-10 min-w-[140px] rounded-xl border border-[#e0d5c8] bg-white px-3 text-sm text-[#1f3044] outline-none focus:border-[#c9ab8a] focus:ring-2 focus:ring-[#f5e6d6]"
              >
                <option value="Starter">Starter</option>
                <option value="Growth">Growth</option>
                <option value="Pro">Pro</option>
              </select>
              <select
                name="countryCode"
                defaultValue="IN"
                className="h-10 min-w-[140px] rounded-xl border border-[#e0d5c8] bg-white px-3 text-sm text-[#1f3044] outline-none focus:border-[#c9ab8a] focus:ring-2 focus:ring-[#f5e6d6]"
              >
                <option value="IN">India (Razorpay path)</option>
                <option value="US">United States (Lemon Squeezy path)</option>
              </select>
              <select
                name="coupon"
                defaultValue="NONE"
                className="h-10 min-w-[160px] rounded-xl border border-[#e0d5c8] bg-white px-3 text-sm text-[#1f3044] outline-none focus:border-[#c9ab8a] focus:ring-2 focus:ring-[#f5e6d6]"
              >
                <option value="NONE">No Coupon</option>
                <option value="SAVE20">SAVE20</option>
                <option value="SAVE30">SAVE30</option>
              </select>
              <input
                name="email"
                type="email"
                required
                defaultValue={session.user?.email ?? ""}
                placeholder="Email"
                className="h-10 min-w-[200px] flex-1 rounded-xl border border-[#e0d5c8] bg-white px-3 text-sm text-[#1f3044] outline-none focus:border-[#c9ab8a] focus:ring-2 focus:ring-[#f5e6d6]"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#8a5a2b] bg-[#fff4e8] px-5 text-sm font-medium text-[#5c3d1f] transition hover:bg-[#ffe8d4]"
              >
                Simulate Upgrade
              </button>
            </form>
          </section>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-3">
          {planOrder.map((tier) => {
            const pricing = displayPlanPricing(tier);
            const features = planFeatures(tier);
            const isCurrent = planLimit?.planTier === tier;
            return (
              <article
                key={tier}
                className={`rounded-3xl border bg-white p-5 shadow-[0_8px_24px_rgba(36,77,115,0.06)] ${
                  isCurrent ? "border-[#9fc1e0]" : "border-[#d3e1ef]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-semibold text-[#23415f]">{pricing.label}</h2>
                  {isCurrent ? (
                    <span className="rounded-full bg-[#edf9f0] px-3 py-1 text-xs font-medium text-[#1f7a36]">
                      Current
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 space-y-1 text-sm text-[#355777]">
                  <p>
                    Base: ₹{pricing.baseMonthlyInr}/mo · ${pricing.baseMonthlyUsd}/mo
                  </p>
                  <p>20% off: ₹{pricing.inrAfter20}/mo · ${pricing.usdAfter20}/mo</p>
                  <p>30% off: ₹{pricing.inrAfter30}/mo · ${pricing.usdAfter30}/mo</p>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-[#4d6783]">
                  <li>{features.maxDomains} domains</li>
                  <li>{features.maxKeywords} keywords</li>
                  <li>{features.monthlyOpportunityCredits} opportunity credits / month</li>
                </ul>
                <form action={startCheckoutAction} className="mt-5 space-y-2">
                  <input type="hidden" name="tier" value={tier} />
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={session.user?.email ?? ""}
                    placeholder="billing@company.com"
                    className="h-10 w-full rounded-xl border border-[#cbdceb] bg-white px-3 text-sm text-[#1f3044] outline-none focus:border-[#8cb1d4] focus:ring-2 focus:ring-[#dbe9f6]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      name="countryCode"
                      defaultValue="IN"
                      className="h-10 rounded-xl border border-[#cbdceb] bg-white px-3 text-sm text-[#1f3044] outline-none focus:border-[#8cb1d4] focus:ring-2 focus:ring-[#dbe9f6]"
                    >
                      <option value="IN">India</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="SG">Singapore</option>
                      <option value="AE">UAE</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <select
                      name="coupon"
                      defaultValue="NONE"
                      className="h-10 rounded-xl border border-[#cbdceb] bg-white px-3 text-sm text-[#1f3044] outline-none focus:border-[#8cb1d4] focus:ring-2 focus:ring-[#dbe9f6]"
                    >
                      <option value="NONE">No Coupon</option>
                      <option value="SAVE20">SAVE20 (20% off)</option>
                      <option value="SAVE30">SAVE30 (30% off)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isCurrent}
                    className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#2f6faa] px-4 text-sm font-medium text-white transition hover:bg-[#285e90] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCurrent ? "Current Plan" : `Upgrade to ${tier}`}
                  </button>
                </form>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
