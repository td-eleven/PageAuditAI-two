"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPlanConfig, isNewCreditPeriod } from "@/lib/plans";

function cleanText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  return userId;
}

function dashboardUrl(params: {
  domainId?: string;
  error?: string;
  message?: string;
}): string {
  const search = new URLSearchParams();
  if (params.domainId) search.set("domainId", params.domainId);
  if (params.error) search.set("error", params.error);
  if (params.message) search.set("message", params.message);
  const query = search.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

function unlockCookieKey(domainId: string): string {
  return `opp_unlock_${domainId}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getEffectivePlanLimit(userId: string) {
  const existing = await prisma.planLimit.findUnique({ where: { userId } });
  if (existing) return existing;

  const defaults = getPlanConfig("Starter");
  return prisma.planLimit.create({
    data: {
      userId,
      planTier: defaults.tier,
      maxDomains: defaults.maxDomains,
      maxKeywords: defaults.maxKeywords,
      monthlyOpportunityCredits: defaults.monthlyOpportunityCredits,
      usedOpportunityCredits: 0,
      creditPeriodStart: new Date(),
    },
  });
}

async function normalizeOpportunityCredits(userId: string) {
  const planLimit = await getEffectivePlanLimit(userId);
  const now = new Date();
  if (!isNewCreditPeriod(planLimit, now)) {
    return planLimit;
  }
  return prisma.planLimit.update({
    where: { userId },
    data: {
      usedOpportunityCredits: 0,
      creditPeriodStart: now,
    },
  });
}

export async function addDomainAction(formData: FormData) {
  const userId = await requireUserId();
  const name = cleanText(formData.get("name")).toLowerCase();

  if (!name) {
    redirect(dashboardUrl({ error: "Domain name is required." }));
  }

  const [planLimit, currentDomainCount] = await Promise.all([
    getEffectivePlanLimit(userId),
    prisma.domain.count({ where: { userId } }),
  ]);

  if (planLimit && currentDomainCount >= planLimit.maxDomains) {
    redirect(
      dashboardUrl({
        error: `Domain cap reached (${planLimit.maxDomains}). Upgrade your plan or remove a domain to add a new one.`,
      }),
    );
  }

  const existing = await prisma.domain.findUnique({
    where: { userId_name: { userId, name } },
    select: { id: true },
  });

  if (existing) {
    redirect(dashboardUrl({ error: "This domain already exists." }));
  }

  const domain = await prisma.domain.create({
    data: { userId, name },
    select: { id: true },
  });

  revalidatePath("/dashboard");
  redirect(
    dashboardUrl({ domainId: domain.id, message: "Domain added successfully." }),
  );
}

export async function updateDomainAction(formData: FormData) {
  const userId = await requireUserId();
  const domainId = cleanText(formData.get("domainId"));
  const name = cleanText(formData.get("name")).toLowerCase();

  if (!domainId || !name) {
    redirect(
      dashboardUrl({
        domainId,
        error: "A valid domain and name are required.",
      }),
    );
  }

  const ownedDomain = await prisma.domain.findFirst({
    where: { id: domainId, userId },
    select: { id: true },
  });

  if (!ownedDomain) {
    redirect(dashboardUrl({ error: "Domain not found." }));
  }

  const duplicate = await prisma.domain.findFirst({
    where: { userId, name, NOT: { id: domainId } },
    select: { id: true },
  });

  if (duplicate) {
    redirect(
      dashboardUrl({
        domainId,
        error: "A domain with this name already exists.",
      }),
    );
  }

  await prisma.domain.update({
    where: { id: domainId },
    data: { name },
  });

  revalidatePath("/dashboard");
  redirect(
    dashboardUrl({ domainId, message: "Domain name updated successfully." }),
  );
}

export async function deleteDomainAction(formData: FormData) {
  const userId = await requireUserId();
  const domainId = cleanText(formData.get("domainId"));
  const selectedDomainId = cleanText(formData.get("selectedDomainId"));

  if (!domainId) {
    redirect(dashboardUrl({ error: "Domain not found." }));
  }

  const ownedDomain = await prisma.domain.findFirst({
    where: { id: domainId, userId },
    select: { id: true },
  });

  if (!ownedDomain) {
    redirect(dashboardUrl({ error: "Domain not found." }));
  }

  await prisma.domain.delete({ where: { id: domainId } });

  const domainIdAfterDelete =
    selectedDomainId && selectedDomainId !== domainId ? selectedDomainId : undefined;

  revalidatePath("/dashboard");
  redirect(
    dashboardUrl({
      domainId: domainIdAfterDelete,
      message: "Domain deleted successfully.",
    }),
  );
}

export async function addKeywordAction(formData: FormData) {
  const userId = await requireUserId();
  const domainId = cleanText(formData.get("domainId"));
  const term = cleanText(formData.get("term")).toLowerCase();

  if (!domainId) {
    redirect(dashboardUrl({ error: "Select a domain first." }));
  }
  if (!term) {
    redirect(dashboardUrl({ domainId, error: "Keyword text is required." }));
  }

  const ownedDomain = await prisma.domain.findFirst({
    where: { id: domainId, userId },
    select: { id: true },
  });

  if (!ownedDomain) {
    redirect(dashboardUrl({ error: "Domain not found." }));
  }

  const duplicate = await prisma.keyword.findUnique({
    where: { domainId_term: { domainId, term } },
    select: { id: true },
  });

  if (duplicate) {
    redirect(
      dashboardUrl({
        domainId,
        error: "This keyword already exists for the selected domain.",
      }),
    );
  }

  const planLimit = await getEffectivePlanLimit(userId);
  const currentKeywordCount = await prisma.keyword.count({
    where: { domain: { userId } },
  });
  if (currentKeywordCount >= planLimit.maxKeywords) {
    const remaining = Math.max(planLimit.maxKeywords - currentKeywordCount, 0);
    redirect(
      dashboardUrl({
        domainId,
        error: `Keyword cap reached (${planLimit.maxKeywords}). Remaining keywords: ${remaining}. Upgrade your plan to track more keywords.`,
      }),
    );
  }

  await prisma.keyword.create({
    data: { domainId, term },
  });

  revalidatePath("/dashboard");
  redirect(
    dashboardUrl({
      domainId,
      message: "Keyword added successfully.",
    }),
  );
}

export async function updateKeywordAction(formData: FormData) {
  const userId = await requireUserId();
  const keywordId = cleanText(formData.get("keywordId"));
  const domainId = cleanText(formData.get("domainId"));
  const term = cleanText(formData.get("term")).toLowerCase();

  if (!keywordId || !domainId || !term) {
    redirect(
      dashboardUrl({
        domainId,
        error: "A valid keyword and text are required.",
      }),
    );
  }

  const keyword = await prisma.keyword.findFirst({
    where: {
      id: keywordId,
      domainId,
      domain: { userId },
    },
    select: { id: true },
  });

  if (!keyword) {
    redirect(dashboardUrl({ domainId, error: "Keyword not found." }));
  }

  const duplicate = await prisma.keyword.findFirst({
    where: {
      domainId,
      term,
      NOT: { id: keywordId },
    },
    select: { id: true },
  });

  if (duplicate) {
    redirect(
      dashboardUrl({
        domainId,
        error: "A keyword with this text already exists in this domain.",
      }),
    );
  }

  await prisma.keyword.update({
    where: { id: keywordId },
    data: { term },
  });

  revalidatePath("/dashboard");
  redirect(
    dashboardUrl({
      domainId,
      message: "Keyword updated successfully.",
    }),
  );
}

export async function deleteKeywordAction(formData: FormData) {
  const userId = await requireUserId();
  const keywordId = cleanText(formData.get("keywordId"));
  const domainId = cleanText(formData.get("domainId"));

  if (!keywordId || !domainId) {
    redirect(dashboardUrl({ domainId, error: "Keyword not found." }));
  }

  const keyword = await prisma.keyword.findFirst({
    where: {
      id: keywordId,
      domainId,
      domain: { userId },
    },
    select: { id: true },
  });

  if (!keyword) {
    redirect(dashboardUrl({ domainId, error: "Keyword not found." }));
  }

  await prisma.keyword.delete({ where: { id: keywordId } });

  revalidatePath("/dashboard");
  redirect(
    dashboardUrl({
      domainId,
      message: "Keyword deleted successfully.",
    }),
  );
}

export async function captureOpportunityEmailAction(formData: FormData) {
  const userId = await requireUserId();
  const domainId = cleanText(formData.get("domainId"));
  const email = cleanText(formData.get("email")).toLowerCase();

  if (!domainId) {
    redirect(dashboardUrl({ error: "Select a domain first." }));
  }
  if (!email) {
    redirect(
      dashboardUrl({
        domainId,
        error: "Email is required to unlock opportunities.",
      }),
    );
  }
  if (!isValidEmail(email)) {
    redirect(
      dashboardUrl({
        domainId,
        error: "Enter a valid email address.",
      }),
    );
  }

  const ownedDomain = await prisma.domain.findFirst({
    where: { id: domainId, userId },
    select: { id: true },
  });

  if (!ownedDomain) {
    redirect(dashboardUrl({ error: "Domain not found." }));
  }

  await prisma.opportunityUnlock.upsert({
    where: { domainId_email: { domainId, email } },
    update: {},
    create: { domainId, email },
  });

  const cookieStore = await cookies();
  cookieStore.set(unlockCookieKey(domainId), "1", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/dashboard");
  redirect(
    dashboardUrl({
      domainId,
      message: "Opportunities unlocked for this session.",
    }),
  );
}

export async function runOpportunityAnalysisAction(formData: FormData) {
  const userId = await requireUserId();
  const domainId = cleanText(formData.get("domainId"));

  if (!domainId) {
    redirect(dashboardUrl({ error: "Select a domain first." }));
  }

  const domain = await prisma.domain.findFirst({
    where: { id: domainId, userId },
    select: { id: true },
  });
  if (!domain) {
    redirect(dashboardUrl({ error: "Domain not found." }));
  }

  const normalizedPlan = await normalizeOpportunityCredits(userId);
  const remainingCredits =
    normalizedPlan.monthlyOpportunityCredits - normalizedPlan.usedOpportunityCredits;
  if (remainingCredits <= 0) {
    redirect(
      dashboardUrl({
        domainId,
        error: `Opportunity credits exhausted for this month. Remaining credits: 0 / ${normalizedPlan.monthlyOpportunityCredits}.`,
      }),
    );
  }

  await prisma.planLimit.update({
    where: { userId },
    data: {
      usedOpportunityCredits: { increment: 1 },
    },
  });

  revalidatePath("/dashboard");
  redirect(
    dashboardUrl({
      domainId,
      message: "Full opportunity analysis completed. 1 credit used.",
    }),
  );
}
