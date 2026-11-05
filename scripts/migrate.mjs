// Applies db/migrations/*.sql in order and records them in team.schema_migrations.
// Usage: DATABASE_URL=... npm run db:migrate
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = postgres(url, { prepare: false, onnotice: () => {} });
const dir = path.resolve("db/migrations");
try {
  await sql`create schema if not exists team`;
  await sql`create table if not exists team.schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql`select name from team.schema_migrations`).map((r) => r.name));
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) { console.log(`skip  ${file}`); continue; }
    await sql.begin(async (tx) => {
      await tx.unsafe(fs.readFileSync(path.join(dir, file), "utf8"));
      await tx`insert into team.schema_migrations (name) values (${file})`;
    });
    console.log(`apply ${file}`);
  }
} finally {
  await sql.end();
}
