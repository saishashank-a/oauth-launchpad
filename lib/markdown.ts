import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

// Repo-authored markdown only, so no sanitizing.
export function renderMarkdown(src: string): string {
  // Setup-note images are copied to public/setup-notes/img by the prebuild script.
  return (marked.parse(src, { gfm: true, async: false }) as string).replaceAll(`src="img/`, `src="/setup-notes/img/`);
}

/** Reads markdown files under docs/; returns null if none exist. */
export function readDocs(relPaths: string[]): string | null {
  const parts = relPaths.flatMap((p) => {
    try {
      return [fs.readFileSync(path.join(process.cwd(), "docs", p), "utf8")];
    } catch {
      return [];
    }
  });
  return parts.length ? renderMarkdown(parts.join("\n\n---\n\n")) : null;
}

export function listDocsDir(sub: string, ext = ".md"): string[] {
  try {
    return fs.readdirSync(path.join(process.cwd(), "docs", sub)).filter((f) => f.endsWith(ext)).sort().map((f) => path.join(sub, f));
  } catch {
    return [];
  }
}
