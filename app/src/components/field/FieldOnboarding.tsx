"use client";

// FieldOnboarding — a click-first, 4-step wizard that replaces the single-screen
// FieldCreator. Step 1 draws/imports the boundary and kicks off a best-effort
// terrain + reverse-geocode lookup; steps 2–3 collect "Sahə haqqında məlumat"
// with almost no typing; step 4 confirms and submits (POST field → PUT metadata).

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, MapPin, Mountain, Compass, TriangleRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { t, tf } from "@/lib/i18n";
import { formatArea, useAreaUnit } from "@/lib/units";
import { DrawMap } from "@/components/FieldMap";
import UpgradeCta from "@/components/UpgradeCta";
import { ErrorNote, Field as FormField } from "@/components/ui";
import { parseCoordinates, polygonFromRing, validatePolygon } from "@/lib/geo";
import { parseGeoImport, parseShapefile } from "@/lib/geoio";
import { track } from "@/lib/track";
import type { Field, FieldMetadata, GeoSite, Polygon } from "@/lib/types";
import {
  type Opt,
  optLabel,
  CROP_OPTIONS,
  CROP_CYCLE,
  SOIL_TYPE_OPTIONS,
  IRRIGATION_METHOD_OPTIONS,
  GROWTH_STAGE_OPTIONS,
  TILLAGE_OPTIONS,
} from "@/lib/metadataOptions";
import { useFieldInfo } from "./info/useFieldInfo";
import CycleCards from "./info/CycleCards";
import CropGrid from "./info/CropGrid";
import VarietyChips from "./info/VarietyChips";
import ChoiceChips from "./info/ChoiceChips";
import ClickDate from "./info/ClickDate";
import PhPicker from "./info/PhPicker";
import NumberSlider from "./info/NumberSlider";
import AutoField from "./info/AutoField";
import { COUNTRY_CODES, AZ_COUNTRY_CODE, AZ_RAYONS } from "@/lib/regions";
import { countryName } from "@/lib/onboardingQuiz";
import { getLocale } from "@/lib/i18n";
import { META_GAPS, topMetaGaps, type GapKey } from "./overview/completeness";
import YesNo from "./info/YesNo";
import { arrayDefs, RepeatableRows, type Row, fromRows } from "./repeatableRows";

interface Props {
  farmId: string;
  onCreated: (field: Field) => void;
}

type Mode = "draw" | "coords";

/** Coerce a stored numeric-or-string metadata value into a number|null. */
function toNum(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Map a canonical value to its Azerbaijani label (falls back to the raw value). */
function labelOf(options: Opt[], value: string | null | undefined): string {
  if (!value) return "—";
  const o = options.find((op) => op.value === value);
  return o ? optLabel(o) : value;
}

/** Average of the boundary ring vertices — good enough for a point lookup. */
function centroidOf(poly: Polygon): { lat: number; lon: number } {
  const ring = poly.coordinates[0] ?? [];
  const closed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const pts = closed ? ring.slice(0, -1) : ring;
  let sx = 0;
  let sy = 0;
  for (const [lon, lat] of pts) {
    sx += lon;
    sy += lat;
  }
  const n = pts.length || 1;
  return { lon: sx / n, lat: sy / n };
}

export default function FieldOnboarding({ farmId, onCreated }: Props) {
  const STEP_TITLES = [
    t("app.field.fieldOnboarding.step1Title"),
    t("app.field.fieldOnboarding.step2Title"),
    t("app.field.fieldOnboarding.step3Title"),
    t("app.field.fieldOnboarding.step4Title"),
  ];
  const [step, setStep] = useState(1);

  // --- Step 1: boundary ---
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("draw");
  const [drawnPolygon, setDrawnPolygon] = useState<Polygon | null>(null);
  const [coordsText, setCoordsText] = useState("");
  // P1.2 — the drawn/detected area is shown in the farmer's own unit; the POSTed value stays ha.
  const areaUnit = useAreaUnit();
  const [importedPolygon, setImportedPolygon] = useState<Polygon | null>(null);
  const [importSeq, setImportSeq] = useState(0);
  const [detect, setDetect] = useState(false);       // C3 tap-to-detect mode
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState("");
  const [brush, setBrush] = useState(false);         // freehand brush/lasso mode
  // Which country's vocabulary the region field should offer. LOCAL state on purpose:
  // field_metadata has no country column, so the old disabled <select value="AZ"> was never
  // stored — it was decoration that happened to also be a wall. What actually gets saved is
  // `region`, and this only decides whether that is a rayon dropdown or free text.
  const [country, setCountry] = useState<string>(AZ_COUNTRY_CODE);

  // D3.1 — if the visitor drew a field on the public landing map before signing up, prefill it here
  // so onboarding starts from their real boundary instead of a blank map.
  //
  // localStorage is checked FIRST but is only ever a hit in single-origin local dev. In production
  // the landing is agradex.com and this wizard is app.agradex.com, so the key written over there is
  // invisible here — which is why this prefill silently never fired for a real user. The server
  // copy (users.onboarding.draft_field, carried by carryQuiz at sign-in) is the one that works.
  useEffect(() => {
    let active = true;
    const apply = (polygon: Polygon) => {
      if (!active) return;
      setMode("draw");
      setDrawnPolygon(polygon);
      setImportedPolygon(polygon);
      setImportSeq((s) => s + 1);
    };
    try {
      const raw = localStorage.getItem("bagban_draft_field");
      if (raw) {
        localStorage.removeItem("bagban_draft_field");
        const draft = JSON.parse(raw) as { polygon?: Polygon };
        if (draft?.polygon) {
          apply(draft.polygon);
          return;
        }
      }
    } catch {
      /* ignore malformed draft and fall through to the server copy */
    }
    (async () => {
      try {
        const r = await api.get<{ onboarding?: { draft_field?: { polygon?: Polygon } } }>(
          "/api/auth/onboarding",
        );
        const polygon = r?.onboarding?.draft_field?.polygon;
        if (polygon) apply(polygon);
      } catch {
        /* a blank map is a working map — never block the wizard on this */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // E13 — the landing quiz already asked what they grow and where. Seed the wizard with it so the
  // first field starts half-filled; anything the farmer has already typed here wins.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await api.get<{ onboarding?: { crop?: string; region?: string; country?: string } }>(
          "/api/auth/onboarding",
        );
        const onb = r?.onboarding;
        if (!active || !onb) return;
        // The visitor already told us where they farm, on the landing page. Honouring it here is
        // the whole point: asking the question and then ignoring the answer was the old behaviour.
        if (onb.country && COUNTRY_CODES.includes(onb.country)) setCountry(onb.country);
        const patch: Partial<FieldMetadata> = {};
        if (onb.crop && onb.crop !== "other" && !data.crop_type) {
          patch.crop_type = onb.crop;
          const cyc = CROP_CYCLE[onb.crop];
          if (cyc && !data.crop_cycle) patch.crop_cycle = cyc;
        }
        if (onb.region && !data.region) patch.region = onb.region;
        if (Object.keys(patch).length) setMany(patch);
      } catch {
        /* the wizard works perfectly well unfilled */
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDetect(lng: number, lat: number) {
    setDetecting(true);
    setDetectMsg(t("app.field.fieldOnboarding.detectSearching"));
    try {
      const d = await api.post<{ ok: boolean; polygon?: Polygon; area_ha?: number; reason?: string }>(
        "/api/geo/segment", { lon: lng, lat: lat },
      );
      if (d?.ok && d.polygon) {
        setImportedPolygon(d.polygon);
        setImportSeq((s) => s + 1);
        setDetect(false);
        setDetectMsg(
          `~${formatArea(d.area_ha, areaUnit)} tapıldı — düzəldə və ya təsdiqləyə bilərsiniz.` +
            (d.reason === "capped" ? " (Sərhəd tam aydın deyil, yoxlayın.)" : ""),
        );
      } else {
        setDetectMsg(t("app.field.fieldOnboarding.detectNotFound"));
      }
    } catch {
      setDetectMsg(t("app.field.fieldOnboarding.detectError"));
    } finally {
      setDetecting(false);
    }
  }
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Terrain / reverse-geocode ---
  const [geoLoading, setGeoLoading] = useState(false);
  const [aspectLabel, setAspectLabel] = useState<string | null>(null);
  const lastGeoKey = useRef<string>("");

  // --- Field info state ---
  const info = useFieldInfo();
  const { data, set, setMany, toPayload } = info;
  const [rowsMap, setRowsMap] = useState<Record<string, Row[]>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [treeSpacing, setTreeSpacing] = useState<number | null>(null);
  const [orchardAge, setOrchardAge] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [limitReached, setLimitReached] = useState(false); // free-tier field cap → marketing CTA

  const cycle = data.crop_cycle ?? null;
  const isPerennial = cycle === "perennial";

  // The active polygon depends on the mode.
  const polygon: Polygon | null = useMemo(() => {
    if (mode === "draw") return drawnPolygon;
    try {
      return polygonFromRing(parseCoordinates(coordsText));
    } catch {
      return null;
    }
  }, [mode, drawnPolygon, coordsText]);

  const validation = useMemo(() => validatePolygon(polygon), [polygon]);
  const areaHa = validation.ok ? validation.areaHa ?? 0 : null;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const lower = file.name.toLowerCase();
      let poly: Polygon | null;
      if (lower.endsWith(".zip") || lower.endsWith(".shp")) {
        // Shapefile (T19) — cadastre/agronomist boundaries usually arrive as a zipped shapefile.
        poly = await parseShapefile(await file.arrayBuffer());
        if (!poly) {
          setError(t("app.field.fieldOnboarding.shapefileNoPolygon"));
          return;
        }
      } else {
        poly = parseGeoImport(await file.text(), file.name);
        if (!poly) {
          setError(t("app.field.fieldOnboarding.fileNoPolygon"));
          return;
        }
      }
      setMode("draw");
      setImportedPolygon(poly);
      setImportSeq((s) => s + 1);
      setDrawnPolygon(poly);
    } catch {
      setError(t("app.field.fieldOnboarding.fileReadError"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function fetchGeo(poly: Polygon) {
    const { lat, lon } = centroidOf(poly);
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (key === lastGeoKey.current) return;
    lastGeoKey.current = key;
    setGeoLoading(true);
    setAspectLabel(null);
    try {
      const site = await api.get<GeoSite>(`/api/geo/site?lat=${lat}&lon=${lon}`);
      setMany({
        elevation_m: site.elevation_m ?? undefined,
        slope_deg: site.slope_deg ?? undefined,
        aspect_deg: site.aspect_deg ?? undefined,
        region: site.region ?? undefined,
        economic_region: site.economic_region ?? undefined,
      });
      setAspectLabel(site.aspect_label);
    } catch {
      // Best-effort only — leave terrain fields blank on failure.
    } finally {
      setGeoLoading(false);
    }
  }

  function validateBoundary(): Polygon | null {
    if (mode === "coords") {
      try {
        parseCoordinates(coordsText);
      } catch (err) {
        setError((err as Error).message === "min" ? t("field.err.minVertices") : t("field.err.parse"));
        return null;
      }
    }
    if (!polygon) {
      setError(t("field.err.noPolygon"));
      return null;
    }
    const v = validatePolygon(polygon);
    if (!v.ok) {
      setError(v.errorKey ? t(v.errorKey) : t("common.error"));
      return null;
    }
    return polygon;
  }

  function next() {
    setError("");
    if (step === 1) {
      const poly = validateBoundary();
      if (!poly) return;
      if (areaHa != null && areaHa < 0.05) {
        setError(
          t("app.field.fieldOnboarding.fieldTooSmallPre") +
            formatArea(areaHa, areaUnit) +
            t("app.field.fieldOnboarding.fieldTooSmallPost"),
        );
        return;
      }
      void fetchGeo(poly);
    }
    // NO CROP GATE HERE, deliberately. POST /api/fields has never required a crop — FieldIn is
    // farm_id + geometry + an optional name — and the metadata PUT below is already best-effort in
    // a try/catch. The wall was purely client-side, and it is the exact wall the OneSoil corpus
    // describes: a farmer whose crop is not in the list (or who simply does not want to answer
    // yet) cannot create their first field at all. MetadataNudge and the completeness ranking
    // exist precisely to ask for this later, on a screen that already has their field on it.
    setStep((s) => Math.min(4, s + 1));
  }

  function back() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  // The high-impact metadata that is STILL empty at the confirm step, ranked (max 2). This is a
  // note, never a gate: the farmer can create the field with nothing but a crop and fill the rest
  // later from the field-status strip.
  const openGaps = useMemo(() => topMetaGaps(data), [data]);

  /** Jump back to the step that owns this gap (soil lives behind "Ətraflı" on step 3). */
  function goToGap(key: GapKey) {
    setError("");
    if (key === "soil_type") {
      setShowAdvanced(true);
      setStep(3);
    } else {
      setStep(2);
    }
  }

  async function submit() {
    setError("");
    const poly = validateBoundary();
    if (!poly) {
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      // A blank name is sent as "" on purpose: the server names the field and returns the stored
      // value, so `onCreated(field)` already carries the real name — no second fetch, and the
      // shapefile/tap-to-detect paths through the same endpoint get the same treatment.
      const field = await api.post<Field>("/api/fields", {
        farm_id: farmId,
        name: name.trim(),
        geometry: poly,
      });

      // Build the metadata payload: base state + repeatable arrays + folded extras.
      const payload = toPayload();
      for (const def of arrayDefs()) {
        payload[def.key as string] = fromRows(rowsMap[def.key as string] ?? [], def);
      }
      let notes = (data.notes ?? "").trim();
      if (isPerennial && orchardAge != null) {
        notes = `${notes ? `${notes}\n` : ""}Bağın yaşı: ${orchardAge} il`;
      }
      if (isPerennial && treeSpacing != null) {
        notes = `${notes ? `${notes}\n` : ""}Ağac aralığı: ${treeSpacing} m`;
      }
      payload.notes = notes || null;

      try {
        await api.put(`/api/fields/${field.id}/metadata`, payload);
      } catch {
        // Field is created; metadata is best-effort and editable later.
      }
      // D3.6 funnel events — field created (+ crop set if chosen).
      track("field_created");
      if (payload.crop_type) track("crop_set");
      onCreated(field);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("common.error");
      if (msg === "field_limit_reached") {
        // Free-tier cap: replace the raw error with a marketing upgrade nudge.
        setLimitReached(true);
        setBusy(false);
        return;
      }
      setError(msg === "field_too_small"
        ? t("app.field.fieldOnboarding.fieldTooSmall")
        : msg);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="flex items-center gap-2">
        {STEP_TITLES.map((title, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div key={title} className="flex flex-1 items-center gap-2">
              <div
                className={
                  active
                    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white"
                    : done
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-400"
                }
              >
                {n}
              </div>
              {i < STEP_TITLES.length - 1 && (
                <div className={done ? "h-0.5 flex-1 bg-emerald-300" : "h-0.5 flex-1 bg-slate-200"} />
              )}
            </div>
          );
        })}
      </div>
      <h2 className="text-lg font-semibold text-slate-800">{STEP_TITLES[step - 1]}</h2>

      {/* STEP 1 — boundary */}
      {step === 1 && (
        <div className="space-y-4">
          {/* NOT labelled "(optional)" any more, deliberately. Every field DOES end up with a
              name — leave this blank and POST /api/fields stores "Sahə 1", "Sahə 2", … in this
              locale — so "optional" described the input box while misdescribing the outcome, and
              read as one more thing to skip. The hint below says what will happen instead.
              The box is still not PRE-filled with the computed name, and that is on purpose: the
              server picks the number under an advisory lock over max()+1 including soft-deleted
              rows, so a number guessed in the browser could hand two fields the same name — the
              exact collision that lock exists to prevent. The placeholder shows the real word the
              server will use, so the promise and the stored value cannot drift apart. */}
          <FormField label={t("field.name")}>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("app.field.autoName.placeholder")}
            />
            <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">
              {t("app.field.autoName.hint")}
            </p>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-500">
                  {brush
                    ? t("app.field.fieldOnboarding.brushHint")
                    : detect
                      ? t("app.field.fieldOnboarding.detectHint")
                      : t("field.drawHint")}
                </p>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setBrush((v) => !v); setDetect(false); setDetectMsg(""); }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      brush
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {brush ? t("app.field.fieldOnboarding.brushActive") : t("app.field.fieldOnboarding.brushDraw")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDetect((v) => !v); setBrush(false); setDetectMsg(""); }}
                    disabled={detecting}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      detect
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    } disabled:opacity-50`}
                  >
                    {detecting ? t("app.field.fieldOnboarding.searching") : detect ? t("app.field.fieldOnboarding.detectTapActive") : t("app.field.fieldOnboarding.detectTap")}
                  </button>
                </div>
              </div>
              {detectMsg && (
                <p className={`text-xs ${detectMsg.includes("tapıldı") ? "text-emerald-700" : "text-amber-700"}`}>
                  {detectMsg}
                </p>
              )}
              <DrawMap
                onPolygon={setDrawnPolygon}
                importedPolygon={importedPolygon}
                importSeq={importSeq}
                detectMode={detect}
                onDetect={handleDetect}
                brushMode={brush}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".geojson,.json,.kml,.zip,.shp,application/geo+json,application/vnd.google-earth.kml+xml,application/zip"
                  onChange={onFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5" /> {t("app.field.fieldOnboarding.importButton")}
                </button>
              </div>
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
              {formatArea(areaHa, areaUnit)}
            </span>
          </div>
        </div>
      )}

      {/* STEP 2 — essential info */}
      {step === 2 && (
        <div className="space-y-6">
          <FormField label={t("app.field.fieldOnboarding.cropCycle")} required>
            <CycleCards value={cycle} onChange={(v) => set("crop_cycle", v)} />
          </FormField>

          <FormField label={t("meta.crop_type")}>
            <CropGrid
              cycle={cycle}
              value={data.crop_type || null}
              onChange={(v) => {
                set("crop_type", v ?? "");
                set("variety", undefined);
              }}
            />
          </FormField>

          <FormField label={t("meta.variety")}>
            <VarietyChips
              crop={data.crop_type || null}
              value={data.variety ?? null}
              onChange={(v) => set("variety", v ?? undefined)}
            />
          </FormField>

          <FormField label={isPerennial ? t("app.field.fieldOnboarding.plantingYear") : t("app.field.fieldOnboarding.plantingDate")}>
            <ClickDate
              mode={isPerennial ? "year" : "date"}
              value={data.planting_date ?? null}
              onChange={(v) => set("planting_date", v ?? undefined)}
            />
            <Why gapKey="planting_date" />
          </FormField>

          <FormField label={t("meta.irrigation_method")}>
            <ChoiceChips
              options={IRRIGATION_METHOD_OPTIONS}
              value={data.irrigation_method ?? null}
              onChange={(v) => set("irrigation_method", v ?? undefined)}
              allowOther
              allowUnknown
            />
            <Why gapKey="irrigation_method" />
          </FormField>

          <FormField label={t("meta.irrigation_available")}>
            <YesNo
              value={data.irrigation_available ?? null}
              onChange={(v) => set("irrigation_available", v ?? undefined)}
            />
          </FormField>

          <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
            {/* NOT `disabled` any more, and not a list of one. The landing quiz offers 23
                countries; this box used to answer "Azərbaycan" in a greyed-out select regardless
                of what the visitor had just told us. Satellite, weather and the whole pipeline are
                global — the lock was only ever in this vocabulary. */}
            <FormField label={t("app.field.fieldOnboarding.country")}>
              <select
                className="input"
                value={country}
                onChange={(e) => setCountry(e.target.value || AZ_COUNTRY_CODE)}
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code} value={code}>{countryName(code, getLocale())}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t("app.field.fieldOnboarding.region")}>
              {/* The 66-rayon list is an AZERBAIJANI vocabulary, so it is offered only when the
                  field is in Azerbaijan. Everywhere else the region degrades to free text rather
                  than to a dropdown that cannot contain the farmer's own province. */}
              {country === AZ_COUNTRY_CODE ? (
                <select
                  className="input"
                  value={AZ_RAYONS.find((r) => (data.region ?? "").includes(r)) ?? ""}
                  onChange={(e) => set("region", e.target.value || undefined)}
                >
                  <option value="">{geoLoading ? t("app.field.fieldOnboarding.searching") : t("app.field.fieldOnboarding.selectRegion")}</option>
                  {AZ_RAYONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  value={data.region ?? ""}
                  onChange={(e) => set("region", e.target.value || undefined)}
                  placeholder={t("app.field.fieldOnboarding.selectRegion")}
                />
              )}
              <Why gapKey="region" />
            </FormField>
            <AutoField
              label={t("meta.elevation_m")}
              value={toNum(data.elevation_m)}
              unit="m"
              loading={geoLoading}
              onChange={(v) => set("elevation_m", v)}
            />
            <AutoField
              label={t("meta.slope_deg")}
              value={toNum(data.slope_deg)}
              unit="°"
              loading={geoLoading}
              onChange={(v) => set("slope_deg", v)}
            />
            <AutoField
              label={t("app.field.fieldOnboarding.aspect")}
              value={aspectLabel ?? toNum(data.aspect_deg)}
              loading={geoLoading}
              readOnly
            />
          </div>
        </div>
      )}

      {/* STEP 3 — optional details */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {t("app.field.fieldOnboarding.optionalStepHint")}
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            {showAdvanced ? t("app.field.fieldOnboarding.hideAdvanced") : t("app.field.fieldOnboarding.showAdvanced")}
          </button>

          {showAdvanced && (
            <div className="space-y-6">
              <FormField label={t("meta.soil_type")}>
                <ChoiceChips
                  options={SOIL_TYPE_OPTIONS}
                  value={data.soil_type ?? null}
                  onChange={(v) => set("soil_type", v ?? undefined)}
                  allowOther
                  allowUnknown
                />
                <Why gapKey="soil_type" />
              </FormField>

              <FormField label={t("meta.soil_ph")}>
                <PhPicker
                  value={toNum(data.soil_ph)}
                  onChange={(v) => set("soil_ph", v ?? undefined)}
                />
              </FormField>

              <FormField label={t("meta.growth_stage")}>
                <ChoiceChips
                  options={GROWTH_STAGE_OPTIONS}
                  value={data.growth_stage ?? null}
                  onChange={(v) => set("growth_stage", v ?? undefined)}
                  allowUnknown
                />
              </FormField>

              <FormField label={t("meta.tillage_practice")}>
                <ChoiceChips
                  options={TILLAGE_OPTIONS}
                  value={data.tillage_practice ?? null}
                  onChange={(v) => set("tillage_practice", v ?? undefined)}
                  allowUnknown
                />
              </FormField>

              <FormField label={t("meta.expected_harvest")}>
                <ClickDate
                  mode="date"
                  value={data.expected_harvest ?? null}
                  onChange={(v) => set("expected_harvest", v ?? undefined)}
                />
              </FormField>

              <FormField label={t("meta.target_yield")}>
                <NumberSlider
                  value={toNum(data.target_yield)}
                  onChange={(v) => set("target_yield", v ?? undefined)}
                  min={0}
                  max={100}
                  step={0.5}
                  unit="t/ha"
                />
              </FormField>

              {isPerennial ? (
                <>
                  <FormField label={t("app.field.fieldOnboarding.treeSpacing")}>
                    <NumberSlider
                      value={treeSpacing}
                      onChange={setTreeSpacing}
                      min={1}
                      max={12}
                      step={0.5}
                      unit="m"
                    />
                  </FormField>
                  <FormField label={t("app.field.fieldOnboarding.orchardAge")}>
                    <NumberSlider
                      value={orchardAge}
                      onChange={setOrchardAge}
                      min={0}
                      max={60}
                      step={1}
                      unit="il"
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label={t("meta.seeding_density")}>
                    <NumberSlider
                      value={toNum(data.seeding_density)}
                      onChange={(v) => set("seeding_density", v ?? undefined)}
                      min={0}
                      max={500}
                      step={1}
                      unit="kg/ha"
                    />
                  </FormField>
                  <FormField label={t("meta.previous_crop")}>
                    <CropGrid
                      cycle={null}
                      value={data.previous_crop ?? null}
                      onChange={(v) => set("previous_crop", v ?? undefined)}
                    />
                  </FormField>
                </>
              )}

              <div className="space-y-4 border-t border-slate-100 pt-4">
                {arrayDefs().map((def) => (
                  <RepeatableRows
                    key={def.key as string}
                    def={def}
                    rows={rowsMap[def.key as string] ?? []}
                    onChange={(rows) =>
                      setRowsMap((prev) => ({ ...prev, [def.key as string]: rows }))
                    }
                  />
                ))}
              </div>

              <FormField label={t("meta.notes")}>
                <textarea
                  className="input h-24"
                  value={data.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </FormField>
            </div>
          )}
        </div>
      )}

      {/* STEP 4 — confirm */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {/* "—" next to a name field reads like an error; say what will actually happen. */}
              <SummaryItem
                label={t("field.name")}
                value={name.trim() || t("app.field.autoName.summary")}
              />
              <SummaryItem
                label={t("field.area")}
                value={formatArea(areaHa, areaUnit)}
              />
              <SummaryItem label={t("meta.crop_type")} value={labelOf(CROP_OPTIONS, data.crop_type)} />
              <SummaryItem label={t("meta.variety")} value={data.variety || "—"} />
              <SummaryItem
                label={isPerennial ? t("app.field.fieldOnboarding.plantingYear") : t("app.field.fieldOnboarding.plantingDate")}
                value={data.planting_date || "—"}
              />
              <SummaryItem
                label={t("meta.irrigation_method")}
                value={labelOf(IRRIGATION_METHOD_OPTIONS, data.irrigation_method)}
              />
              <SummaryItem
                label={t("app.field.fieldOnboarding.region")}
                value={data.region || "—"}
                icon={<MapPin className="h-4 w-4 text-slate-400" />}
              />
              <SummaryItem
                label={t("meta.elevation_m")}
                value={toNum(data.elevation_m) != null ? `${toNum(data.elevation_m)} m` : "—"}
                icon={<Mountain className="h-4 w-4 text-slate-400" />}
              />
              <SummaryItem
                label={t("meta.slope_deg")}
                value={toNum(data.slope_deg) != null ? `${toNum(data.slope_deg)}°` : "—"}
                icon={<TriangleRight className="h-4 w-4 text-slate-400" />}
              />
              <SummaryItem
                label={t("app.field.fieldOnboarding.aspect")}
                value={aspectLabel || "—"}
                icon={<Compass className="h-4 w-4 text-slate-400" />}
              />
            </dl>
          </div>

          {/* Non-blocking: names what is still empty and what it would unlock, ranked, max two.
              "Yarat" stays enabled either way — the same gaps reappear on the field-status strip. */}
          {openGaps.length > 0 && (
            <div className="rounded-xl border-[1.5px] border-dashed border-slate-200 bg-slate-50/70 p-3">
              <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-800">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                {t("app.field.onboarding.gapsTitle")}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
                {t("app.field.onboarding.gapsSubtitle")}
              </p>
              <ul className="mt-2 space-y-1">
                {openGaps.map((g) => (
                  <li key={g.key}>
                    <button
                      type="button"
                      onClick={() => goToGap(g.key)}
                      className="min-h-9 w-full rounded-lg px-1 text-left text-[12.5px] leading-snug text-slate-700 hover:bg-white"
                    >
                      <b className="font-semibold text-slate-900">{tf(g.actionKey)}</b>
                      <span className="text-slate-500"> — {tf(g.unlockKey)}</span>
                      <span className="whitespace-nowrap text-slate-500">
                        {" "}
                        ({tf("app.field.meta.nudge.seconds", { n: g.seconds })})
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-slate-500">
            {t("app.field.fieldOnboarding.queueInfo")}
          </p>
        </div>
      )}

      {limitReached && <UpgradeCta onDismiss={() => setLimitReached(false)} />}
      <ErrorNote message={limitReached ? "" : error} />

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <button
          type="button"
          className="btn-secondary"
          onClick={back}
          disabled={step === 1 || busy}
        >
          {t("common.back")}
        </button>
        {step < 4 ? (
          <button type="button" className="btn-primary" onClick={next}>
            {t("common.next")}
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={submit} disabled={busy || limitReached}>
            {busy ? t("common.saving") : t("app.field.fieldOnboarding.createField")}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * One-line "why this matters" under an optional control. Every optional answer here costs the
 * farmer effort, so each one says what the AI can do with it — the same sentence the field-status
 * completeness strip uses later, so the ask never changes wording between the two surfaces.
 */
function Why({ gapKey }: { gapKey: GapKey }) {
  const gap = META_GAPS.find((g) => g.key === gapKey);
  if (!gap) return null;
  return <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">{tf(gap.unlockKey)}</p>;
}

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-800">
        {icon}
        {value}
      </dd>
    </div>
  );
}
