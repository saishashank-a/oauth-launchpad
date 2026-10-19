import "./env"; // must run before lib/db reads DATABASE_URL
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateGuide } from "../lib/schema";

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set (env or .env.local)."); process.exit(1); }
  const { ensureSchema, saveGuide } = await import("../lib/db");
  await ensureSchema();
  const files = readdirSync("data/guides").filter((f) => f.endsWith(".json"));
  let ok = 0, bad = 0;
  for (const f of files) {
    try {
      const { guide, errors } = validateGuide(JSON.parse(readFileSync(join("data/guides", f), "utf8")));
      if (errors.length) throw new Error(errors.join("; "));
      await saveGuide({ ...guide, origin: "curated" }); // ponytail: data/guides is the curated set by definition
      ok++; console.log(`upserted ${guide.slug}`);
    } catch (e) { bad++; console.log(`SKIP ${f}: ${e instanceof Error ? e.message : e}`); }
  }
  console.log(`seeded ${ok}/${files.length} guides, ${bad} failed`);
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
