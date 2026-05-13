import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { runDailyKeywordRefreshCycle } from "@/lib/keyword-refresh/service";

loadEnv({ path: resolve(process.cwd(), "..", ".env") });
loadEnv({ path: resolve(process.cwd(), ".env"), override: true });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const summary = await runDailyKeywordRefreshCycle();
  console.log("[keyword-refresh:manual] run summary");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
