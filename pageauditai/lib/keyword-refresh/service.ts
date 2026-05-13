import { prisma } from "@/lib/db";
import { fetchKeywordRank } from "./provider";
import { log } from "@/lib/logger";

type RefreshRunStatus = "idle" | "running" | "success" | "failed";

export type RefreshRunSummary = {
  runId: string;
  startedAt: Date;
  finishedAt: Date;
  status: RefreshRunStatus;
  scannedKeywords: number;
  refreshedKeywords: number;
  failedKeywords: number;
  failureReasons: string[];
};

const REFRESH_HOUR_UTC = Number(process.env.KEYWORD_REFRESH_HOUR_UTC ?? "2");
const REFRESH_MINUTE_UTC = Number(process.env.KEYWORD_REFRESH_MINUTE_UTC ?? "0");

const globalRefreshState = globalThis as unknown as {
  keywordRefreshLastRun?: RefreshRunSummary;
};

export function getRefreshScheduleConfig() {
  return {
    hourUtc: REFRESH_HOUR_UTC,
    minuteUtc: REFRESH_MINUTE_UTC,
  };
}

export function getLastRefreshRun(): RefreshRunSummary | null {
  return globalRefreshState.keywordRefreshLastRun ?? null;
}

function createNextRefreshAt(from: Date): Date {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(REFRESH_HOUR_UTC, REFRESH_MINUTE_UTC, 0, 0);
  return next;
}

export async function runDailyKeywordRefreshCycle(): Promise<RefreshRunSummary> {
  const runId = crypto.randomUUID();
  const startedAt = new Date();
  log.info("[keyword-refresh]", "cycle started", {
    runId,
    at: startedAt.toISOString(),
    scheduleUtc: `${String(REFRESH_HOUR_UTC).padStart(2, "0")}:${String(REFRESH_MINUTE_UTC).padStart(2, "0")}`,
  });

  const dueKeywords = await prisma.keyword.findMany({
    where: {
      domain: { userId: { not: "" } },
      OR: [{ nextRefreshAt: null }, { nextRefreshAt: { lte: startedAt } }],
    },
    include: {
      domain: {
        select: {
          id: true,
          name: true,
          userId: true,
        },
      },
    },
    orderBy: [{ nextRefreshAt: "asc" }, { createdAt: "asc" }],
  });

  let refreshedKeywords = 0;
  let failedKeywords = 0;
  const failureReasons: string[] = [];

  for (const keyword of dueKeywords) {
    const lookup = await fetchKeywordRank({
      domainName: keyword.domain.name,
      keyword: keyword.term,
    });

    const resolvedRank = lookup.rank ?? keyword.currentRank;
    if (resolvedRank == null) {
      failedKeywords += 1;
      const reason = `keyword=${keyword.id} term="${keyword.term}" failed: ${lookup.reason ?? "Rank unavailable"}`;
      failureReasons.push(reason);
      log.error("[keyword-refresh]", "keyword refresh skipped", {
        runId,
        keywordId: keyword.id,
        reason: lookup.reason ?? "Rank unavailable",
      });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.keyword.update({
          where: { id: keyword.id },
          data: {
            previousRank: keyword.currentRank,
            currentRank: resolvedRank,
            lastRefreshedAt: startedAt,
            nextRefreshAt: createNextRefreshAt(startedAt),
          },
        });

        await tx.keywordHistory.create({
          data: {
            keywordId: keyword.id,
            rank: resolvedRank,
            capturedAt: startedAt,
          },
        });
      });

      refreshedKeywords += 1;
      log.info("[keyword-refresh]", "keyword refreshed", {
        runId,
        keywordId: keyword.id,
        rank: resolvedRank,
        source: lookup.source,
      });
    } catch (error) {
      failedKeywords += 1;
      const reason = `keyword=${keyword.id} term="${keyword.term}" transaction failed: ${
        error instanceof Error ? error.message : "unknown"
      }`;
      failureReasons.push(reason);
      log.error("[keyword-refresh]", "keyword transaction failed", {
        runId,
        keywordId: keyword.id,
        error,
      });
    }
  }

  const finishedAt = new Date();
  const summary: RefreshRunSummary = {
    runId,
    startedAt,
    finishedAt,
    status: failedKeywords > 0 ? "failed" : "success",
    scannedKeywords: dueKeywords.length,
    refreshedKeywords,
    failedKeywords,
    failureReasons,
  };

  globalRefreshState.keywordRefreshLastRun = summary;

  if (summary.status === "failed") {
    log.error("[keyword-refresh]", "cycle finished with failures", {
      runId,
      scanned: summary.scannedKeywords,
      refreshed: summary.refreshedKeywords,
      failed: summary.failedKeywords,
    });
  } else {
    log.info("[keyword-refresh]", "cycle completed", {
      runId,
      scanned: summary.scannedKeywords,
      refreshed: summary.refreshedKeywords,
    });
  }

  return summary;
}
