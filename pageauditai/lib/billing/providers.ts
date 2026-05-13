import type { PlanTier } from "@prisma/client";
import type { BillingProvider, CouponCode } from "./config";
import { PLAN_PRICES, applyDiscount } from "./config";
import {
  createTestPaymentReference,
  isBillingTestModeEnabled,
  isTestPaymentReference,
} from "./test-mode";
import { log } from "@/lib/logger";

type CheckoutInput = {
  provider: BillingProvider;
  tier: PlanTier;
  coupon: CouponCode;
  countryCode: string;
  customerEmail: string;
  returnUrl: string;
};

type CheckoutOutput = {
  checkoutUrl: string;
};

export async function createProviderCheckout(input: CheckoutInput): Promise<CheckoutOutput> {
  if (isBillingTestModeEnabled()) {
    const ref = createTestPaymentReference(input.provider);
    const param = input.provider === "razorpay" ? "razorpay_payment_id" : "order_id";
    const sep = input.returnUrl.includes("?") ? "&" : "?";
    const checkoutUrl = `${input.returnUrl}${sep}${param}=${encodeURIComponent(ref)}`;
    log.info("[billing:test]", "simulated checkout", {
      provider: input.provider,
      tier: input.tier,
      coupon: input.coupon,
    });
    return { checkoutUrl };
  }

  if (input.provider === "razorpay") {
    return createRazorpayCheckout(input);
  }
  return createLemonSqueezyCheckout(input);
}

async function createRazorpayCheckout(input: CheckoutInput): Promise<CheckoutOutput> {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured.");
  }

  const plan = PLAN_PRICES[input.tier];
  const discountedInr = applyDiscount(plan.baseMonthlyInr, input.coupon);
  const amountInPaise = Math.round(discountedInr * 100);
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: "INR",
      description: `PageAuditAI ${input.tier} plan`,
      customer: {
        email: input.customerEmail,
      },
      notify: {
        email: true,
      },
      callback_url: input.returnUrl,
      callback_method: "get",
    }),
  });

  if (!response.ok) {
    throw new Error(`Razorpay checkout creation failed (${response.status}).`);
  }

  const body = (await response.json()) as { short_url?: string };
  if (!body.short_url) {
    throw new Error("Razorpay response missing checkout URL.");
  }
  return { checkoutUrl: body.short_url };
}

async function createLemonSqueezyCheckout(input: CheckoutInput): Promise<CheckoutOutput> {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY?.trim();
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
  const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID?.trim();
  if (!apiKey || !storeId || !variantId) {
    throw new Error("Lemon Squeezy config is not set.");
  }

  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: input.customerEmail,
          },
          checkout_options: {
            embed: false,
          },
          product_options: {
            redirect_url: input.returnUrl,
            receipt_button_text: "Return to PageAuditAI",
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: storeId,
            },
          },
          variant: {
            data: {
              type: "variants",
              id: variantId,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Lemon Squeezy checkout creation failed (${response.status}).`);
  }

  const body = (await response.json()) as {
    data?: { attributes?: { url?: string } };
  };
  const url = body.data?.attributes?.url;
  if (!url) {
    throw new Error("Lemon Squeezy response missing checkout URL.");
  }
  return { checkoutUrl: url };
}

export async function verifyProviderPayment(
  provider: BillingProvider,
  reference: string,
): Promise<boolean> {
  if (isTestPaymentReference(reference)) {
    const ok = isBillingTestModeEnabled();
    if (ok) {
      log.info("[billing:test]", "simulated verification ok", { provider });
    } else {
      log.warn("[billing:test]", "rejected test payment reference outside test mode");
    }
    return ok;
  }

  if (provider === "razorpay") {
    return verifyRazorpayPayment(reference);
  }
  return verifyLemonSqueezyOrder(reference);
}

async function verifyRazorpayPayment(paymentId: string): Promise<boolean> {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return false;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!response.ok) return false;
  const body = (await response.json()) as { status?: string };
  return body.status === "captured" || body.status === "authorized";
}

async function verifyLemonSqueezyOrder(orderId: string): Promise<boolean> {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY?.trim();
  if (!apiKey) return false;
  const response = await fetch(`https://api.lemonsqueezy.com/v1/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
    },
  });
  return response.ok;
}
