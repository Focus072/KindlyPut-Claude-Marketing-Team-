import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __kpSql: ReturnType<typeof postgres> | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it in Vercel → Project → Settings → Environment Variables (see SETUP.md).",
    );
  }
  // prepare:false keeps this compatible with Supabase's transaction pooler.
  return postgres(url, { prepare: false, max: 5, idle_timeout: 20, onnotice: () => {} });
}

/** Lazily created so builds don't need a database. */
export function db() {
  if (!globalThis.__kpSql) globalThis.__kpSql = create();
  return globalThis.__kpSql;
}
