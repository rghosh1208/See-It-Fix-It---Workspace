"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { IssueBreakdown } from "./IssueBreakdown";
import { ResponsesTable } from "./ResponsesTable";
import { StatsBar } from "./StatsBar";
import type { SifiResponse } from "@/lib/types";

// Leaflet must be client-only — it touches `window` on import.
const IssueMap = dynamic(() => import("./IssueMap").then((m) => m.IssueMap), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] grid place-items-center text-sm text-slate-500">
      Loading map…
    </div>
  ),
});

const ISSUE_TYPES: { value: string; label: string }[] = [
  { value: "all", label: "All issue types" },
  { value: "toilet", label: "Toilet" },
  { value: "trash", label: "Trash" },
  { value: "restroom_supplies", label: "Restroom Supplies" },
  { value: "sink", label: "Sink" },
  { value: "lights", label: "Lights" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "broken_dispenser", label: "Broken Dispenser" },
  { value: "pest", label: "Pest" },
  { value: "ceiling_tile", label: "Ceiling Tile" },
  { value: "door", label: "Door" },
];

export function Dashboard() {
  const [rows, setRows] = useState<SifiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [site, setSite] = useState("all");
  const [issueType, setIssueType] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (site !== "all") params.set("site", site);
    if (issueType !== "all") params.set("issueType", issueType);
    if (search) params.set("search", search);

    setLoading(true);
    setError(null);
    fetch(`/api/responses?${params.toString()}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setRows(json.rows ?? []))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message ?? String(e));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [site, issueType, search]);

  const sites = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.site) set.add(r.site);
    return Array.from(set).sort();
  }, [rows]);

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            SEE IT FIX IT — Live Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Qualtrics responses, synced every 15 min · location ≠ null
          </p>
        </div>
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          onClick={() => {
            // Re-trigger the effect by toggling a no-op search round-trip
            setSearch((s) => s);
            // Force refetch even if filters didn't change
            const params = new URLSearchParams();
            if (site !== "all") params.set("site", site);
            if (issueType !== "all") params.set("issueType", issueType);
            if (search) params.set("search", search);
            setLoading(true);
            fetch(`/api/responses?${params.toString()}`)
              .then((r) => r.json())
              .then((j) => setRows(j.rows ?? []))
              .finally(() => setLoading(false));
          }}
        >
          Refresh
        </button>
      </header>

      <StatsBar rows={rows} loading={loading} />

      <section className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-lg p-3">
        <label className="text-sm">
          <span className="text-slate-500 mr-2">Site</span>
          <select
            className="border border-slate-300 rounded px-2 py-1 text-sm"
            value={site}
            onChange={(e) => setSite(e.target.value)}
          >
            <option value="all">All sites</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500 mr-2">Issue type</span>
          <select
            className="border border-slate-300 rounded px-2 py-1 text-sm"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
          >
            {ISSUE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex-1 min-w-[12rem]">
          <span className="text-slate-500 mr-2">Search</span>
          <input
            className="border border-slate-300 rounded px-2 py-1 text-sm w-full max-w-md"
            placeholder="location, description, issue text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {error && (
          <span className="text-sm text-red-600 ml-auto">{error}</span>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="font-medium mb-3">Issues by location</h2>
          <IssueMap rows={rows} />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="font-medium mb-3">Issue type breakdown</h2>
          <IssueBreakdown rows={rows} />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg">
        <ResponsesTable rows={rows} loading={loading} />
      </section>
    </main>
  );
}
