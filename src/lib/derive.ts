import type { SifiResponse } from "./types";

/**
 * Pick a single category for a response.
 *
 * Priority:
 *   1. Use Q22 issue_category if present (Qualtrics dropdown choice).
 *      Qualtrics often appends sub-label lines like "(Only Shared Zoom
 *      Workspaces)" — we strip those for a clean chip.
 *   2. Fall back to keyword matching the free-text description.
 *   3. Otherwise "Unspecified".
 */
export function categorize(row: SifiResponse): string {
  if (row.issue_category && row.issue_category.trim()) {
    return cleanCategory(row.issue_category);
  }
  const text = (row.issue_description ?? "").toLowerCase();
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

function cleanCategory(s: string): string {
  // Take the part before the first line break or open paren.
  const first = s.split(/[\n(]/)[0].trim();
  return first || s.trim();
}

/**
 * Building label, derived from the free-text location.
 * "Wayne & Gladys Valley Center for Vision 3080-03-3111" → "WGVC for Vision".
 */
export function buildingOf(row: SifiResponse): string {
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

/** Trailing room id like "3043-02-234". */
export function roomOf(row: SifiResponse): string | null {
  const m = (row.location ?? "").match(/\d{3,5}-\d{1,3}-\d{1,5}/);
  return m ? m[0] : null;
}

/**
 * Detect when one room got an unusual burst of reports in a short window
 * (default: 3+ reports inside 1 hour). Returns the most notable burst or null.
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
      const end = new Date(sorted[i + minCount - 1].recorded_date!).getTime();
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
