import fs from "node:fs";
import path from "node:path";
import { Guide } from "./schema";
import { getGuide, listGuides } from "./db";

// DB is the source of truth; data/guides/*.json is the local-dev fallback
// when DATABASE_URL is unset, the DB is unreachable, or it holds nothing yet.
const DIR = path.join(process.cwd(), "data", "guides");

function readFileGuides(): Guide[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  const out: Guide[] = [];
  for (const f of files) {
    try {
      out.push(Guide.parse(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"))));
    } catch (e) {
      console.error(`[guides] skipping invalid ${f}:`, e instanceof Error ? e.message : e);
    }
  }
  return out;
}

export async function listAllGuides(): Promise<Guide[]> {
  if (process.env.DATABASE_URL) {
    try {
      const rows = await listGuides();
      if (rows.length) return rows;
    } catch (e) {
      console.warn("[guides] DB list failed, falling back to files:", e instanceof Error ? e.message : e);
    }
  }
  return readFileGuides().sort((a, b) => a.origin.localeCompare(b.origin) || a.provider.name.localeCompare(b.provider.name));
}

export async function findGuide(slug: string): Promise<Guide | null> {
  if (process.env.DATABASE_URL) {
    try {
      const g = await getGuide(slug);
      if (g) return g;
    } catch (e) {
      console.warn("[guides] DB get failed, falling back to files:", e instanceof Error ? e.message : e);
    }
  }
  return readFileGuides().find((g) => g.slug === slug) ?? null;
}
