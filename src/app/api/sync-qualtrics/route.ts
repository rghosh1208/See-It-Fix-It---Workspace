import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import {
  startExport,
  pollExport,
  downloadExport,
} from "@/lib/qualtrics";
import { mapQualtricsToRow } from "@/lib/mapResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/sync-qualtrics
 *
 * Staged sync so we never exceed Vercel's 60s function limit:
 *   - If sifi_workspace_sync_state.pending_progress_id is null:
 *       start a new Qualtrics export, save the progressId, poll briefly,
 *       and if it finishes in time, also download/import in this call.
 *   - If pending_progress_id is set:
 *       poll it; if complete, download/import + clear pending; if still
 *       in progress, leave pending alone for the next cron run.
 *
 * Cron fires every 15 minutes, so even a slow export completes within
 * a single tick.
 */
export async function GET(req: NextRequest) {
  // Cron auth
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("[sync-qualtrics] start");
  const supabase = getServiceSupabase();

  // Read the entire sync state row.
  const { data: stateRow, error: stateErr } = await supabase
    .from("sifi_workspace_sync_state")
    .select(
      "last_synced_at,pending_progress_id,pending_started_at,pending_start_date",
    )
    .eq("id", 1)
    .maybeSingle();
  if (stateErr) console.error("[sync-qualtrics] state read failed", stateErr);

  let progressId: string | null = stateRow?.pending_progress_id ?? null;
  let startDate: string | null = stateRow?.pending_start_date ?? null;

  // ---- Phase A: start a new export if we don't have one in flight ----
  if (!progressId) {
    startDate = stateRow?.last_synced_at ?? null;
    console.log("[sync-qualtrics] starting new export. startDate:", startDate);
    try {
      progressId = await startExport({
        startDate: startDate ?? undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[sync-qualtrics] startExport failed:", msg);
      await supabase
        .from("sifi_workspace_sync_state")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_error: msg,
        })
        .eq("id", 1);
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }

    await supabase
      .from("sifi_workspace_sync_state")
      .update({
        pending_progress_id: progressId,
        pending_started_at: new Date().toISOString(),
        pending_start_date: startDate,
        last_run_at: new Date().toISOString(),
        last_run_error: null,
      })
      .eq("id", 1);
    console.log("[sync-qualtrics] export started, progressId:", progressId);
  } else {
    console.log("[sync-qualtrics] resuming progressId:", progressId);
  }

  // ---- Phase B: poll briefly (≤ 35s) to see if the file is ready ----
  let fileId: string | null = null;
  try {
    const p = await pollExport(progressId, { maxPollMs: 35_000 });
    if (p.status === "failed") {
      console.error("[sync-qualtrics] Qualtrics reported failed");
      await supabase
        .from("sifi_workspace_sync_state")
        .update({
          pending_progress_id: null,
          pending_started_at: null,
          pending_start_date: null,
          last_run_at: new Date().toISOString(),
          last_run_error: "Qualtrics export status=failed",
        })
        .eq("id", 1);
      return NextResponse.json(
        { ok: false, error: "Qualtrics export failed" },
        { status: 500 },
      );
    }
    if (p.status === "inProgress") {
      console.log(
        "[sync-qualtrics] still in progress (",
        p.percentComplete,
        "%), will retry next tick",
      );
      await supabase
        .from("sifi_workspace_sync_state")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_error: null,
        })
        .eq("id", 1);
      return NextResponse.json({
        ok: true,
        status: "in_progress",
        progressId,
        percentComplete: p.percentComplete,
      });
    }
    fileId = p.fileId;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sync-qualtrics] pollExport failed:", msg);
    await supabase
      .from("sifi_workspace_sync_state")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_error: msg,
      })
      .eq("id", 1);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // ---- Phase C: download and upsert ----
  let inserted = 0;
  let skippedNoLocation = 0;
  try {
    console.log("[sync-qualtrics] downloading export, fileId:", fileId);
    const responses = await downloadExport(progressId);
    console.log("[sync-qualtrics] got responses:", responses.length);
    if (responses[0]) {
      console.log(
        "[sync-qualtrics] sample keys:",
        Object.keys(responses[0].values ?? {}).slice(0, 30),
      );
      console.log(
        "[sync-qualtrics] sample labels:",
        Object.keys(responses[0].labels ?? {}).slice(0, 30),
      );
    }

    const rows: unknown[] = [];
    for (const r of responses) {
      const row = mapQualtricsToRow(r);
      if (!row) {
        skippedNoLocation++;
        continue;
      }
      rows.push({ ...row, raw: r });
    }
    console.log(
      "[sync-qualtrics] mapped",
      rows.length,
      "rows, skipped",
      skippedNoLocation,
    );

    if (rows.length > 0) {
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

    await supabase
      .from("sifi_workspace_sync_state")
      .update({
        last_synced_at: new Date().toISOString(),
        last_run_at: new Date().toISOString(),
        last_run_inserted: inserted,
        last_run_skipped_no_loc: skippedNoLocation,
        last_run_error: null,
        pending_progress_id: null,
        pending_started_at: null,
        pending_start_date: null,
      })
      .eq("id", 1);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sync-qualtrics] download/import failed:", msg);
    await supabase
      .from("sifi_workspace_sync_state")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_error: msg,
        pending_progress_id: null,
        pending_started_at: null,
        pending_start_date: null,
      })
      .eq("id", 1);
    return NextResponse.json(
      { ok: false, error: msg, inserted, skippedNoLocation },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: "complete",
    inserted,
    skippedNoLocation,
    since: startDate,
  });
}
