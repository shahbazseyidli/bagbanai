"use client";

// Scouting notes — two blocks: write a note, and read the notes already written.
//
// THE MAP IS GONE (owner decision, 2026-08-04). What went with it: the pin layer on FieldMapCard,
// the "pick the spot on the map" reticle and its placement bar, the "show on the map" jump from a
// note, and the bridge hook that carried all three up to the field page.
//
// THE PIN DATA DID NOT GO. Migration 0054's scouting_observations.lat/lon columns, every coordinate
// already stored and the colour on each row are untouched: the list still prints a note's
// coordinates and still draws its colour dot, and a NEW note can still carry a coordinate — the
// geolocation button below is not a map, it is one tap for a farmer standing on the spot. Editing a
// note through ScoutNoteSheet leaves lat/lon alone as it always did; nothing here ever clears them.
//
// The add-form is kept as it was, deliberately: it carries the offline outbox path (T12), which is
// the one write in this section that works with no signal.
import { useEffect, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { api, apiAsset, azError } from "@/lib/api";
import { t, tf, type I18nKey } from "@/lib/i18n";
import { ErrorNote, Field as FormField, Placeholder } from "@/components/ui";
import PhotoInput from "@/components/field/PhotoInput";
import PinPicker from "@/components/field/scouting/PinPicker";
import ScoutNoteSheet from "@/components/field/scouting/ScoutNoteSheet";
import { DEFAULT_PIN_COLOR, isResolved, pinHex } from "@/components/field/scouting/pins";
import { queueScouting, flushQueue } from "@/lib/offlineQueue";
import type { Scouting } from "@/lib/types";

const CATEGORIES = ["pest", "disease", "weed", "nutrient", "water", "damage", "other"] as const;

function catLabel(c: string): string {
  return t(`scout.cat.${c}` as I18nKey);
}

export default function ScoutingTab({ fieldId }: { fieldId: string }) {
  const [items, setItems] = useState<Scouting[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  const [category, setCategory] = useState<string>("pest");
  const [severity, setSeverity] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_PIN_COLOR);
  const [file, setFile] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoErr, setGeoErr] = useState("");
  const [offlineMsg, setOfflineMsg] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await api.get<Scouting[]>(`/api/scouting?field_id=${fieldId}`));
    } catch (err) {
      setError(azError(err));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  // Flush any offline-queued scouting notes on mount + whenever connectivity returns (T12).
  useEffect(() => {
    const flush = () =>
      flushQueue((fid, body) =>
        api.post("/api/scouting", { field_id: fid, ...body }).then(() => undefined),
      ).then((n) => { if (n > 0) void load(); });
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  // --- the add form -----------------------------------------------------------

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

  function resetForm() {
    setSeverity("");
    setNote("");
    setFile(null);
    setCoords(null);
    setColor(DEFAULT_PIN_COLOR);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOfflineMsg("");
    const body = {
      category,
      severity: severity ? Number(severity) : undefined,
      note: note || undefined,
      color,
      lat: coords?.lat,
      lon: coords?.lon,
    };
    // Offline: queue the (text) note now; it syncs automatically on reconnect (photos need a
    // live upload, so they're skipped offline).
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queueScouting({ fieldId, body, ts: Date.now() });
      setOfflineMsg(t("app.field.scoutingTab.offlineSaved"));
      resetForm();
      return;
    }
    setBusy(true);
    try {
      let photos: string[] = [];
      if (file) {
        const up = await api.upload<{ path: string }>("/api/uploads", file);
        photos = [up.path];
      }
      await api.post("/api/scouting", { field_id: fieldId, ...body, photos });
      resetForm();
      await load();
    } catch (err) {
      // A network drop mid-submit → fall back to the offline queue.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        queueScouting({ fieldId, body, ts: Date.now() });
        setOfflineMsg(t("app.field.scoutingTab.offlineQueued"));
        resetForm();
      } else {
        setError(azError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  const openCount = items.filter((s) => !isResolved(s)).length;
  const visible = showResolved ? items : items.filter((s) => !isResolved(s));
  const selected = selectedId ? items.find((s) => s.id === selectedId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* `selected` is derived from `items`, never copied out of it: a deleted note disappears from
          the list on the next load and takes the panel with it, and an edited one re-renders with
          the saved values — neither needs a second code path here. */}
      {selected && (
        <ScoutNoteSheet
          note={selected}
          onClose={() => setSelectedId(null)}
          onChanged={(message) => {
            setFlash(message);
            void load();
          }}
        />
      )}

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
        <FormField label={t("app.field.scouting.color")}>
          <PinPicker value={color} onChange={setColor} />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("scout.photo")}>
            <PhotoInput onPick={setFile} fileName={file?.name ?? null} />
          </FormField>
          <div>
            <label className="label">&nbsp;</label>
            {/* The one remaining way to put a note on the ground, and the one that never needed a
                map: the farmer is standing on the spot. */}
            <button type="button" className="btn-secondary w-full" onClick={useGeolocation}>
              <MapPin className="h-4 w-4" /> {t("scout.geo")}
            </button>
            {coords && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-xs tabular-nums text-slate-500">
                  {tf("app.field.scouting.coords", {
                    lat: coords.lat.toFixed(5),
                    lon: coords.lon.toFixed(5),
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => setCoords(null)}
                  className="min-h-9 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  {/* placeClear ("Remove the spot") survives the map removal — it clears the
                      coordinate the geolocation button captured, which is still a real action. */}
                  {t("app.field.scouting.placeClear")}
                </button>
              </div>
            )}
            {geoErr && <p className="mt-1 text-xs text-red-600">{geoErr}</p>}
          </div>
        </div>
        <ErrorNote message={error} />
        {offlineMsg && (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">{offlineMsg}</p>
        )}
        <button className="btn-primary" type="submit" disabled={busy}>
          <Plus className="h-4 w-4" /> {busy ? t("common.saving") : t("common.add")}
        </button>
      </form>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-800">{t("scout.title")}</h3>
          <span className="text-xs tabular-nums text-slate-500">
            {tf("app.field.scouting.counts", { open: openCount, total: items.length })}
          </span>
        </div>
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="h-4 w-4"
          />
          {t("app.field.scouting.showResolved")}
        </label>

        {flash && (
          <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {flash}
          </p>
        )}

        {visible.length === 0 ? (
          <Placeholder>{t("scout.empty")}</Placeholder>
        ) : (
          <ul className="space-y-2">
            {visible.map((s) => {
              const resolved = isResolved(s);
              return (
                <li key={s.id} className={`card flex items-start justify-between gap-3 ${resolved ? "opacity-60" : ""}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* The dot is the list's half of the colour code: a farmer who paints
                          irrigation blue has to be able to read that back — and with the map gone,
                          this is now the ONLY place the colour is visible. */}
                      <span
                        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/15"
                        style={{ background: pinHex(s.color) }}
                        aria-hidden="true"
                      />
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {catLabel(s.category)}
                      </span>
                      {s.severity != null && <span className="text-xs text-slate-500">⚠ {s.severity}/5</span>}
                      <span className="text-xs text-slate-500">
                        {resolved ? t("app.field.scouting.resolved") : t("app.field.scouting.open")}
                      </span>
                    </div>
                    {s.note && <p className="mt-1 text-sm text-slate-700">{s.note}</p>}
                    {s.lat != null && s.lon != null && (
                      <p className="mt-1 text-xs tabular-nums text-slate-400">
                        {tf("app.field.scouting.coords", {
                          lat: s.lat.toFixed(5),
                          lon: s.lon.toFixed(5),
                        })}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className="min-h-9 text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        {t("app.field.scouting.edit")}
                      </button>
                    </div>
                  </div>
                  {s.photos && s.photos.length > 0 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={apiAsset(s.photos[0])}
                      alt="scouting"
                      className="h-16 w-16 shrink-0 rounded object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
