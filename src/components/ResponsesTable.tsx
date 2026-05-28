"use client";

import { useMemo, useState } from "react";
import type { SifiResponse } from "@/lib/types";
import { buildingOf, categorize, roomOf } from "@/lib/derive";

type SortKey = "recorded_date" | "location" | "_building" | "_category";

export function ResponsesTable({
  rows,
  loading,
}: {
  rows: SifiResponse[];
  loading: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("recorded_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  const sorted = useMemo(() => {
    const copy = [...enriched];
    copy.sort((a, b) => {
      const av = ((a as Record<string, unknown>)[sortKey] ?? "") as string;
      const bv = ((b as Record<string, unknown>)[sortKey] ?? "") as string;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [enriched, sortKey, sortDir]);

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
            <Th onClick={() => toggleSort("_building")}>
              Building{arrow("_building")}
            </Th>
            <Th>Room</Th>
            <Th onClick={() => toggleSort("_category")}>
              Category{arrow("_category")}
            </Th>
            <Th>Description</Th>
            <Th>Contact</Th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-slate-500">
                Loading…
              </td>
            </tr>
          )}
          {!loading && sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-slate-500">
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
              <td className="p-2 font-medium">{r._building}</td>
              <td className="p-2">
                {r._room ? (
                  <span className="font-mono text-xs bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                    {r._room}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="p-2">
                <span className="rounded bg-brand-50 text-brand-700 px-1.5 py-0.5 text-xs">
                  {r._category}
                </span>
              </td>
              <td className="p-2 max-w-md">
                <div className="truncate" title={r.issue_description ?? ""}>
                  {r.issue_description ?? "—"}
                </div>
              </td>
              <td className="p-2 text-xs text-slate-600 whitespace-nowrap">
                {r.contact_email ?? r.recipient_email ?? "—"}
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
