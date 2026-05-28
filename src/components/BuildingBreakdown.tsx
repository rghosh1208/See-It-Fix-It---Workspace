"use client";

import { useMemo } from "react";
import type { SifiResponse } from "@/lib/types";
import { buildingOf, roomOf } from "@/lib/derive";

export function BuildingBreakdown({ rows }: { rows: SifiResponse[] }) {
  const { byBuilding, byRoom } = useMemo(() => {
    const b = new Map<string, number>();
    const r = new Map<string, number>();
    for (const row of rows) {
      const bn = buildingOf(row);
      b.set(bn, (b.get(bn) ?? 0) + 1);
      const rm = roomOf(row);
      if (rm) r.set(rm, (r.get(rm) ?? 0) + 1);
    }
    return {
      byBuilding: Array.from(b.entries()).sort((a, b) => b[1] - a[1]),
      byRoom: Array.from(r.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [rows]);

  const total = rows.length;
  const max = byBuilding[0]?.[1] ?? 1;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-medium text-slate-900">By building &amp; room</h2>
        <span className="text-xs text-slate-400">
          {byBuilding.length} site{byBuilding.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-3">
        {byBuilding.length === 0 && (
          <div className="text-sm text-slate-400 py-8 text-center">
            No reports in selection
          </div>
        )}
        {byBuilding.map(([name, count], idx) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const barPct = max > 0 ? (count / max) * 100 : 0;
          return (
            <div key={name}>
              <div className="flex items-baseline justify-between text-sm mb-1">
                <span className="font-medium text-slate-800">{name}</span>
                <span className="text-slate-500 text-xs">
                  {count} · {pct}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    idx === 0 ? "bg-brand-500" : "bg-brand-700"
                  }`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {byRoom.length > 0 && (
        <>
          <div className="text-xs uppercase tracking-wide text-slate-400 mt-5 mb-2">
            Rooms
          </div>
          <ul className="space-y-1.5">
            {byRoom.slice(0, 8).map(([rm, count], idx) => (
              <li
                key={rm}
                className="flex items-center justify-between text-sm"
              >
                <span
                  className={`font-mono text-xs rounded px-1.5 py-0.5 border ${
                    idx === 0
                      ? "bg-amber-100 border-amber-200 text-amber-900"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  {rm}
                </span>
                <span className="text-slate-500 text-xs">{count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
