import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/debug
 *
 * Returns the Supabase URL the server is actually using, plus the column
 * list and a sample row of sifi_workspace. Use this to confirm Vercel's
 * env vars point to the same Supabase project you're editing.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(unset)";
  // Mask the middle of the host so we can paste this safely
  const masked = url.replace(
    /https:\/\/([a-z0-9]{3})([a-z0-9]+)([a-z0-9]{3})\.supabase\.co/,
    "https://$1…$3.supabase.co",
  );

  const supabase = getServiceSupabase();
  const { data: rows, error: rowsErr } = await supabase
    .from("sifi_workspace")
    .select("*")
    .limit(1);

  return NextResponse.json({
    supabaseUrl: url,
    supabaseUrlMasked: masked,
    projectId: url
      .replace("https://", "")
      .replace(".supabase.co", "")
      .replace(/\/.*$/, ""),
    sampleRowColumns: rows?.[0] ? Object.keys(rows[0]).sort() : [],
    sampleRowHasIssueCategory: rows?.[0]
      ? "issue_category" in rows[0]
      : false,
    sampleRow: rows?.[0] ?? null,
    rowsError: rowsErr?.message ?? null,
  });
}
