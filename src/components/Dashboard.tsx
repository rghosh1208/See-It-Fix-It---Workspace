"use client";

import { useMemo, useState } from "react";
import type { SifiResponse } from "@/lib/types";
import { buildingOf, categorize, detectCluster, roomOf } from "@/lib/derive";
import { STATIC_ROWS } from "@/lib/staticData";
import { StatsBar } from "./StatsBar";
import { ClusterAlert } from "./ClusterAlert";
import { CategoryChart } from "./CategoryChart";
import { BuildingBreakdown } from "./BuildingBreakdown";
import { MonthlyChart } from "./MonthlyChart";
import { ResponsesTable } from "./ResponsesTable";

export function Dashboard() {
  // Static data — see src/lib/staticData.ts. To update the dashboard, edit
  // that file, commit, push. No Supabase round-trip required.
  const [rows] = useState<SifiResponse[]>(STATIC_ROWS);
  const loading = false;
  const error: string | null = null;

  const [building, setBuilding] = useState("all");
  const [category, setCategory] = useState("all");

  const enriched = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        _building: buildingOf(r),
        _category: categorize(r),
        _room: roomOf(r),
      })),
    [rows],
  );

  const buildings = useMemo(() => {
    const s = new Set<string>();
    for (const r of enriched) s.add(r._building);
    return Array.from(s).sort();
  }, [enriched]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const r of enriched) s.add(r._category);
    return Array.from(s).sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter(
      (r) =>
        (building === "all" || r._building === building) &&
        (category === "all" || r._category === category),
    );
  }, [enriched, building, category]);

  const range = useMemo(() => {
    const dates = filtered
      .map((r) => r.recorded_date)
      .filter(Boolean)
      .map((d) => new Date(d as string))
      .sort((a, b) => a.getTime() - b.getTime());
    if (dates.length === 0) return null;
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [filtered]);

  const cluster = useMemo(() => detectCluster(filtered), [filtered]);

  function exportCsv() {
    const cols = [
      "response_id",
      "recorded_date",
      "_building",
      "_room",
      "_category",
      "location",
      "issue_description",
      "contact_email",
      "contact_phone",
      "contact_department",
    ];
    const lines = [cols.join(",")];
    for (const r of filtered) {
      const vals = cols.map((c) => {
        const v = (r as Record<string, unknown>)[c];
        if (v == null) return "";
        const s = String(v).replace(/"/g, '""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
      });
      lines.push(vals.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sifi-workspace-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="inline-block w-1.5 h-6 bg-brand-700 rounded-sm" />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Workspace Reports
          </h1>
          <span className="text-sm text-slate-400">
            {range
              ? `· ${fmtRange(range.start, range.end)}`
              : "· no data yet"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={building}
            onChange={setBuilding}
            options={[{ value: "all", label: "All buildings" }, ...buildings.map((b) => ({ value: b, label: b }))]}
          />
          <Select
            value={category}
            onChange={setCategory}
            options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
          <button
            onClick={exportCsv}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800"
          >
            Export
          </button>
        </div>
      </header>

      <StatsBar rows={filtered} loading={loading} />

      {cluster && <ClusterAlert cluster={cluster} />}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CategoryChart rows={filtered} />
        <BuildingBreakdown rows={filtered} />
      </section>

      <MonthlyChart rows={filtered} />

      <section className="bg-white border border-slate-200 rounded-lg">
        <ResponsesTable rows={filtered} loading={loading} />
      </section>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}
    </main>
  );
}

function fmtRange(start: Date, end: Date): string {
  const opt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const y = end.getFullYear();
  return `${start.toLocaleDateString(undefined, opt)} – ${end.toLocaleDateString(undefined, opt)}, ${y}`;
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-slate-300 bg-white rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[10rem]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
