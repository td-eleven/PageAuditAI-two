import { validateEnvironmentOnStartup } from "@/lib/env";
import { startKeywordRefreshScheduler } from "@/lib/keyword-refresh/scheduler";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateEnvironmentOnStartup();
    startKeywordRefreshScheduler();
  }
}
