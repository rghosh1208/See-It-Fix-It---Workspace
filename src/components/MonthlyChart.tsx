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
} from "recharts";
import type { SifiResponse } from "@/lib/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function MonthlyChart({ rows }: { rows: SifiResponse[] }) {
  const { data, label } = useMemo(() => {
    const dates: Date[] = [];
    for (const r of rows) {
      if (r.recorded_date) dates.push(new Date(r.recorded_date));
    }
    if (dates.length === 0)
      return { data: [] as { month: string; count: number }[], label: "" };
    dates.sort((a, b) => a.getTime() - b.getTime());
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    const counts = new Map<string, number>();
    for (const d of dates) {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const out: { month: string; count: number }[] = [];
    const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    while (cursor.getTime() <= end.getTime()) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      out.push({
        month: MONTHS[cursor.getMonth()],
        count: counts.get(key) ?? 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const rangeLabel =
      minDate.getFullYear() === maxDate.getFullYear()
        ? `${MONTHS[minDate.getMonth()]} – ${MONTHS[maxDate.getMonth()]} ${minDate.getFullYear()}`
        : `${MONTHS[minDate.getMonth()]} ${minDate.getFullYear()} – ${MONTHS[maxDate.getMonth()]} ${maxDate.getFullYear()}`;
    return { data: out, label: rangeLabel };
  }, [rows]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-medium text-slate-900">Reports by month</h2>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="h-64">
        {data.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-slate-400">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                fontSize={12}
                tick={{ fill: "#64748b" }}
              />
              <YAxis
                allowDecimals={false}
                fontSize={12}
                tick={{ fill: "#64748b" }}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
              />
              <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
