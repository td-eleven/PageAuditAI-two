import { redirect } from "next/navigation";
import { createProviderCheckout } from "@/lib/billing/providers";
import { encodeCheckoutState } from "@/lib/billing/state";
import {
  type BillingProvider,
  type CouponCode,
  providerForCountry,
} from "@/lib/billing/config";
import { log } from "@/lib/logger";

function cleanText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function billingUrl(params: { error?: string; message?: string }) {
  const search = new URLSearchParams();
  if (params.error) search.set("error", params.error);
  if (params.message) search.set("message", params.message);
  const query = search.toString();
  return query ? `/dashboard/billing?${query}` : "/dashboard/billing";
}

export function isCouponCode(value: string): value is CouponCode {
  return value === "NONE" || value === "SAVE20" || value === "SAVE30";
}

export function isTier(value: string): value is "Starter" | "Growth" | "Pro" {
  return value === "Starter" || value === "Growth" || value === "Pro";
}

export async function executeCheckoutRedirect(params: {
  userId: string;
  userEmail: string | null | undefined;
  formData: FormData;
}) {
  const tier = cleanText(params.formData.get("tier"));
  const countryCode = cleanText(params.formData.get("countryCode")).toUpperCase();
  const couponRaw = cleanText(params.formData.get("coupon")).toUpperCase();
  const email =
    cleanText(params.formData.get("email")).toLowerCase() ||
    params.userEmail ||
    "";

  if (!isTier(tier)) {
    redirect(billingUrl({ error: "Invalid plan selection." }));
  }
  if (!countryCode) {
    redirect(billingUrl({ error: "Please select your billing country." }));
  }
  if (!isCouponCode(couponRaw)) {
    redirect(billingUrl({ error: "Invalid coupon code." }));
  }
  if (!email) {
    redirect(billingUrl({ error: "A valid billing email is required." }));
  }

  const provider = providerForCountry(countryCode);
  const { payload, signature } = encodeCheckoutState({
    userId: params.userId,
    tier,
    coupon: couponRaw,
    provider,
    countryCode,
    createdAt: Date.now(),
  });

  const callbackOrigin = process.env.AUTH_URL?.trim() || "http://localhost:3000";
  const callbackUrl = new URL("/dashboard/billing/complete", callbackOrigin);
  callbackUrl.searchParams.set("payload", payload);
  callbackUrl.searchParams.set("sig", signature);
  callbackUrl.searchParams.set("provider", provider);

  try {
    const checkout = await createProviderCheckout({
      provider: provider as BillingProvider,
      tier,
      coupon: couponRaw,
      countryCode,
      customerEmail: email,
      returnUrl: callbackUrl.toString(),
    });
    log.info("[billing]", "checkout created", {
      userId: params.userId,
      provider,
      tier,
      coupon: couponRaw,
    });
    redirect(checkout.checkoutUrl);
  } catch (error) {
    log.error("[billing]", "checkout creation failed", error);
    redirect(
      billingUrl({
        error:
          "Could not start checkout right now. Please verify billing credentials and try again.",
      }),
    );
  }
}
