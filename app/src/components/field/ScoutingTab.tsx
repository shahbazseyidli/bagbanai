"use client";

// Scouting notes, and their pins on the field map (6.5).
//
// The map is NOT in this file. FieldMapCard is mounted by the field page, above the section nav,
// so that it survives a section change; this tab reaches it through the `map` bridge the page
// hands down (scouting/useScoutMap.ts). Building a second MapLibre map here would put two WebGL
// contexts on a phone to show one field.
//
// The add-form is kept as it was, deliberately: it carries the offline outbox path (T12), which is
// the one write in this section that works with no signal, and rewriting it would have been the
// largest and least necessary part of this change.
import { useEffect, useRef, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { api, apiAsset, azError } from "@/lib/api";
import { t, tf, type I18nKey } from "@/lib/i18n";
import { ErrorNote, Field as FormField, Placeholder } from "@/components/ui";
import PhotoInput from "@/components/field/PhotoInput";
import PinPicker from "@/components/field/scouting/PinPicker";
import ScoutNoteSheet from "@/components/field/scouting/ScoutNoteSheet";
import ScoutPlacementBar from "@/components/field/scouting/ScoutPlacementBar";
import { DEFAULT_PIN_COLOR, isResolved, pinHex, toMapPins } from "@/components/field/scouting/pins";
import type { ScoutMap } from "@/components/field/scouting/useScoutMap";
import { queueScouting, flushQueue } from "@/lib/offlineQueue";
import type { Scouting } from "@/lib/types";

const CATEGORIES = ["pest", "disease", "weed", "nutrient", "water", "damage", "other"] as const;

function catLabel(c: string): string {
  return t(`scout.cat.${c}` as I18nKey);
}

export default function ScoutingTab({ fieldId, map }: { fieldId: string; map?: ScoutMap }) {
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
  // ONE flag for the list and the map. Two independent filters would let the two surfaces disagree
  // about what is on screen, and nothing tells the farmer which of them is lying.
  const [showResolved, setShowResolved] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const hasMap = !!map?.present;
  const placing = !!map?.placing;

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

  // --- the map bridge ---------------------------------------------------------
  // Held through refs so the unmount cleanup below can reach the setters without listing the whole
  // bridge as a dependency (which would re-run it on every centre report while placing).
  const bridgeRef = useRef<ScoutMap | undefined>(map);
  bridgeRef.current = map;

  useEffect(() => {
    bridgeRef.current?.setPins(toMapPins(items, showResolved));
  }, [items, showResolved]);

  // Leaving the section must take the pins and the placement mode with it: the card stays mounted
  // across a section change, so anything left behind would be drawn over "Gübrə" or "Tapşırıqlar".
  useEffect(() => {
    return () => {
      bridgeRef.current?.setPins([]);
      bridgeRef.current?.setPlacing(false);
    };
  }, []);

  // A pin tap opens that note. `seq` is in the dependency list so a second tap on the SAME pin,
  // after the panel was closed, opens it again.
  const tappedId = map?.tapped?.id;
  const tappedSeq = map?.tapped?.seq;
  useEffect(() => {
    if (!tappedId) return;
    setSelectedId(tappedId);
    bridgeRef.current?.clearTapped();
  }, [tappedId, tappedSeq]);

  function showOnMap(lon: number, lat: number) {
    bridgeRef.current?.focus(lon, lat);
  }

  function startPlacing() {
    setGeoErr("");
    bridgeRef.current?.setPlacing(true);
    // The reticle is on the card at the TOP of the page; this button is a screen and a half below
    // it. Without this the farmer taps "place on map" and nothing visible happens. Same pattern the
    // camera FAB already uses to reach #photo-diagnose.
    document.getElementById("field-map-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function confirmPlacement() {
    const c = bridgeRef.current?.center;
    if (c) setCoords({ lat: c.lat, lon: c.lng });
    bridgeRef.current?.setPlacing(false);
  }

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
  const pinned = toMapPins(items, showResolved).length;
  const selected = selectedId ? items.find((s) => s.id === selectedId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* Placement bar first, because it belongs to the map directly above it. */}
      {hasMap && placing && (
        <ScoutPlacementBar
          center={map?.center ?? null}
          onConfirm={confirmPlacement}
          onCancel={() => bridgeRef.current?.setPlacing(false)}
        />
      )}

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
          onShowOnMap={hasMap ? showOnMap : undefined}
        />
      )}

      {hasMap && (
        <p className="text-xs text-slate-500">
          {pinned > 0 ? t("app.field.scouting.legend") : t("app.field.scouting.mapEmpty")}
        </p>
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
            {/* Two ways to put a note on the ground, and they are not redundant: geolocation is the
                one-tap path for a farmer standing on the spot, the reticle is for the note written
                back at the house about a corner they walked past this morning. */}
            <button type="button" className="btn-secondary w-full" onClick={useGeolocation}>
              <MapPin className="h-4 w-4" /> {t("scout.geo")}
            </button>
            {hasMap && (
              <button
                type="button"
                className="btn-secondary mt-2 w-full"
                onClick={startPlacing}
                disabled={placing}
              >
                <MapPin className="h-4 w-4" />{" "}
                {coords ? t("app.field.scouting.placeChange") : t("app.field.scouting.place")}
              </button>
            )}
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
                          irrigation blue has to be able to read that back without the map. */}
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
                      {hasMap && s.lat != null && s.lon != null && (
                        <button
                          type="button"
                          onClick={() => showOnMap(s.lon as number, s.lat as number)}
                          className="min-h-9 text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          {t("app.field.scouting.showOnMap")}
                        </button>
                      )}
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
