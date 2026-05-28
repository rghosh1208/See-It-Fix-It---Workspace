"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import type { LatLngBounds } from "leaflet";
import type { SifiResponse } from "@/lib/types";

// Inject Leaflet CSS once
function useLeafletCss() {
  useEffect(() => {
    if (document.getElementById("leaflet-css")) return;
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity =
      "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);
  }, []);
}

function FitBounds({ rows }: { rows: SifiResponse[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = rows
      .filter(
        (r) => r.location_latitude != null && r.location_longitude != null,
      )
      .map((r) => [r.location_latitude!, r.location_longitude!] as [number, number]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 12);
      return;
    }
    import("leaflet").then((L) => {
      const bounds = L.latLngBounds(pts) as LatLngBounds;
      map.fitBounds(bounds.pad(0.2));
    });
  }, [rows, map]);
  return null;
}

export function IssueMap({ rows }: { rows: SifiResponse[] }) {
  useLeafletCss();

  const withCoords = rows.filter(
    (r) => r.location_latitude != null && r.location_longitude != null,
  );

  if (withCoords.length === 0) {
    return (
      <div className="h-[420px] grid place-items-center text-sm text-slate-500 border border-dashed border-slate-300 rounded">
        No responses have GPS coordinates yet.
      </div>
    );
  }

  return (
    <div className="h-[420px] w-full overflow-hidden rounded">
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds rows={withCoords} />
        {withCoords.map((r) => (
          <CircleMarker
            key={r.response_id}
            center={[r.location_latitude!, r.location_longitude!]}
            radius={7}
            pathOptions={{
              color: sentimentColor(r.sentiment),
              fillColor: sentimentColor(r.sentiment),
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1 max-w-xs">
                <div className="font-medium">{r.location}</div>
                {r.site && (
                  <div>
                    <span className="text-slate-500">Site:</span> {r.site}
                  </div>
                )}
                {r.building && (
                  <div>
                    <span className="text-slate-500">Building:</span>{" "}
                    {r.building}
                  </div>
                )}
                {r.issue_description && (
                  <div className="mt-1">{r.issue_description}</div>
                )}
                {r.sentiment && (
                  <div className="mt-1 text-slate-500">
                    Sentiment: {r.sentiment}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

function sentimentColor(s: string | null): string {
  if (!s) return "#64748b";
  const v = s.toLowerCase();
  if (v.includes("neg")) return "#dc2626";
  if (v.includes("pos")) return "#16a34a";
  if (v.includes("mix")) return "#ca8a04";
  return "#3b6fb6";
}
