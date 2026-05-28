"use client";

import { useMemo, useState } from "react";
import { ISSUE_TYPE_COLUMNS, type SifiResponse } from "@/lib/types";

type SortKey = "recorded_date" | "location" | "site" | "sentiment";

export function ResponsesTable({
  rows,
  loading,
}: {
  rows: SifiResponse[];
  loading: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("recorded_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = (a[sortKey] ?? "") as string;
      const bv = (b[sortKey] ?? "") as string;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  const arrow = (k: SortKey) =>
    sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="overflow-auto max-h-[640px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-left">
          <tr>
            <Th onClick={() => toggleSort("recorded_date")}>
              Recorded{arrow("recorded_date")}
            </Th>
            <Th onClick={() => toggleSort("location")}>
              Location{arrow("location")}
            </Th>
            <Th onClick={() => toggleSort("site")}>Site{arrow("site")}</Th>
            <Th>Building / Room</Th>
            <Th>Issue types</Th>
            <Th>Description</Th>
            <Th onClick={() => toggleSort("sentiment")}>
              Sentiment{arrow("sentiment")}
            </Th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-slate-500">
                Loading…
              </td>
            </tr>
          )}
          {!loading && sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-slate-500">
                No responses match the current filters.
              </td>
            </tr>
          )}
          {sorted.map((r) => (
            <tr
              key={r.response_id}
              className="border-b border-slate-100 hover:bg-slate-50/60"
            >
              <td className="p-2 whitespace-nowrap text-slate-600">
                {r.recorded_date
                  ? new Date(r.recorded_date).toLocaleString(undefined, {
                      year: "2-digit",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—"}
              </td>
              <td className="p-2 font-medium">{r.location}</td>
              <td className="p-2">{r.site ?? "—"}</td>
              <td className="p-2">
                {[r.building, r.room_number].filter(Boolean).join(" / ") || "—"}
              </td>
              <td className="p-2">
                <div className="flex flex-wrap gap-1">
                  {ISSUE_TYPE_COLUMNS.filter((c) => {
                    const v = r[c.key];
                    return typeof v === "string" && v.trim().length > 0;
                  }).map((c) => (
                    <span
                      key={c.key as string}
                      className="rounded bg-brand-50 text-brand-700 px-1.5 py-0.5 text-xs"
                    >
                      {c.label}
                    </span>
                  ))}
                </div>
              </td>
              <td className="p-2 max-w-md">
                <div className="truncate" title={r.issue_description ?? r.description ?? ""}>
                  {r.issue_description ?? r.description ?? "—"}
                </div>
              </td>
              <td className="p-2 whitespace-nowrap">
                <SentimentChip s={r.sentiment} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className={`p-2 font-medium text-slate-600 ${
        onClick ? "cursor-pointer select-none hover:text-slate-900" : ""
      }`}
    >
      {children}
    </th>
  );
}

function SentimentChip({ s }: { s: string | null }) {
  if (!s) return <span className="text-slate-400">—</span>;
  const v = s.toLowerCase();
  const cls = v.includes("neg")
    ? "bg-red-100 text-red-700"
    : v.includes("pos")
      ? "bg-green-100 text-green-700"
      : v.includes("mix")
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-700";
  return <span className={`rounded px-1.5 py-0.5 text-xs ${cls}`}>{s}</span>;
}
