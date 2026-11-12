/**
 * Supabase, from the server only. Keys live in Vercel, never in the code:
 *   NEXT_PUBLIC_SUPABASE_URL     the project URL
 *   SUPABASE_SERVICE_ROLE_KEY    the service role (secret) key: server only, never sent to browsers
 * Talks to Supabase's REST API directly, so no extra package is needed.
 */
export function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function insertRow(table: string, row: Record<string, unknown>): Promise<boolean> {
  if (!supabaseConfigured()) return false;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
    cache: "no-store",
  });
  return res.ok;
}
