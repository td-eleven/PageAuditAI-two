type DataForSeoTaskResult = {
  items?: Array<{
    rank_absolute?: number;
  }>;
};

type DataForSeoTask = {
  status_code?: number;
  result?: DataForSeoTaskResult[];
};

type DataForSeoResponse = {
  status_code?: number;
  tasks?: DataForSeoTask[];
};

export type RankLookupInput = {
  domainName: string;
  keyword: string;
};

export type RankLookupResult = {
  rank: number | null;
  source: "dataforseo" | "fallback";
  reason?: string;
};

function getDataForSeoConfig() {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  const locationCode = Number(process.env.DATAFORSEO_LOCATION_CODE ?? "2840");
  const languageCode = process.env.DATAFORSEO_LANGUAGE_CODE?.trim() ?? "en";

  if (!login || !password) {
    return null;
  }

  return { login, password, locationCode, languageCode };
}

export async function fetchKeywordRank(
  input: RankLookupInput,
): Promise<RankLookupResult> {
  const config = getDataForSeoConfig();

  if (!config) {
    return {
      rank: null,
      source: "fallback",
      reason: "DATAFORSEO_LOGIN/PASSWORD not configured",
    };
  }

  try {
    const auth = Buffer.from(`${config.login}:${config.password}`).toString("base64");
    const response = await fetch(
      "https://api.dataforseo.com/v3/serp/google/organic/live/regular",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keyword: input.keyword,
            location_code: config.locationCode,
            language_code: config.languageCode,
            depth: 10,
            calculate_rectangles: false,
          },
        ]),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        rank: null,
        source: "fallback",
        reason: `HTTP ${response.status}`,
      };
    }

    const body = (await response.json()) as DataForSeoResponse;
    const task = body.tasks?.[0];
    const firstResult = task?.result?.[0];
    const firstOrganic = firstResult?.items?.find(
      (item) => typeof item.rank_absolute === "number",
    );

    if (typeof firstOrganic?.rank_absolute === "number") {
      return { rank: firstOrganic.rank_absolute, source: "dataforseo" };
    }

    return {
      rank: null,
      source: "fallback",
      reason: "No organic rank found in response",
    };
  } catch (error) {
    return {
      rank: null,
      source: "fallback",
      reason:
        error instanceof Error ? error.message : "Unknown DataForSEO request error",
    };
  }
}
