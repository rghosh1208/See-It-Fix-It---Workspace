"use client";

import { useMemo } from "react";
import type { SifiResponse } from "@/lib/types";

export function StatsBar({
  rows,
  loading,
}: {
  rows: SifiResponse[];
  loading: boolean;
}) {
  const stats = useMemo(() => {
    const sites = new Set<string>();
    let withCoords = 0;
    let last: string | null = null;
    for (const r of rows) {
      if (r.site) sites.add(r.site);
      if (r.location_latitude != null && r.location_longitude != null) {
        withCoords++;
      }
      if (r.recorded_date && (!last || r.recorded_date > last)) {
        last = r.recorded_date;
      }
    }
    return { total: rows.length, sites: sites.size, withCoords, last };
  }, [rows]);

  const Card = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">
        {loading ? "…" : value}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card label="Responses with location" value={stats.total.toLocaleString()} />
      <Card label="Distinct sites" value={String(stats.sites)} />
      <Card label="With GPS coords" value={String(stats.withCoords)} />
      <Card
        label="Latest response"
        value={
          stats.last
            ? new Date(stats.last).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "—"
        }
      />
    </div>
  );
}
