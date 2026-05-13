/**
 * Verifies billing test-mode guards and coupon math (no live API calls).
 */
import { displayPlanPricing } from "@/lib/billing/config";
import {
  createTestPaymentReference,
  isBillingTestModeEnabled,
  isTestPaymentReference,
} from "@/lib/billing/test-mode";

const origNodeEnv = process.env.NODE_ENV;
const origBillingTest = process.env.BILLING_TEST_MODE;
const origVercel = process.env.VERCEL_ENV;

function restoreEnv() {
  process.env.NODE_ENV = origNodeEnv;
  process.env.BILLING_TEST_MODE = origBillingTest;
  process.env.VERCEL_ENV = origVercel;
}

try {
  process.env.NODE_ENV = "production";
  process.env.BILLING_TEST_MODE = "true";
  delete process.env.VERCEL_ENV;
  if (isBillingTestModeEnabled()) {
    throw new Error("Test mode must be off when NODE_ENV is production.");
  }

  process.env.NODE_ENV = "development";
  process.env.BILLING_TEST_MODE = "false";
  if (isBillingTestModeEnabled()) {
    throw new Error("Test mode must be off when BILLING_TEST_MODE is not true.");
  }

  process.env.BILLING_TEST_MODE = "true";
  if (!isBillingTestModeEnabled()) {
    throw new Error("Test mode should be on in development with BILLING_TEST_MODE=true.");
  }

  process.env.VERCEL_ENV = "production";
  process.env.NODE_ENV = "development";
  if (isBillingTestModeEnabled()) {
    throw new Error("Test mode must be off when VERCEL_ENV is production.");
  }
  delete process.env.VERCEL_ENV;

  const pay = createTestPaymentReference("razorpay");
  const ord = createTestPaymentReference("lemonsqueezy");
  if (!isTestPaymentReference(pay) || !isTestPaymentReference(ord)) {
    throw new Error("Test references should be recognized.");
  }

  const starter = displayPlanPricing("Starter");
  if (starter.inrAfter20 !== 799.2 || starter.usdAfter30 !== 8.4) {
    throw new Error("Coupon pricing mismatch for Starter plan.");
  }

  console.log(
    JSON.stringify(
      {
        productionGuardOk: true,
        devTestModeOk: true,
        vercelProductionGuardOk: true,
        testReferences: { razorpay: pay, lemonsqueezy: ord },
        starterCouponSample: {
          inrAfter20: starter.inrAfter20,
          usdAfter30: starter.usdAfter30,
        },
      },
      null,
      2,
    ),
  );
} finally {
  restoreEnv();
}
