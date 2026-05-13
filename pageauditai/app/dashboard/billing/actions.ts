"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isBillingTestModeEnabled } from "@/lib/billing/test-mode";
import { executeCheckoutRedirect } from "./checkout-flow";

function billingUrl(params: { error?: string; message?: string }) {
  const search = new URLSearchParams();
  if (params.error) search.set("error", params.error);
  if (params.message) search.set("message", params.message);
  const query = search.toString();
  return query ? `/dashboard/billing?${query}` : "/dashboard/billing";
}

export async function startCheckoutAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  await executeCheckoutRedirect({
    userId,
    userEmail: session.user?.email,
    formData,
  });
}

/** Local-only: completes upgrade via same callback + verification path without live providers. */
export async function simulateTestUpgradeAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  if (!isBillingTestModeEnabled()) {
    redirect(
      billingUrl({
        error: "Billing test mode is not available in this environment.",
      }),
    );
  }

  await executeCheckoutRedirect({
    userId,
    userEmail: session.user?.email,
    formData,
  });
}
