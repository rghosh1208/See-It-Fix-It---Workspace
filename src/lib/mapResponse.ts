import type { QualtricsResponse } from "./qualtrics";
import type { SifiResponse } from "./types";

/**
 * Pick the first non-empty string value out of a list of candidate keys
 * from the Qualtrics `values` object.
 *
 * Qualtrics surveys are messy: question IDs sometimes repeat across pages
 * with different meanings (the SEE IT FIX IT survey uses Q22, Q23, Q24 for
 * BOTH free-text location info AND issue-type categories). We rely on the
 * labels payload to disambiguate where possible, but for canonical fields
 * the candidate list lets us fall back gracefully.
 */
function pickString(
  values: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = values[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

function pickNumber(
  values: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const k of keys) {
    const v = values[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function pickBool(
  values: Record<string, unknown>,
  keys: string[],
): boolean | null {
  for (const k of keys) {
    const v = values[k];
    if (typeof v === "boolean") return v;
    if (v === 1 || v === "1" || v === "true") return true;
    if (v === 0 || v === "0" || v === "false") return false;
  }
  return null;
}

function pickTimestamp(
  values: Record<string, unknown>,
  keys: string[],
): string | null {
  const s = pickString(values, keys);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Convert a Qualtrics response object into a row matching our Supabase
 * `sifi_workspace` schema. Returns `null` if the row should be skipped
 * (e.g. the location filter field Q23 is empty).
 */
export function mapQualtricsToRow(
  resp: QualtricsResponse,
): SifiResponse | null {
  const v = resp.values ?? {};
  const labels = resp.labels ?? {};

  // The "location" filter field is Q23 in its FREE-TEXT meaning. The same
  // Q-ID is reused for "Issue Type (Ceiling Tile)" elsewhere — we trust the
  // label payload when it's present, otherwise we use the raw value.
  const locationFreeText =
    pickString(labels as Record<string, unknown>, ["Q23"]) ??
    pickString(v, ["Q23"]);
  if (!locationFreeText || !locationFreeText.trim()) return null;

  const row: SifiResponse = {
    response_id: resp.responseId,
    start_date: pickTimestamp(v, ["startDate", "StartDate"]),
    end_date: pickTimestamp(v, ["endDate", "EndDate"]),
    recorded_date: pickTimestamp(v, ["recordedDate", "RecordedDate"]),
    status: pickString(v, ["status", "Status"]),
    progress: pickNumber(v, ["progress", "Progress"]),
    duration_seconds: pickNumber(v, ["duration", "Duration (in seconds)"]),
    finished: pickBool(v, ["finished", "Finished"]),
    ip_address: pickString(v, ["ipAddress", "IPAddress"]),
    distribution_channel: pickString(v, [
      "distributionChannel",
      "DistributionChannel",
    ]),
    user_language: pickString(v, ["userLanguage", "UserLanguage"]),

    location_latitude: pickNumber(v, ["locationLatitude", "LocationLatitude"]),
    location_longitude: pickNumber(v, [
      "locationLongitude",
      "LocationLongitude",
    ]),

    recipient_first_name: pickString(v, [
      "recipientFirstName",
      "RecipientFirstName",
    ]),
    recipient_last_name: pickString(v, [
      "recipientLastName",
      "RecipientLastName",
    ]),
    recipient_email: pickString(v, ["recipientEmail", "RecipientEmail"]),
    external_reference: pickString(v, [
      "externalDataReference",
      "ExternalReference",
    ]),

    site: pickString(v, ["Q13_1"]),
    building: pickString(v, ["Q13_2"]),
    room_number: pickString(v, ["Q14_1"]),
    floor: pickString(v, ["Q14_2"]),

    location: locationFreeText.trim(),

    description: pickString(v, ["Q31"]),
    issue_description: pickString(v, ["Q24"]),

    contact_email: pickString(v, ["Q9_3"]),
    contact_phone: pickString(v, ["Q9_2"]),
    contact_department: pickString(v, ["Q9_5"]),

    // Issue type fields — prefer the labelled choice text when available
    issue_toilet: pickString(labels as Record<string, unknown>, ["Q15"]) ??
      pickString(v, ["Q15"]),
    issue_trash: pickString(labels as Record<string, unknown>, ["Q16"]) ??
      pickString(v, ["Q16"]),
    issue_restroom_supplies:
      pickString(labels as Record<string, unknown>, ["Q17"]) ??
      pickString(v, ["Q17"]),
    issue_sink: pickString(labels as Record<string, unknown>, ["Q18"]) ??
      pickString(v, ["Q18"]),
    issue_lights: pickString(labels as Record<string, unknown>, ["Q19"]) ??
      pickString(v, ["Q19"]),
    issue_cleanliness: pickString(labels as Record<string, unknown>, ["Q20"]) ??
      pickString(v, ["Q20"]),
    issue_broken_dispenser:
      pickString(labels as Record<string, unknown>, ["Q21"]) ??
      pickString(v, ["Q21"]),
    issue_pest: pickString(labels as Record<string, unknown>, ["Q22"]) ??
      pickString(v, ["Q22"]),
    issue_ceiling_tile:
      // Q23 the issue-type lives in labels here; the free-text location is
      // already captured above into `location`.
      pickString(labels as Record<string, unknown>, ["Q23"]) === locationFreeText
        ? null
        : pickString(labels as Record<string, unknown>, ["Q23"]),
    issue_door: pickString(labels as Record<string, unknown>, ["Q24"]) ??
      null,

    source: pickString(v, ["source"]),
    location_id: pickString(v, ["locationid"]),

    topics: pickString(v, ["Q41_Name - Topics"]),
    actionability: pickString(v, ["Q41_Name - Actionability"]),
    effort: pickString(v, ["Q41_Name - Effort"]),
    effort_numeric: pickNumber(v, ["Q41_Name - Effort Numeric"]),
    emotion_intensity: pickString(v, ["Q41_Name - Emotion Intensity"]),
    emotion: pickString(v, ["Q41_Name - Emotion"]),
    parent_topics: pickString(v, ["Q41_Name - Parent Topics"]),
    sentiment_polarity: pickString(v, ["Q41_Name - Sentiment Polarity"]),
    sentiment_score: pickNumber(v, ["Q41_Name - Sentiment Score"]),
    sentiment: pickString(v, ["Q41_Name - Sentiment"]),
    topic_sentiment_label: pickString(v, ["Q41_Name - Topic Sentiment Label"]),
    topic_sentiment_score: pickNumber(v, [
      "Q41_Name - Topic Sentiment Score",
    ]),
    topic_hierarchy_level_1: pickString(v, [
      "Q41_Name - Topic Hierarchy Level 1",
    ]),
  };

  return row;
}
