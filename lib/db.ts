import postgres from "postgres";
import { Guide } from "./schema";

// ponytail: one table, guide JSON in a jsonb column. Slug is the stable share key.
const sql = postgres(process.env.DATABASE_URL ?? "", { ssl: "require", prepare: false, max: 3 });

export async function ensureSchema() {
  await sql`create table if not exists guides (
    slug text primary key,
    origin text not null,
    provider text not null,
    title text not null,
    body jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;
}

export async function saveGuide(g: Guide) {
  await sql`insert into guides (slug, origin, provider, title, body) values (${g.slug}, ${g.origin}, ${g.provider.name}, ${g.title}, ${sql.json(g as never)})
    on conflict (slug) do update set body = excluded.body, title = excluded.title, provider = excluded.provider, origin = excluded.origin, updated_at = now()`;
}

export async function getGuide(slug: string): Promise<Guide | null> {
  const rows = await sql`select body from guides where slug = ${slug}`;
  return rows[0] ? Guide.parse(rows[0].body) : null;
}

export async function listGuides(): Promise<Guide[]> {
  const rows = await sql`select body from guides order by origin asc, provider asc, title asc`;
  return rows.map((r) => Guide.parse(r.body));
}

export async function slugExists(slug: string) {
  const rows = await sql`select 1 from guides where slug = ${slug}`;
  return rows.length > 0;
}
