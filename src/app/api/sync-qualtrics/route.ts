import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { fetchQualtricsResponses } from "@/lib/qualtrics";
import { mapQualtricsToRow } from "@/lib/mapResponse";

// Force Node.js runtime (zlib + service-role key are not edge-safe)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel hobby max; bump on Pro

/**
 * GET /api/sync-qualtrics
 *
 * Vercel cron hits this every 15 minutes. It:
 *   1. Reads the last_synced_at watermark from sifi_workspace_sync_state
 *   2. Pulls all Qualtrics responses recorded after that watermark
 *   3. Filters out rows where Location (Q23) is empty
 *   4. Upserts the rest into sifi_workspace on response_id
 *   5. Bumps the watermark
 *
 * Vercel sends a `Authorization: Bearer ${CRON_SECRET}` header on scheduled
 * invocations. We require that header in production; locally you can call
 * without it.
 */
export async function GET(req: NextRequest) {
  // Cron auth: in production, only allow if the secret matches.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("[sync-qualtrics] start");
  const supabase = getServiceSupabase();

  // 1. Watermark
  const { data: stateRow, error: stateErr } = await supabase
    .from("sifi_workspace_sync_state")
    .select("last_synced_at")
    .eq("id", 1)
    .maybeSingle();
  if (stateErr) {
    console.error("[sync-qualtrics] watermark read failed", stateErr);
  }
  const lastSyncedAt = stateRow?.last_synced_at ?? undefined;
  console.log("[sync-qualtrics] watermark", lastSyncedAt);

  let inserted = 0;
  let skippedNoLocation = 0;
  let errorMsg: string | null = null;

  try {
    console.log("[sync-qualtrics] fetching responses from Qualtrics...");
    const responses = await fetchQualtricsResponses({
      startDate: lastSyncedAt ?? undefined,
    });
    console.log("[sync-qualtrics] got responses:", responses.length);
    if (responses[0]) {
      console.log(
        "[sync-qualtrics] sample keys:",
        Object.keys(responses[0].values ?? {}).slice(0, 30),
      );
    }

    // Map + filter
    const rows = [];
    for (const r of responses) {
      const row = mapQualtricsToRow(r);
      if (!row) {
        skippedNoLocation++;
        continue;
      }
      rows.push({ ...row, raw: r as unknown });
    }
    console.log(
      "[sync-qualtrics] mapped",
      rows.length,
      "rows, skipped",
      skippedNoLocation,
    );

    if (rows.length > 0) {
      // Upsert in batches to stay under Supabase's payload limits.
      const BATCH = 500;
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH);
        const { error } = await supabase
          .from("sifi_workspace")
          .upsert(slice, { onConflict: "response_id" });
        if (error) {
          console.error("[sync-qualtrics] supabase upsert error", error);
          throw error;
        }
        inserted += slice.length;
      }
    }

    // Bump watermark to "now" — using server time avoids clock drift between
    // Qualtrics and Supabase. We trade a small chance of double-fetching a
    // boundary response for guaranteed not-missing any.
    await supabase
      .from("sifi_workspace_sync_state")
      .update({
        last_synced_at: new Date().toISOString(),
        last_run_at: new Date().toISOString(),
        last_run_inserted: inserted,
        last_run_skipped_no_loc: skippedNoLocation,
        last_run_error: null,
      })
      .eq("id", 1);
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[sync-qualtrics] FAILED:", errorMsg, err);
    await supabase
      .from("sifi_workspace_sync_state")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_error: errorMsg,
      })
      .eq("id", 1);
    return NextResponse.json(
      { ok: false, error: errorMsg, inserted, skippedNoLocation },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    inserted,
    skippedNoLocation,
    since: lastSyncedAt ?? null,
  });
}
