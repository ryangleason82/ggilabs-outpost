import type { Article, Client } from "@prisma/client";

type GscClientConfig = Pick<
  Client,
  "name" | "gscPropertyUrl" | "gscClientId" | "gscClientSecret" | "gscRefreshToken"
>;

type SearchAnalyticsResponse = {
  rows?: {
    clicks?: number;
    impressions?: number;
    position?: number;
  }[];
};

type UrlInspectionResponse = {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
      lastCrawlTime?: string;
      googleCanonical?: string;
      userCanonical?: string;
    };
  };
};

export type GscArticleSyncResult = {
  gscClicks30d: number;
  gscImpressions30d: number;
  rankingPosition: number | null;
  gscIndexedStatus: string | null;
  gscCoverageState: string | null;
  gscLastCrawlTime: Date | null;
  gscGoogleCanonical: string | null;
  gscUserCanonical: string | null;
  gscRobotsTxtState: string | null;
  gscIndexingState: string | null;
  gscInspectionUpdatedAt: Date;
  performanceUpdatedAt: Date;
};

function requireGscConfig(client: GscClientConfig) {
  if (
    !client.gscPropertyUrl ||
    !client.gscClientId ||
    !client.gscClientSecret ||
    !client.gscRefreshToken
  ) {
    throw new Error(
      `Google Search Console config is missing for ${client.name}. Add the GSC property URL, OAuth client ID, client secret, and refresh token in Clients.`,
    );
  }
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizePropertyUrl(propertyUrl: string) {
  if (propertyUrl.startsWith("sc-domain:")) return propertyUrl;
  return propertyUrl.endsWith("/") ? propertyUrl : `${propertyUrl}/`;
}

function dateRangeForLast30CompleteDays() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

async function readJson<T>(res: Response) {
  const text = await res.text();
  const json = text ? (JSON.parse(text) as T) : ({} as T);
  return { text, json };
}

async function getAccessToken(client: GscClientConfig) {
  requireGscConfig(client);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: client.gscClientId ?? "",
      client_secret: client.gscClientSecret ?? "",
      refresh_token: client.gscRefreshToken ?? "",
    }),
  });

  const { text, json } = await readJson<{ access_token?: string }>(res);

  if (!res.ok || !json.access_token) {
    throw new Error(`Google OAuth refresh failed: ${text}`);
  }

  return json.access_token;
}

async function querySearchAnalytics(
  accessToken: string,
  propertyUrl: string,
  articleUrl: string,
) {
  const { startDate, endDate } = dateRangeForLast30CompleteDays();
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    propertyUrl,
  )}/searchAnalytics/query`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["page"],
      dimensionFilterGroups: [
        {
          filters: [
            {
              dimension: "page",
              operator: "equals",
              expression: articleUrl,
            },
          ],
        },
      ],
      rowLimit: 1,
    }),
  });

  const { text, json } = await readJson<SearchAnalyticsResponse>(res);
  if (!res.ok) {
    throw new Error(`Search Analytics query failed: ${text}`);
  }

  const row = json.rows?.[0];
  return {
    clicks: Math.round(row?.clicks ?? 0),
    impressions: Math.round(row?.impressions ?? 0),
    position: typeof row?.position === "number" ? row.position : null,
  };
}

async function inspectUrl(
  accessToken: string,
  propertyUrl: string,
  articleUrl: string,
) {
  const res = await fetch(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inspectionUrl: articleUrl,
        siteUrl: propertyUrl,
        languageCode: "en-US",
      }),
    },
  );

  const { text, json } = await readJson<UrlInspectionResponse>(res);
  if (!res.ok) {
    throw new Error(`URL Inspection query failed: ${text}`);
  }

  const index = json.inspectionResult?.indexStatusResult;
  return {
    verdict: index?.verdict ?? null,
    coverageState: index?.coverageState ?? null,
    robotsTxtState: index?.robotsTxtState ?? null,
    indexingState: index?.indexingState ?? null,
    lastCrawlTime: index?.lastCrawlTime ? new Date(index.lastCrawlTime) : null,
    googleCanonical: index?.googleCanonical ?? null,
    userCanonical: index?.userCanonical ?? null,
  };
}

export async function syncArticleGsc(
  article: Pick<Article, "publishedUrl" | "postTitle">,
  client: GscClientConfig,
): Promise<GscArticleSyncResult> {
  if (!article.publishedUrl) {
    throw new Error(`Article "${article.postTitle}" does not have a published URL.`);
  }

  const propertyUrl = normalizePropertyUrl(client.gscPropertyUrl ?? "");
  const accessToken = await getAccessToken(client);
  const [analytics, inspection] = await Promise.all([
    querySearchAnalytics(accessToken, propertyUrl, article.publishedUrl),
    inspectUrl(accessToken, propertyUrl, article.publishedUrl),
  ]);

  const now = new Date();

  return {
    gscClicks30d: analytics.clicks,
    gscImpressions30d: analytics.impressions,
    rankingPosition: analytics.position,
    gscIndexedStatus: inspection.verdict,
    gscCoverageState: inspection.coverageState,
    gscLastCrawlTime: inspection.lastCrawlTime,
    gscGoogleCanonical: inspection.googleCanonical,
    gscUserCanonical: inspection.userCanonical,
    gscRobotsTxtState: inspection.robotsTxtState,
    gscIndexingState: inspection.indexingState,
    gscInspectionUpdatedAt: now,
    performanceUpdatedAt: now,
  };
}
