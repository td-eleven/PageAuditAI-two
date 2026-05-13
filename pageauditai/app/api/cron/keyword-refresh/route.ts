import { NextResponse } from "next/server";
import { runDailyKeywordRefreshCycle } from "@/lib/keyword-refresh/service";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Vercel Cron (or any caller) hits this route with `Authorization: Bearer CRON_SECRET`.
 * Keeps keyword refresh reliable on serverless where in-process timers are not.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    log.warn("[cron:keyword-refresh]", "unauthorized request");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const summary = await runDailyKeywordRefreshCycle();
    log.info("[cron:keyword-refresh]", "cycle finished", {
      status: summary.status,
      scanned: summary.scannedKeywords,
      refreshed: summary.refreshedKeywords,
      failed: summary.failedKeywords,
    });
    return NextResponse.json({
      ok: summary.status !== "failed",
      runId: summary.runId,
      scanned: summary.scannedKeywords,
      refreshed: summary.refreshedKeywords,
    });
  } catch (error) {
    log.error("[cron:keyword-refresh]", "cycle threw", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
