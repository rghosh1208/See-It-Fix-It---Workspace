/**
 * Seed sifi_workspace from the sample CSV (sample-data/sample.csv).
 *
 *   npm run seed
 *
 * Requires the same env vars as the main app:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * The CSV has two header rows — the first is Q-IDs, the second is the
 * human label, and data starts on row 3. We use the human-label row to
 * decide which column maps to which column in sifi_workspace.
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false },
});

function toNum(s: string | undefined): number | null {
  if (s == null || s.trim() === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}
function toBool(s: string | undefined): boolean | null {
  if (s == null || s.trim() === "") return null;
  if (s === "1" || s.toLowerCase() === "true") return true;
  if (s === "0" || s.toLowerCase() === "false") return false;
  return null;
}
function toTs(s: string | undefined): string | null {
  if (!s || !s.trim()) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function nz(s: string | undefined): string | null {
  return s && s.trim() ? s.trim() : null;
}

async function main() {
  const csvPath = path.resolve(
    process.cwd(),
    "sample-data/sample.csv",
  );
  const raw = fs.readFileSync(csvPath, "utf8");

  // Parse without auto-headers — we need to skip TWO header rows.
  const all: string[][] = parse(raw, {
    skip_empty_lines: false,
    relax_column_count: true,
    relax_quotes: true,
  });

  const qidRow = all[0];     // Q-IDs (e.g. StartDate, Q23, ...)
  const labelRow = all[1];   // Human labels (Start Date, Location, ...)
  const dataRows = all.slice(3).filter((r) => r.length > 1 && r[0] !== "");

  // Build column index by human label (case-insensitive, trimmed).
  // Some labels are multi-line — we collapse whitespace.
  const labelToIdx = new Map<string, number>();
  labelRow.forEach((l, i) => {
    if (!l) return;
    labelToIdx.set(l.replace(/\s+/g, " ").trim().toLowerCase(), i);
  });
  const qidToIdx = new Map<string, number>();
  qidRow.forEach((q, i) => {
    if (q) qidToIdx.set(q, i);
  });

  function byLabel(label: string): number | undefined {
    return labelToIdx.get(label.replace(/\s+/g, " ").trim().toLowerCase());
  }
  function get(row: string[], label: string): string | undefined {
    const i = byLabel(label);
    return i == null ? undefined : row[i];
  }
  function getByQid(row: string[], qid: string, occurrence = 0):
    | string
    | undefined {
    // Some Q-IDs appear more than once (e.g. Q23). Find Nth occurrence.
    let seen = -1;
    for (let i = 0; i < qidRow.length; i++) {
      if (qidRow[i] === qid) {
        seen++;
        if (seen === occurrence) return row[i];
      }
    }
    return undefined;
  }

  let inserted = 0;
  let skipped = 0;
  const batch: Record<string, unknown>[] = [];

  for (const row of dataRows) {
    const locationFreeText = nz(get(row, "Location"));
    if (!locationFreeText) {
      skipped++;
      continue;
    }

    // For issue types, the first Q23/Q24 occurrences are free-text
    // (Location, Description of Issue). The "Issue Type (Ceiling Tile)"
    // and "Issue Type (Door)" columns are SEPARATE occurrences — pick
    // them by the human label instead, which is unambiguous.
    batch.push({
      response_id: nz(get(row, "Response ID")) ?? cryptoRandom(),
      start_date: toTs(get(row, "Start Date")),
      end_date: toTs(get(row, "End Date")),
      recorded_date: toTs(get(row, "Recorded Date")),
      status: nz(get(row, "Response Type")),
      progress: toNum(get(row, "Progress")),
      duration_seconds: toNum(get(row, "Duration (in seconds)")),
      finished: toBool(get(row, "Finished")),
      ip_address: nz(get(row, "IP Address")),
      distribution_channel: nz(get(row, "Distribution Channel")),
      user_language: nz(get(row, "User Language")),
      location_latitude: toNum(get(row, "Location Latitude")),
      location_longitude: toNum(get(row, "Location Longitude")),
      recipient_first_name: nz(get(row, "Recipient First Name")),
      recipient_last_name: nz(get(row, "Recipient Last Name")),
      recipient_email: nz(get(row, "Recipient Email")),
      external_reference: nz(get(row, "External Data Reference")),

      site: nz(get(row, "LOCATION - Site")),
      building: nz(get(row, "LOCATION - Building")),
      room_number: nz(get(row, "SPECIFIC ROOM/AREA - Room #")),
      floor: nz(get(row, "SPECIFIC ROOM/AREA - Floor")),

      location: locationFreeText,

      description: nz(get(row, "DESCRIPTION")),
      issue_description: nz(get(row, "Description Of Issue (What can we help you with?)")),

      contact_email: nz(get(row, "CONTACT INFO - Email")),
      contact_phone: nz(get(row, "CONTACT INFO - Phone #")),
      contact_department: nz(get(row, "CONTACT INFO - Department Id")),

      issue_toilet: nz(get(row, "Issue Type (Toilet)")),
      issue_trash: nz(get(row, "Issue Type (Trash)")),
      issue_restroom_supplies: nz(get(row, "Issue Type (Restroom Supplies)")),
      issue_sink: nz(get(row, "Issue Type (Sink)")),
      issue_lights: nz(get(row, "Issue Type (Lights)")),
      issue_cleanliness: nz(get(row, "Issue Type (Cleanliness)")),
      issue_broken_dispenser: nz(get(row, "Issue Type (Broken Dispenser)")),
      issue_pest: nz(get(row, "Issue Type (Pest Issue)")),
      issue_ceiling_tile: nz(get(row, "Issue Type (Ceiling Tile)")),
      issue_door: nz(get(row, "Issue Type (Door Issue)")),

      source: nz(get(row, "source")),
      location_id: nz(get(row, "locationid")),

      topics: nz(get(row, "Q41_Name - Topics")),
      actionability: nz(get(row, "Q41_Name - Actionability")),
      effort: nz(get(row, "Q41_Name - Effort")),
      effort_numeric: toNum(get(row, "Q41_Name - Effort Numeric")),
      emotion_intensity: nz(get(row, "Q41_Name - Emotion Intensity")),
      emotion: nz(get(row, "Q41_Name - Emotion")),
      parent_topics: nz(get(row, "Q41_Name - Parent Topics")),
      sentiment_polarity: nz(get(row, "Q41_Name - Sentiment Polarity")),
      sentiment_score: toNum(get(row, "Q41_Name - Sentiment Score")),
      sentiment: nz(get(row, "Q41_Name - Sentiment")),
      topic_sentiment_label: nz(get(row, "Q41_Name - Topic Sentiment Label")),
      topic_sentiment_score: toNum(get(row, "Q41_Name - Topic Sentiment Score")),
      topic_hierarchy_level_1: nz(get(row, "Q41_Name - Topic Hierarchy Level 1")),

      raw: { _seededFromCsv: true, qidRow, labelRow, values: row },
    });
  }

  if (batch.length === 0) {
    console.log(`Nothing to insert. Skipped ${skipped} rows without a location.`);
    return;
  }

  const { error } = await supabase
    .from("sifi_workspace")
    .upsert(batch, { onConflict: "response_id" });
  if (error) {
    console.error("Upsert failed:", error);
    process.exit(1);
  }
  inserted = batch.length;
  console.log(`Seeded ${inserted} rows (skipped ${skipped} with empty Location).`);
}

function cryptoRandom() {
  return "seed_" + Math.random().toString(36).slice(2, 12);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
