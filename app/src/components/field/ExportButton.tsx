"use client";

// Download this field's boundary as GeoJSON or KML.
//
// WHY THIS EXISTS AT ALL: the serializers (lib/geoio.ts polygonToGeoJSON / polygonToKML /
// downloadText) have been written, correct and unreachable for months — their only caller was
// FieldCreator.tsx, which nothing imports any more. Meanwhile /account showed a "Download data"
// card whose control was a bare <span> with no handler, and the privacy policy told users in all
// eight languages that boundaries can be downloaded. The capability existed; the button did not.
//
// FREE, on the owner's decision and the research document's argument: this is the farmer's own
// boundary, traced by them. Charging for the export of your own data is the thing that made a
// competitor's users paste screenshots into GIS software for eight years.
//
// Client-side: the geometry is already in the page (GET /api/fields/{id} returns geom), so a
// backend route would re-serve what the browser holds. Shapefile WRITE is deliberately not here —
// shpjs is read-only and authoring one needs a real dependency; GeoJSON and KML open in QGIS,
// Google Earth and every cadastral tool the farmer is likely to be handed.
import { useState } from "react";
import { Download } from "lucide-react";
import { downloadText, polygonToGeoJSON, polygonToKML } from "@/lib/geoio";
import { t } from "@/lib/i18n";
import type { Polygon } from "@/lib/types";

export default function ExportButton({
  name,
  geom,
}: {
  name: string;
  geom?: Polygon | null;
}) {
  const [open, setOpen] = useState(false);
  if (!geom) return null; // nothing to export — never render a button that cannot work

  // A filename the farmer can find again. Keeps their own letters (ə, ğ, ı, ş) — the download
  // attribute carries UTF-8 fine — and only strips what a filesystem actually rejects.
  const safe = (name || "field").replace(/[/\\?%*:|"<>]/g, "").trim() || "field";

  function save(kind: "geojson" | "kml") {
    if (!geom) return;
    if (kind === "geojson") {
      downloadText(`${safe}.geojson`, polygonToGeoJSON(geom, name), "application/geo+json");
    } else {
      downloadText(
        `${safe}.kml`,
        polygonToKML(geom, name),
        "application/vnd.google-earth.kml+xml",
      );
    }
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[var(--tap)] items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t("app.field.export.button")}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button type="button" onClick={() => save("geojson")}
        className="min-h-[var(--tap)] rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">
        GeoJSON
      </button>
      <button type="button" onClick={() => save("kml")}
        className="min-h-[var(--tap)] rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">
        KML
      </button>
      <button type="button" onClick={() => setOpen(false)}
        className="min-h-[var(--tap)] px-2 text-sm text-slate-500 hover:text-slate-700">
        {t("app.field.shareButton.close")}
      </button>
    </span>
  );
}
