import crypto from "node:crypto";
import type { PlanTier } from "@prisma/client";
import type { BillingProvider, CouponCode } from "./config";

type CheckoutState = {
  userId: string;
  tier: PlanTier;
  coupon: CouponCode;
  provider: BillingProvider;
  countryCode: string;
  createdAt: number;
};

function getBillingStateSecret(): string {
  const secret = process.env.BILLING_STATE_SECRET?.trim();
  if (secret) return secret;
  return process.env.AUTH_SECRET?.trim() || "pageauditai-local-billing-state-secret";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getBillingStateSecret()).update(value).digest("hex");
}

export function encodeCheckoutState(state: CheckoutState): {
  payload: string;
  signature: string;
} {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return { payload, signature: sign(payload) };
}

export function decodeCheckoutState(
  payload: string,
  signature: string,
): CheckoutState | null {
  if (sign(payload) !== signature) return null;
  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as CheckoutState;
    if (!parsed?.userId || !parsed?.tier || !parsed?.provider || !parsed?.createdAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
