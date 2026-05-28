import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/responses?site=&issueType=&search=&limit=
 *
 * Returns the rows the dashboard needs. We use the service role on the
 * server so that we never expose the anon key shape to the browser — but
 * the only data this route returns is whatever the public read policy
 * already allows.
 *
 * Filtering is done in the DB to keep the payload small.
 *
 * NOTE: We deliberately use a loose query-builder type (`any`). Supabase's
 * typed query builder has very deep generic types; chaining several dynamic
 * filters (especially with a runtime-built column name) trips TypeScript's
 * "Type instantiation is excessively deep" guardrail at build time.
 * Casting once at the top keeps the route ergonomic without changing
 * runtime behavior.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const site = url.searchParams.get("site");
  const issueType = url.searchParams.get("issueType");
  const search = url.searchParams.get("search");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 1000), 5000);

  const supabase = getServiceSupabase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from("sifi_workspace")
    .select("*")
    .not("location", "is", null)
    .order("recorded_date", { ascending: false })
    .limit(limit);

  if (site && site !== "all") q = q.eq("site", site);

  // Issue type filter: row must have a non-null value in the matching column.
  if (issueType && issueType !== "all") {
    const col = `issue_${issueType}`;
    q = q.not(col, "is", null);
  }

  if (search) {
    // Case-insensitive contains across location, description, issue_description.
    const safe = search.replace(/[%_,]/g, "");
    q = q.or(
      `location.ilike.%${safe}%,description.ilike.%${safe}%,issue_description.ilike.%${safe}%`,
    );
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}
