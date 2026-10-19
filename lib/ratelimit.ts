// ponytail: in-memory sliding window, per serverless instance. Each warm instance has its own
// counters, so the real ceiling is limit × instances and resets on cold start. Move to
// Postgres/Upstash if abuse shows up.
const HOUR = 3_600_000;
const GLOBAL_PER_HOUR = 30;
const hits = new Map<string, number[]>();
let globalHits: number[] = [];

export function checkRate(ip: string, now = Date.now()): { ok: boolean; retryAfterSec: number } {
  const perIp = Number(process.env.GENERATE_RATE_LIMIT_PER_HOUR) || 5;
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < HOUR);
  globalHits = globalHits.filter((t) => now - t < HOUR);
  const retry = (list: number[]) => Math.ceil((list[0] + HOUR - now) / 1000);
  if (recent.length >= perIp) { hits.set(ip, recent); return { ok: false, retryAfterSec: retry(recent) }; }
  if (globalHits.length >= GLOBAL_PER_HOUR) return { ok: false, retryAfterSec: retry(globalHits) };
  recent.push(now); globalHits.push(now); hits.set(ip, recent);
  if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((t) => now - t < HOUR)) hits.delete(k);
  return { ok: true, retryAfterSec: 0 };
}
