"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { api, apiAsset } from "@/lib/api";
import { t, type I18nKey } from "@/lib/i18n";
import { ErrorNote, Field as FormField, Placeholder } from "@/components/ui";
import type { Scouting } from "@/lib/types";

const CATEGORIES = ["pest", "disease", "weed", "nutrient", "water", "damage", "other"] as const;

function catLabel(c: string): string {
  return t(`scout.cat.${c}` as I18nKey);
}

export default function ScoutingTab({ fieldId }: { fieldId: string }) {
  const [items, setItems] = useState<Scouting[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [category, setCategory] = useState<string>("pest");
  const [severity, setSeverity] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoErr, setGeoErr] = useState("");

  async function load() {
    try {
      setItems(await api.get<Scouting[]>(`/api/scouting?field_id=${fieldId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  function useGeolocation() {
    setGeoErr("");
    if (!navigator.geolocation) {
      setGeoErr(t("scout.geoErr"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeoErr(t("scout.geoErr")),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let photos: string[] = [];
      if (file) {
        const up = await api.upload<{ path: string }>("/api/uploads", file);
        photos = [up.path];
      }
      await api.post("/api/scouting", {
        field_id: fieldId,
        category,
        severity: severity ? Number(severity) : undefined,
        note: note || undefined,
        lat: coords?.lat,
        lon: coords?.lon,
        photos,
      });
      setSeverity("");
      setNote("");
      setFile(null);
      setCoords(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card space-y-3">
        <h3 className="font-semibold text-slate-800">{t("scout.add")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("scout.category")}>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {catLabel(c)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("scout.severity")}>
            <input className="input" type="number" min={1} max={5} value={severity} onChange={(e) => setSeverity(e.target.value)} />
          </FormField>
        </div>
        <FormField label={t("scout.note")}>
          <textarea className="input h-20" value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("scout.photo")}>
            <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </FormField>
          <div>
            <label className="label">&nbsp;</label>
            <button type="button" className="btn-secondary w-full" onClick={useGeolocation}>
              <MapPin className="h-4 w-4" /> {t("scout.geo")}
            </button>
            {coords && (
              <p className="mt-1 text-xs text-slate-500">
                {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
              </p>
            )}
            {geoErr && <p className="mt-1 text-xs text-red-600">{geoErr}</p>}
          </div>
        </div>
        <ErrorNote message={error} />
        <button className="btn-primary" type="submit" disabled={busy}>
          <Plus className="h-4 w-4" /> {busy ? t("common.saving") : t("common.add")}
        </button>
      </form>

      <div>
        <h3 className="mb-3 font-semibold text-slate-800">{t("scout.title")}</h3>
        {items.length === 0 ? (
          <Placeholder>{t("scout.empty")}</Placeholder>
        ) : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li key={s.id} className="card flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {catLabel(s.category)}
                    </span>
                    {s.severity != null && <span className="text-xs text-slate-500">⚠ {s.severity}/5</span>}
                  </div>
                  {s.note && <p className="mt-1 text-sm text-slate-700">{s.note}</p>}
                  {s.lat != null && s.lon != null && (
                    <p className="mt-1 text-xs text-slate-400">
                      {s.lat.toFixed(5)}, {s.lon.toFixed(5)}
                    </p>
                  )}
                </div>
                {s.photos && s.photos.length > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={apiAsset(s.photos[0])}
                    alt="scouting"
                    className="h-16 w-16 rounded object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
