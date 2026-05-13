import crypto from "node:crypto";

/**
 * Local billing simulation only. Never active in production deployments.
 */
export function isBillingTestModeEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv === "production") return false;
  return process.env.BILLING_TEST_MODE === "true";
}

export function isTestPaymentReference(reference: string): boolean {
  return (
    reference.startsWith("pay_test_") ||
    reference.startsWith("order_test_")
  );
}

export function createTestPaymentReference(provider: "razorpay" | "lemonsqueezy"): string {
  const suffix = crypto.randomBytes(6).toString("hex");
  const ts = Date.now();
  return provider === "razorpay"
    ? `pay_test_${ts}_${suffix}`
    : `order_test_${ts}_${suffix}`;
}
