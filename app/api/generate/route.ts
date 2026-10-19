import { z } from "zod";
import { runResearch, type ResearchEvent } from "@/lib/research";
import { checkRate } from "@/lib/ratelimit";
import { toAppError } from "@/lib/errors";

export const maxDuration = 300;
// runtime: Node.js is the default; an explicit `runtime` export is rejected when cacheComponents is on.

const Body = z.object({
  query: z.string().trim().min(1).max(200),
  website: z.string().url().refine((u) => /^https?:\/\//i.test(u), "website must be http(s)").optional(),
});

type ErrorEvent = { type: "error"; code: string; message: string };
const line = (ev: ResearchEvent | ErrorEvent) => JSON.stringify(ev) + "\n";
const ndjson = (body: BodyInit, status = 200) =>
  new Response(body, { status, headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });

export async function POST(request: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch {
    return ndjson(line({ type: "error", code: "bad_input", message: "Send JSON {query: string (1–200 chars), website?: http(s) URL}." }), 400);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const rate = checkRate(ip);
  if (!rate.ok)
    return ndjson(line({ type: "error", code: "rate_limited", message: `Generation limit reached. Try again in about ${Math.ceil(rate.retryAfterSec / 60)} minute(s).` }), 429);

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (ev: ResearchEvent | ErrorEvent) => { if (open) { try { controller.enqueue(enc.encode(line(ev))); } catch { open = false; } } };
      try {
        await runResearch(body, send);
      } catch (e) {
        const err = toAppError(e);
        if (err.code === "upstream") console.error("[generate]", e);
        send({ type: "error", code: err.code, message: err.message });
      } finally {
        open = false;
        try { controller.close(); } catch {}
      }
    },
  });
  return ndjson(stream);
}
