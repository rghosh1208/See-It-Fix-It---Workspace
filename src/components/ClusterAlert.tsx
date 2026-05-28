"use client";

type Cluster = {
  room: string;
  building: string;
  count: number;
  windowMinutes: number;
  startedAt: string;
};

export function ClusterAlert({ cluster }: { cluster: Cluster }) {
  const date = new Date(cluster.startedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-amber-600 text-base">⚠</span>
        <span className="text-slate-700">
          Room{" "}
          <span className="bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 font-mono text-xs">
            {cluster.room}
          </span>{" "}
          ·{" "}
          <strong className="font-semibold text-slate-900">
            {cluster.count} reports in {cluster.windowMinutes} min
          </strong>{" "}
          on {date} · likely single trigger
        </span>
      </div>
      <button className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        View room
      </button>
    </div>
  );
}
