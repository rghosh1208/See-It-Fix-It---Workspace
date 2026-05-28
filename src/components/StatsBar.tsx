"use client";

import { useMemo } from "react";
import type { SifiResponse } from "@/lib/types";
import { buildingOf, categorize, hasPhotos, roomOf } from "@/lib/derive";

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
    let withPhotos = 0;
    for (const r of rows) {
      buildings.add(buildingOf(r));
      const room = roomOf(r);
      if (room) rooms.add(room);
      const cat = categorize(r);
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
      if (hasPhotos(r)) withPhotos++;
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
        topCats.length > 1 ? `tied at ${topCount} each` : topCats.length === 1 ? `${topCount} report${topCount === 1 ? "" : "s"}` : "—",
      withPhotos,
      photoPct: rows.length ? Math.round((withPhotos / rows.length) * 100) : 0,
    };
  }, [rows]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card label="Total reports" value={loading ? "…" : String(stats.total)} subtitle="in selected range" />
      <Card
        label="Buildings"
        value={loading ? "…" : String(stats.buildings)}
        subtitle={`${stats.rooms} distinct room${stats.rooms === 1 ? "" : "s"}`}
      />
      <Card label="Top category" value={loading ? "…" : stats.topCategoryLabel} subtitle={stats.topCategoryHint} valueClass="text-xl" />
      <Card
        label="With photos"
        value={loading ? "…" : `${stats.withPhotos}`}
        suffix={`/${stats.total}`}
        subtitle={`${stats.photoPct}% attachment rate`}
      />
    </div>
  );
}

function Card({
  label,
  value,
  suffix,
  subtitle,
  valueClass = "text-3xl",
}: {
  label: string;
  value: string;
  suffix?: string;
  subtitle?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`font-semibold text-slate-900 ${valueClass}`}>
          {value}
        </span>
        {suffix && <span className="text-sm text-slate-400">{suffix}</span>}
      </div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}
