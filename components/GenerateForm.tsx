"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Progress = { stage: string; message: string };
type Candidate = { name: string; website: string; reason: string };
type ServerEvent =
  | ({ type: "progress" } & Progress)
  | { type: "candidates"; candidates: Candidate[] }
  | { type: "done"; slug: string; url: string }
  | { type: "error"; code: string; message: string };

export default function GenerateForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Progress[]>([]);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  async function run(website?: string) {
    setRunning(true); setSteps([]); setCandidates(null); setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(website ? { query, website } : { query }),
      });
      if (!res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finished = false;
      const handle = (ev: ServerEvent) => {
        if (ev.type === "progress") setSteps((s) => [...s, { stage: ev.stage, message: ev.message }]);
        else if (ev.type === "candidates") { setCandidates(ev.candidates); finished = true; }
        else if (ev.type === "error") { setError({ code: ev.code, message: ev.message }); finished = true; }
        else if (ev.type === "done") { finished = true; router.push(ev.url); }
      };
      for (;;) {
        const { value, done } = await reader.read();
        if (value) buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const raw = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          if (raw) handle(JSON.parse(raw) as ServerEvent);
        }
        if (done) break;
      }
      if (!finished) setError({ code: "upstream", message: "The connection closed before research finished. Try again." });
    } catch (e) {
      setError({ code: "upstream", message: `Request failed: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="w-full max-w-2xl space-y-4">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => { e.preventDefault(); if (query.trim() && !running) run(); }}
      >
        <div className="flex-1">
          <label htmlFor="gen-query" className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Provider and use case
          </label>
          <input
            id="gen-query"
            type="text"
            maxLength={200}
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Notion — read pages on behalf of users"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-200"
          />
        </div>
        <button
          type="submit"
          disabled={running || !query.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {running ? "Researching…" : "Generate guide"}
        </button>
      </form>

      <div aria-live="polite" aria-busy={running}>
        {steps.length > 0 && (
          <ol className="space-y-1 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-16 shrink-0 font-mono text-xs uppercase text-zinc-500">{s.stage}</span>
                <span className="text-zinc-800 dark:text-zinc-200">{s.message}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {candidates && (
        <fieldset className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
          <legend className="px-1 text-sm font-medium text-amber-900 dark:text-amber-200">Which provider did you mean?</legend>
          <ul className="space-y-2">
            {candidates.map((c) => (
              <li key={c.website}>
                <button
                  type="button"
                  onClick={() => run(c.website)}
                  disabled={running}
                  className="w-full rounded-md border border-amber-200 bg-white p-2 text-left text-sm hover:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-800 dark:bg-zinc-900"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</span>{" "}
                  <span className="text-zinc-500">{c.website}</span>
                  <span className="block text-zinc-600 dark:text-zinc-400">{c.reason}</span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {error && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <p className="font-medium">Generation failed <code className="ml-1 font-mono text-xs">{error.code}</code></p>
          <p className="mt-1">{error.message}</p>
        </div>
      )}
    </section>
  );
}
