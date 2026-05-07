// Helpers reutilizaveis do FireCrawl para edge functions
// Docs: https://docs.firecrawl.dev/

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

export interface FirecrawlScrapeOptions {
  formats?: Array<"markdown" | "html" | "rawHtml" | "links" | "json">;
  onlyMainContent?: boolean;
  waitFor?: number;
  parsePDF?: boolean;
  jsonOptions?: { schema?: Record<string, unknown>; prompt?: string };
}

export async function firecrawlScrape(
  url: string,
  opts: FirecrawlScrapeOptions = {},
): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return { success: false, error: "FIRECRAWL_API_KEY missing" };

  const body: Record<string, unknown> = {
    url,
    formats: opts.formats ?? ["markdown"],
    onlyMainContent: opts.onlyMainContent ?? true,
  };
  if (opts.waitFor) body.waitFor = opts.waitFor;
  if (opts.parsePDF) body.parsers = ["pdf"];
  if (opts.jsonOptions) body.jsonOptions = opts.jsonOptions;

  try {
    const r = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text();
      return { success: false, error: `${r.status}: ${txt.slice(0, 200)}` };
    }
    return await r.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function firecrawlSearch(
  query: string,
  opts: { limit?: number; scrape?: boolean; lang?: string; country?: string } = {},
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return { success: false, error: "FIRECRAWL_API_KEY missing" };

  const body: Record<string, unknown> = {
    query,
    limit: opts.limit ?? 10,
    lang: opts.lang ?? "pt",
    country: opts.country ?? "br",
  };
  if (opts.scrape) {
    body.scrapeOptions = { formats: ["markdown"], onlyMainContent: true };
  }

  try {
    const r = await fetch(`${FIRECRAWL_BASE}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text();
      return { success: false, error: `${r.status}: ${txt.slice(0, 200)}` };
    }
    return await r.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function firecrawlExtract(
  url: string,
  schema: Record<string, unknown>,
  prompt?: string,
) {
  return firecrawlScrape(url, {
    formats: ["json"],
    onlyMainContent: true,
    jsonOptions: { schema, prompt },
  });
}
