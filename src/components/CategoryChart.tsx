"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SifiResponse } from "@/lib/types";
import { categorize } from "@/lib/derive";

const COLORS: Record<string, string> = {
  Technology: "#2563eb",
  Furniture: "#c2410c",
  "Noise/Nuisance": "#c2410c",
  Cleanliness: "#0891b2",
  Restroom: "#0891b2",
  Lights: "#eab308",
  Building: "#7c3aed",
  Pest: "#dc2626",
  Supplies: "#16a34a",
  Other: "#475569",
  Unspecified: "#94a3b8",
};

export function CategoryChart({ rows }: { rows: SifiResponse[] }) {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const c = categorize(r);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const total = rows.length;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-medium text-slate-900">Reports by category</h2>
        <span className="text-xs text-slate-400">{total} total</span>
      </div>
      <div className="h-72">
        {data.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                allowDecimals={false}
                fontSize={12}
                tick={{ fill: "#64748b" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                fontSize={12}
                tick={{ fill: "#334155" }}
                interval={0}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((d) => (
                  <Cell key={d.label} fill={COLORS[d.label] ?? "#475569"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="h-full grid place-items-center text-sm text-slate-400">
      No reports in selection
    </div>
  );
}
