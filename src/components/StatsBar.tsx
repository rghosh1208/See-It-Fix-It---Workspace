"use client";

import { useMemo } from "react";
import type { SifiResponse } from "@/lib/types";
import { buildingOf, categorize, roomOf } from "@/lib/derive";

export function StatsBar({
  rows,
  loading,
}: {
  rows: SifiResponse[];
  loading: boolean;
}) {
  const stats = useMemo(() => {
    const buildings = new Set<string>();
    const rooms = new Set<string>();
    const categoryCounts = new Map<string, number>();
    let latest: string | null = null;
    for (const r of rows) {
      buildings.add(buildingOf(r));
      const room = roomOf(r);
      if (room) rooms.add(room);
      const cat = categorize(r);
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
      if (r.recorded_date && (!latest || r.recorded_date > latest)) {
        latest = r.recorded_date;
      }
    }
    const sortedCats = Array.from(categoryCounts.entries())
      .filter(([k]) => k !== "Unspecified")
      .sort((a, b) => b[1] - a[1]);
    const topCount = sortedCats[0]?.[1] ?? 0;
    const topCats = sortedCats.filter(([, n]) => n === topCount).map(([k]) => k);
    return {
      total: rows.length,
      buildings: buildings.size,
      rooms: rooms.size,
      topCategoryLabel:
        topCats.length === 0
          ? "—"
          : topCats.length === 1
            ? topCats[0]
            : topCats.join(" · "),
      topCategoryHint:
        topCats.length > 1
          ? `tied at ${topCount} each`
          : topCats.length === 1
            ? `${topCount} report${topCount === 1 ? "" : "s"}`
            : "—",
      latest,
    };
  }, [rows]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card
        label="Total reports"
        value={loading ? "…" : String(stats.total)}
        subtitle="in selected range"
      />
      <Card
        label="Buildings"
        value={loading ? "…" : String(stats.buildings)}
        subtitle={`${stats.rooms} distinct room${stats.rooms === 1 ? "" : "s"}`}
      />
      <Card
        label="Top category"
        value={loading ? "…" : stats.topCategoryLabel}
        subtitle={stats.topCategoryHint}
        valueClass="text-xl"
      />
      <Card
        label="Latest report"
        value={
          loading
            ? "…"
            : stats.latest
              ? new Date(stats.latest).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "—"
        }
        subtitle={
          stats.latest
            ? new Date(stats.latest).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })
            : ""
        }
        valueClass="text-2xl"
      />
    </div>
  );
}

function Card({
  label,
  value,
  subtitle,
  valueClass = "text-3xl",
}: {
  label: string;
  value: string;
  subtitle?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-2 font-semibold text-slate-900 ${valueClass}`}>
        {value}
      </div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}
