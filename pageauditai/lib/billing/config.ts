import type { PlanTier } from "@prisma/client";
import { getPlanConfig } from "@/lib/plans";

export type BillingProvider = "razorpay" | "lemonsqueezy";
export type CouponCode = "NONE" | "SAVE20" | "SAVE30";

export type PlanPrice = {
  tier: PlanTier;
  label: string;
  baseMonthlyInr: number;
  baseMonthlyUsd: number;
};

export const PLAN_PRICES: Record<PlanTier, PlanPrice> = {
  Starter: {
    tier: "Starter",
    label: "Starter",
    baseMonthlyInr: 999,
    baseMonthlyUsd: 12,
  },
  Growth: {
    tier: "Growth",
    label: "Growth",
    baseMonthlyInr: 2999,
    baseMonthlyUsd: 36,
  },
  Pro: {
    tier: "Pro",
    label: "Pro",
    baseMonthlyInr: 6999,
    baseMonthlyUsd: 84,
  },
};

export const COUPON_DISCOUNTS: Record<CouponCode, number> = {
  NONE: 0,
  SAVE20: 20,
  SAVE30: 30,
};

export function isIndiaCountryCode(countryCode: string): boolean {
  return countryCode.trim().toUpperCase() === "IN";
}

export function providerForCountry(countryCode: string): BillingProvider {
  return isIndiaCountryCode(countryCode) ? "razorpay" : "lemonsqueezy";
}

export function applyDiscount(amount: number, coupon: CouponCode): number {
  const percentage = COUPON_DISCOUNTS[coupon] ?? 0;
  const discounted = amount * (1 - percentage / 100);
  return Math.round(discounted * 100) / 100;
}

export function displayPlanPricing(tier: PlanTier) {
  const price = PLAN_PRICES[tier];
  return {
    ...price,
    inrAfter20: applyDiscount(price.baseMonthlyInr, "SAVE20"),
    inrAfter30: applyDiscount(price.baseMonthlyInr, "SAVE30"),
    usdAfter20: applyDiscount(price.baseMonthlyUsd, "SAVE20"),
    usdAfter30: applyDiscount(price.baseMonthlyUsd, "SAVE30"),
  };
}

export function planFeatures(tier: PlanTier) {
  const config = getPlanConfig(tier);
  return {
    maxDomains: config.maxDomains,
    maxKeywords: config.maxKeywords,
    monthlyOpportunityCredits: config.monthlyOpportunityCredits,
  };
}
