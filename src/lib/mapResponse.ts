import type { QualtricsResponse } from "./qualtrics";
import type { SifiResponse } from "./types";

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
 * Convert a Qualtrics response into the slim `sifi_workspace` row shape.
 * Returns `null` if the Location (Q23) is empty, so the sync route can skip it.
 */
export function mapQualtricsToRow(
  resp: QualtricsResponse,
): SifiResponse | null {
  const v = resp.values ?? {};
  const labels = resp.labels ?? {};

  const location =
    pickString(labels as Record<string, unknown>, ["Q23"]) ??
    pickString(v, ["Q23"]);
  if (!location || !location.trim()) return null;

  return {
    response_id: resp.responseId,
    start_date: pickTimestamp(v, ["startDate", "StartDate"]),
    end_date: pickTimestamp(v, ["endDate", "EndDate"]),
    recorded_date: pickTimestamp(v, ["recordedDate", "RecordedDate"]),
    recipient_first_name: pickString(v, [
      "recipientFirstName",
      "RecipientFirstName",
    ]),
    recipient_last_name: pickString(v, [
      "recipientLastName",
      "RecipientLastName",
    ]),
    recipient_email: pickString(v, ["recipientEmail", "RecipientEmail"]),
    contact_email: pickString(v, ["Q9_3"]),
    contact_phone: pickString(v, ["Q9_2"]),
    contact_department: pickString(v, ["Q9_5"]),
    location: location.trim(),
    issue_category:
      pickString(labels as Record<string, unknown>, ["Q22"]) ??
      pickString(v, ["Q22"]),
    issue_description: pickString(v, ["Q24"]),
    location_id: pickString(v, ["locationid"]),
  };
}
