import { AppError, ConfigError, RateLimitedError } from "./errors";

export type SearchResult = { title: string; url: string; snippet: string };

export async function search(query: string, { maxResults = 5, includeDomains }: { maxResults?: number; includeDomains?: string[] } = {}): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new ConfigError("TAVILY_API_KEY");
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, search_depth: "basic", max_results: maxResults, ...(includeDomains?.length ? { include_domains: includeDomains } : {}) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 429) throw new RateLimitedError("The search provider (Tavily)");
  if (res.status === 401 || res.status === 403) throw new AppError("missing_config", "TAVILY_API_KEY was rejected by Tavily; check the key on the server.");
  if (!res.ok) throw new AppError("upstream", `Search provider returned HTTP ${res.status}.`);
  const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (data.results ?? []).filter((r) => r.url).map((r) => ({ title: r.title ?? "", url: r.url!, snippet: (r.content ?? "").slice(0, 500) }));
}
