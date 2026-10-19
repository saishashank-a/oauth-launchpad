import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import http from "node:http";
import https from "node:https";

// SSRF guard: every resolved address must be public. Validation happens again inside the
// socket's lookup hook, so a DNS answer that changes between check and connect (rebinding)
// is still rejected.
const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["64:ff9b::", 96], ["ff00::", 8]] as const)
  blocked.addSubnet(net, prefix, "ipv6");

export function isPrivateAddress(addr: string): boolean {
  const fam = isIP(addr);
  if (fam === 0) return true;
  if (fam === 6 && /^::ffff:/i.test(addr)) return true; // IPv4-mapped, any form (not in BlockList: Node matches mapped subnets against plain IPv4 too)
  return blocked.check(addr, fam === 4 ? "ipv4" : "ipv6");
}

export class UnsafeUrlError extends Error {}

function checkUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new UnsafeUrlError(`invalid URL: ${raw}`); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new UnsafeUrlError(`scheme not allowed: ${u.protocol}`);
  if (u.username || u.password) throw new UnsafeUrlError("credentials in URL not allowed");
  if (u.port && u.port !== "80" && u.port !== "443") throw new UnsafeUrlError(`port not allowed: ${u.port}`);
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(host)) { if (isPrivateAddress(host)) throw new UnsafeUrlError(`private address: ${host}`); return u; }
  if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal"))
    throw new UnsafeUrlError(`host not allowed: ${host}`);
  return u;
}

async function resolvePublic(host: string) {
  const addrs = await lookup(host, { all: true, verbatim: true });
  if (!addrs.length) throw new UnsafeUrlError(`no DNS answer for ${host}`);
  const bad = addrs.find((a) => isPrivateAddress(a.address));
  if (bad) throw new UnsafeUrlError(`${host} resolves to private address ${bad.address}`);
  return addrs;
}

// Socket-level lookup hook: re-resolve and re-validate at connect time.
const guardedLookup = ((hostname: string, options: unknown, cb: (err: Error | null, address?: unknown, family?: number) => void) => {
  const all = typeof options === "object" && options !== null && (options as { all?: boolean }).all;
  resolvePublic(hostname).then(
    (addrs) => (all ? cb(null, addrs) : cb(null, addrs[0].address, addrs[0].family)),
    (e) => cb(e),
  );
}) as unknown as typeof import("node:dns").lookup;

type RawResponse = { status: number; location?: string; contentType: string; body: string };

function request(u: URL, maxBytes: number, signal: AbortSignal): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(u, {
      method: "GET", lookup: guardedLookup, signal,
      headers: { "user-agent": "OAuthLaunchpadBot/0.1 (+research)", accept: "text/html,text/plain;q=0.9,*/*;q=0.5", "accept-encoding": "identity" },
    }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400) { res.resume(); return resolve({ status, location: res.headers.location, contentType: "", body: "" }); }
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", (c: Buffer) => {
        if (size >= maxBytes) return;
        chunks.push(c); size += c.length;
        if (size >= maxBytes) res.destroy(); // ponytail: truncate, don't fail
      });
      const done = () => resolve({ status, contentType: String(res.headers["content-type"] ?? ""), body: Buffer.concat(chunks).subarray(0, maxBytes).toString("utf8") });
      res.on("end", done); res.on("close", done); res.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', mdash: "—", ndash: "–", hellip: "…" };
const decode = (s: string) => s.replace(/&(#x?[0-9a-f]+|[a-z]+\d*);/gi, (m, e: string) => {
  if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; }
  return ENTITIES[e.toLowerCase()] ?? m;
});

// ponytail: regex HTML→text. Good enough for docs pages; swap for a DOM parser if pages render badly.
export function htmlToText(html: string): { title: string; text: string } {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim());
  const text = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|nav|noscript|svg|template|head)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, t: string) => `\n\n## ${t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n\n`)
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/section|\/article|\/pre|\/table|\/ul|\/ol|\/dd|\/dt)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return {
    title,
    text: decode(text).split("\n").map((l) => l.replace(/[ \t ]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

export async function safeFetch(url: string, { maxBytes = 400_000, timeoutMs = 12_000, maxTextChars = 60_000 } = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = checkUrl(url);
  for (let hop = 0; hop <= 4; hop++) {
    if (!isIP(current.hostname.replace(/^\[|\]$/g, ""))) await resolvePublic(current.hostname);
    const res = await request(current, maxBytes, signal);
    if (res.status >= 300 && res.status < 400) {
      if (!res.location) throw new Error(`redirect without location from ${current.href}`);
      if (hop === 4) throw new Error(`too many redirects from ${url}`);
      current = checkUrl(new URL(res.location, current).href);
      continue;
    }
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status} for ${current.href}`);
    const isHtml = /html|xml/i.test(res.contentType) || /^\s*</.test(res.body);
    if (!isHtml && !/text\/|json/i.test(res.contentType)) throw new Error(`unsupported content-type ${res.contentType} for ${current.href}`);
    const { title, text } = isHtml ? htmlToText(res.body) : { title: "", text: res.body };
    return { url, finalUrl: current.href, title, text: text.slice(0, maxTextChars) };
  }
  throw new Error(`too many redirects from ${url}`);
}

const norm = (s: string) => s.toLowerCase().normalize("NFKC")
  .replace(/[‘’‚‛′`]/g, "'").replace(/[“”„″]/g, '"').replace(/[‐-―]/g, "-")
  .replace(/[^a-z0-9]+/g, " ").trim();

// Excerpt verification: tolerant of whitespace/quote/case/punctuation differences, never of word changes.
export function textContainsExcerpt(text: string, excerpt: string): boolean {
  const e = norm(excerpt);
  if (e.length < 12) return false; // too short to prove anything
  return ` ${norm(text)} `.includes(` ${e} `);
}
