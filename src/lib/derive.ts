import type { SifiResponse } from "./types";

/**
 * Bucket a response into a single category. We prefer explicit Qualtrics
 * issue-type flags when present, then fall back to keyword matching on the
 * free-text description.
 */
export function categorize(row: SifiResponse): string {
  if (row.issue_toilet || row.issue_sink || row.issue_restroom_supplies)
    return "Restroom";
  if (row.issue_trash || row.issue_cleanliness) return "Cleanliness";
  if (row.issue_lights) return "Lights";
  if (row.issue_pest) return "Pest";
  if (row.issue_ceiling_tile || row.issue_door) return "Building";
  if (row.issue_broken_dispenser) return "Supplies";

  const text =
    `${row.issue_description ?? ""} ${row.description ?? ""}`.toLowerCase();
  if (/monitor|screen|laptop|docking|computer|tech|cable|wifi|wi-fi|network/.test(text))
    return "Technology";
  if (/desk|chair|table|stool|furniture|cabinet/.test(text)) return "Furniture";
  if (/noise|smell|odor|loud|fume/.test(text)) return "Noise/Nuisance";
  if (/clean|dirty|trash|spill/.test(text)) return "Cleanliness";
  if (/door|window|wall|ceiling|leak|tile|paint|hvac|heat|cold|temperature/.test(text))
    return "Building";
  if (text.trim().length > 0) return "Other";
  return "Unspecified";
}

/**
 * Extract the building label out of the free-text location field. The data
 * looks like "Wayne & Gladys Valley Center for Vision 3080-03-3111" — we
 * strip the trailing room-id pattern and apply a short alias map for the
 * names users actually want to see in the UI.
 */
export function buildingOf(row: SifiResponse): string {
  // 1) If we have the structured site, prefer it.
  if (row.site && row.site.trim()) return shortenBuilding(row.site.trim());

  // 2) Otherwise, parse out the trailing room-id like 3080-03-3111 / 3043-02-234
  const loc = (row.location ?? "").trim();
  const noRoom = loc.replace(/\s*\d{3,5}-\d{1,3}-\d{1,5}\s*$/, "").trim();
  return shortenBuilding(noRoom || "Unknown");
}

const BUILDING_ALIASES: [RegExp, string][] = [
  [/wayne.*valley.*vision/i, "WGVC for Vision"],
  [/654\s*minnesota/i, "654 Minnesota St"],
];
function shortenBuilding(name: string): string {
  for (const [re, alias] of BUILDING_ALIASES) if (re.test(name)) return alias;
  return name;
}

/**
 * Pull the trailing room id out of the location string ("3043-02-234").
 * Used in the "Rooms" list on the building card.
 */
export function roomOf(row: SifiResponse): string | null {
  if (row.room_number && row.room_number.trim()) return row.room_number.trim();
  const m = (row.location ?? "").match(/\d{3,5}-\d{1,3}-\d{1,5}/);
  return m ? m[0] : null;
}

/** Heuristic for "has photos" — look in the raw JSON for any Q20_Id field. */
export function hasPhotos(row: SifiResponse & { raw?: unknown }): boolean {
  const raw = row.raw as Record<string, unknown> | undefined;
  if (!raw) return false;
  // raw payload from sync route has shape { responseId, values, labels, ... }
  const values =
    (raw.values as Record<string, unknown> | undefined) ??
    (raw as Record<string, unknown>);
  for (const k of Object.keys(values ?? {})) {
    if (/^q\d+_id$/i.test(k) && values[k]) return true;
    if (/_uploaded/i.test(k) && values[k]) return true;
  }
  return false;
}

/**
 * Detect when one room got an unusual burst of reports in a short window
 * (default: 5+ reports inside 1 hour). Returns the most notable burst or null.
 */
export function detectCluster(
  rows: SifiResponse[],
  opts: { windowMinutes?: number; minCount?: number } = {},
): {
  room: string;
  building: string;
  count: number;
  windowMinutes: number;
  startedAt: string;
} | null {
  const windowMinutes = opts.windowMinutes ?? 60;
  const minCount = opts.minCount ?? 3;
  const windowMs = windowMinutes * 60_000;

  // Group by room id
  const byRoom = new Map<string, SifiResponse[]>();
  for (const r of rows) {
    const room = roomOf(r);
    if (!room || !r.recorded_date) continue;
    const arr = byRoom.get(room) ?? [];
    arr.push(r);
    byRoom.set(room, arr);
  }

  let best: ReturnType<typeof detectCluster> = null;
  for (const [room, list] of byRoom) {
    if (list.length < minCount) continue;
    const sorted = [...list].sort(
      (a, b) =>
        new Date(a.recorded_date!).getTime() -
        new Date(b.recorded_date!).getTime(),
    );
    for (let i = 0; i + minCount - 1 < sorted.length; i++) {
      const start = new Date(sorted[i].recorded_date!).getTime();
      const end = new Date(
        sorted[i + minCount - 1].recorded_date!,
      ).getTime();
      if (end - start <= windowMs) {
        const windowMinutesActual = Math.max(1, Math.round((end - start) / 60_000));
        const candidate = {
          room,
          building: buildingOf(sorted[i]),
          count: minCount,
          windowMinutes: windowMinutesActual,
          startedAt: sorted[i].recorded_date!,
        };
        if (!best || candidate.count > best.count) best = candidate;
      }
    }
  }
  return best;
}
