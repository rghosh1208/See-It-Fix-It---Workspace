"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ISSUE_TYPE_COLUMNS, type SifiResponse } from "@/lib/types";

export function IssueBreakdown({ rows }: { rows: SifiResponse[] }) {
  const data = useMemo(() => {
    return ISSUE_TYPE_COLUMNS.map(({ key, label }) => {
      let count = 0;
      for (const r of rows) {
        const v = r[key];
        if (typeof v === "string" && v.trim().length > 0) count++;
      }
      return { label, count };
    }).sort((a, b) => b.count - a.count);
  }, [rows]);

  const hasAny = data.some((d) => d.count > 0);
  if (!hasAny) {
    return (
      <div className="h-[420px] grid place-items-center text-sm text-slate-500 border border-dashed border-slate-300 rounded">
        No issue-type data in the current filter.
      </div>
    );
  }

  return (
    <div className="h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" allowDecimals={false} fontSize={12} />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            fontSize={12}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="count" fill="#3b6fb6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
