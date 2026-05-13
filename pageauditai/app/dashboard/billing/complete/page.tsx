import Link from "next/link";
import { auth } from "@/auth";
import { decodeCheckoutState } from "@/lib/billing/state";
import { verifyProviderPayment } from "@/lib/billing/providers";
import { upgradeUserPlan } from "@/lib/billing/upgrade";
import {
  isBillingTestModeEnabled,
  isTestPaymentReference,
} from "@/lib/billing/test-mode";
import { log } from "@/lib/logger";

type CompleteSearchParams = Promise<{
  payload?: string;
  sig?: string;
  provider?: string;
  razorpay_payment_id?: string;
  order_id?: string;
}>;

function statusPanel(ok: boolean, message: string) {
  return (
    <p
      className={`rounded-xl border px-4 py-2 text-sm ${
        ok
          ? "border-[#c9e8cf] bg-[#f5fff7] text-[#1f7a36]"
          : "border-[#f6d0cf] bg-[#fff7f7] text-[#b42318]"
      }`}
    >
      {message}
    </p>
  );
}

export default async function BillingCompletePage({
  searchParams,
}: {
  searchParams: CompleteSearchParams;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return (
      <main className="min-h-screen bg-[#f4f8fd] px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-[#d3e1ef] bg-white p-6">
          {statusPanel(false, "You need to sign in before completing billing.")}
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const payload = params.payload ?? "";
  const sig = params.sig ?? "";
  const provider = params.provider === "razorpay" ? "razorpay" : "lemonsqueezy";
  const reference =
    provider === "razorpay"
      ? (params.razorpay_payment_id ?? "")
      : (params.order_id ?? "");

  const state = decodeCheckoutState(payload, sig);
  if (!state || state.userId !== userId || state.provider !== provider) {
    log.error("[billing]", "invalid callback state", { userId, provider });
    return (
      <main className="min-h-screen bg-[#f4f8fd] px-4 py-10">
        <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-[#d3e1ef] bg-white p-6">
          {statusPanel(false, "Payment verification failed (invalid state).")}
          <Link href="/dashboard/billing" className="text-sm font-medium text-[#2f6faa]">
            Return to billing
          </Link>
        </div>
      </main>
    );
  }

  const verified = reference ? await verifyProviderPayment(provider, reference) : false;
  if (!verified) {
    log.error("[billing]", "payment verification failed", {
      userId,
      provider,
      hasReference: Boolean(reference),
    });
    return (
      <main className="min-h-screen bg-[#f4f8fd] px-4 py-10">
        <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-[#d3e1ef] bg-white p-6">
          {statusPanel(false, "Payment could not be verified. Plan not changed.")}
          <Link href="/dashboard/billing" className="text-sm font-medium text-[#2f6faa]">
            Return to billing
          </Link>
        </div>
      </main>
    );
  }

  const updated = await upgradeUserPlan(userId, state.tier);
  const simulated =
    isBillingTestModeEnabled() && isTestPaymentReference(reference);
  log.info("[billing]", "plan upgraded after verified payment", {
    userId,
    provider,
    tier: state.tier,
    simulated,
  });

  return (
    <main className="min-h-screen bg-[#f4f8fd] px-4 py-10">
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-[#d3e1ef] bg-white p-6">
        {simulated ? (
          <p className="rounded-xl border border-[#d4a574] bg-[#fff8ef] px-3 py-2 text-xs font-semibold tracking-wide text-[#8a5a2b] uppercase">
            Simulated payment — billing test mode
          </p>
        ) : null}
        {statusPanel(
          true,
          `Payment verified. Your plan is now ${updated.planTier} with updated limits.`,
        )}
        <p className="text-sm text-[#58728d]">
          Domains: {updated.maxDomains} · Keywords: {updated.maxKeywords} · Opportunity credits:
          {" "}
          {updated.monthlyOpportunityCredits}
        </p>
        <div className="flex gap-3">
          <Link href="/dashboard/billing" className="text-sm font-medium text-[#2f6faa]">
            Back to billing
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-[#2f6faa]">
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
