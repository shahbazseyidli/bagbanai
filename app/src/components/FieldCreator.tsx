"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { DrawMap } from "@/components/FieldMap";
import { ErrorNote, Field as FormField } from "@/components/ui";
import { parseCoordinates, polygonFromRing, validatePolygon } from "@/lib/geo";
import type { Field, Polygon } from "@/lib/types";

interface Props {
  farmId: string;
  onCreated: (field: Field) => void;
}

type Mode = "draw" | "coords";

export default function FieldCreator({ farmId, onCreated }: Props) {
  const [mode, setMode] = useState<Mode>("draw");
  const [name, setName] = useState("");
  const [drawnPolygon, setDrawnPolygon] = useState<Polygon | null>(null);
  const [coordsText, setCoordsText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The active polygon depends on the mode.
  const polygon: Polygon | null = useMemo(() => {
    if (mode === "draw") return drawnPolygon;
    try {
      const ring = parseCoordinates(coordsText);
      return polygonFromRing(ring);
    } catch {
      return null;
    }
  }, [mode, drawnPolygon, coordsText]);

  const validation = useMemo(() => validatePolygon(polygon), [polygon]);
  const areaHa = validation.ok ? validation.areaHa ?? 0 : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Parse errors specific to coordinate mode.
    if (mode === "coords") {
      try {
        parseCoordinates(coordsText);
      } catch (err) {
        setError((err as Error).message === "min" ? t("field.err.minVertices") : t("field.err.parse"));
        return;
      }
    }

    if (!polygon) {
      setError(t("field.err.noPolygon"));
      return;
    }
    const v = validatePolygon(polygon);
    if (!v.ok) {
      setError(v.errorKey ? t(v.errorKey) : t("common.error"));
      return;
    }

    setBusy(true);
    try {
      const field = await api.post<Field>("/api/fields", {
        farm_id: farmId,
        name,
        geometry: polygon,
      });
      onCreated(field);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField label={t("field.name")} required>
        <input
          className="input"
          value={name}
          required
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>

      <div className="flex gap-2">
        <button
          type="button"
          className={mode === "draw" ? "btn-primary" : "btn-secondary"}
          onClick={() => setMode("draw")}
        >
          {t("field.mode.draw")}
        </button>
        <button
          type="button"
          className={mode === "coords" ? "btn-primary" : "btn-secondary"}
          onClick={() => setMode("coords")}
        >
          {t("field.mode.coords")}
        </button>
      </div>

      {mode === "draw" ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">{t("field.drawHint")}</p>
          <DrawMap onPolygon={setDrawnPolygon} />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">{t("field.coordsHint")}</p>
          <textarea
            className="input h-40 font-mono"
            placeholder={"47.50,40.30\n47.52,40.30\n47.52,40.32"}
            value={coordsText}
            onChange={(e) => setCoordsText(e.target.value)}
          />
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2 text-sm">
        <span className="text-slate-600">{t("field.area")}</span>
        <span className="font-semibold text-emerald-700">
          {areaHa !== null ? `${areaHa.toFixed(3)} ${t("field.ha")}` : "—"}
        </span>
      </div>

      <ErrorNote message={error} />

      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? t("common.saving") : t("common.save")}
      </button>
    </form>
  );
}
