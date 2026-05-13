import { runDailyKeywordRefreshCycle } from "./service";
import { log } from "@/lib/logger";

const globalSchedulerState = globalThis as unknown as {
  keywordRefreshSchedulerStarted?: boolean;
  keywordRefreshLastRunDate?: string;
};

/** Vercel serverless: use Vercel Cron → `/api/cron/keyword-refresh` instead of in-process timers. */
function shouldSkipEmbeddedScheduler(): boolean {
  return process.env.VERCEL === "1";
}

function getTodayKey(now: Date): string {
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
}

function shouldRunNow(now: Date): boolean {
  const targetHour = Number(process.env.KEYWORD_REFRESH_HOUR_UTC ?? "2");
  const targetMinute = Number(process.env.KEYWORD_REFRESH_MINUTE_UTC ?? "0");
  return now.getUTCHours() === targetHour && now.getUTCMinutes() === targetMinute;
}

export function startKeywordRefreshScheduler() {
  if (process.env.NODE_ENV === "test") return;
  if (globalSchedulerState.keywordRefreshSchedulerStarted) return;

  globalSchedulerState.keywordRefreshSchedulerStarted = true;

  if (shouldSkipEmbeddedScheduler()) {
    log.info(
      "[keyword-refresh:scheduler]",
      "embedded interval skipped on Vercel; configure Vercel Cron for GET /api/cron/keyword-refresh with CRON_SECRET",
    );
    return;
  }

  log.info("[keyword-refresh:scheduler]", "embedded interval started (non-Vercel Node)");

  const tick = async () => {
    const now = new Date();
    if (!shouldRunNow(now)) return;

    const todayKey = getTodayKey(now);
    if (globalSchedulerState.keywordRefreshLastRunDate === todayKey) return;

    globalSchedulerState.keywordRefreshLastRunDate = todayKey;
    try {
      await runDailyKeywordRefreshCycle();
    } catch (error) {
      log.error("[keyword-refresh:scheduler]", "daily cycle failed", error);
    }
  };

  void tick();
  setInterval(() => {
    void tick();
  }, 60_000);
}
