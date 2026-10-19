import { existsSync, readFileSync } from "node:fs";
// Tiny .env.local loader for tsx scripts (Next loads it automatically for the app). Never overrides real env.
if (existsSync(".env.local"))
  for (const l of readFileSync(".env.local", "utf8").split("\n")) {
    const m = l.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
