import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateGuide } from "../lib/schema";

const args = process.argv.slice(2);
const files = args.length ? args : readdirSync("data/guides").filter((f) => f.endsWith(".json")).map((f) => join("data/guides", f));
let bad = 0;
for (const f of files) {
  try {
    const { guide, errors } = validateGuide(JSON.parse(readFileSync(f, "utf8")));
    if (errors.length) { bad++; console.log(`FAIL ${f}\n  ` + errors.join("\n  ")); }
    else console.log(`OK   ${f} (${guide.claims.length} claims)`);
  } catch (e) { bad++; console.log(`FAIL ${f}\n  ` + (e instanceof Error ? e.message : String(e))); }
}
process.exit(bad ? 1 : 0);
