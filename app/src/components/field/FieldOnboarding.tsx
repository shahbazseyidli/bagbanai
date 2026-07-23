"use client";

// FieldOnboarding — a click-first, 4-step wizard that replaces the single-screen
// FieldCreator. Step 1 draws/imports the boundary and kicks off a best-effort
// terrain + reverse-geocode lookup; steps 2–3 collect "Sahə haqqında məlumat"
// with almost no typing; step 4 confirms and submits (POST field → PUT metadata).

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, MapPin, Mountain, Compass, TriangleRight } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { DrawMap } from "@/components/FieldMap";
import UpgradeCta from "@/components/UpgradeCta";
import { ErrorNote, Field as FormField } from "@/components/ui";
import { parseCoordinates, polygonFromRing, validatePolygon } from "@/lib/geo";
import { parseGeoImport, parseShapefile } from "@/lib/geoio";
import { track } from "@/lib/track";
import type { Field, GeoSite, Polygon } from "@/lib/types";
import {
  type Opt,
  CROP_OPTIONS,
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
import { COUNTRIES, AZ_RAYONS } from "@/lib/regions";
import YesNo from "./info/YesNo";
import { ARRAY_DEFS, RepeatableRows, type Row, fromRows } from "./repeatableRows";

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
  return options.find((o) => o.value === value)?.label ?? value;
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

const STEP_TITLES = [
  "Xəritədə sahəni seçin",
  "Sahə haqqında məlumat",
  "Ətraflı məlumat (istəyə bağlı)",
  "Təsdiq",
];

export default function FieldOnboarding({ farmId, onCreated }: Props) {
  const [step, setStep] = useState(1);

  // --- Step 1: boundary ---
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("draw");
  const [drawnPolygon, setDrawnPolygon] = useState<Polygon | null>(null);
  const [coordsText, setCoordsText] = useState("");
  const [importedPolygon, setImportedPolygon] = useState<Polygon | null>(null);
  const [importSeq, setImportSeq] = useState(0);
  const [detect, setDetect] = useState(false);       // C3 tap-to-detect mode
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState("");
  const [brush, setBrush] = useState(false);         // freehand brush/lasso mode

  // D3.1 — if the visitor drew a field on the public landing map before signing up, prefill it here
  // so onboarding starts from their real boundary instead of a blank map.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bagban_draft_field");
      if (!raw) return;
      localStorage.removeItem("bagban_draft_field");
      const draft = JSON.parse(raw) as { polygon?: Polygon };
      if (draft?.polygon) {
        setMode("draw");
        setDrawnPolygon(draft.polygon);
        setImportedPolygon(draft.polygon);
        setImportSeq((s) => s + 1);
      }
    } catch {
      /* ignore malformed draft */
    }
  }, []);

  async function handleDetect(lng: number, lat: number) {
    setDetecting(true);
    setDetectMsg("Sahə sərhədi tapılır…");
    try {
      const d = await api.post<{ ok: boolean; polygon?: Polygon; area_ha?: number; reason?: string }>(
        "/api/geo/segment", { lon: lng, lat: lat },
      );
      if (d?.ok && d.polygon) {
        setImportedPolygon(d.polygon);
        setImportSeq((s) => s + 1);
        setDetect(false);
        setDetectMsg(
          `~${d.area_ha} ha tapıldı — düzəldə və ya təsdiqləyə bilərsiniz.` +
            (d.reason === "capped" ? " (Sərhəd tam aydın deyil, yoxlayın.)" : ""),
        );
      } else {
        setDetectMsg("Sərhəd avtomatik tapılmadı — xəritədə əl ilə çəkin.");
      }
    } catch {
      setDetectMsg("Xəta baş verdi — əl ilə çəkin.");
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
          setError("Shapefile-də poliqon tapılmadı (.zip içində .shp + .dbf + .prj olmalıdır).");
          return;
        }
      } else {
        poly = parseGeoImport(await file.text(), file.name);
        if (!poly) {
          setError("Faylda poliqon tapılmadı (GeoJSON / KML / Shapefile gözlənilir).");
          return;
        }
      }
      setMode("draw");
      setImportedPolygon(poly);
      setImportSeq((s) => s + 1);
      setDrawnPolygon(poly);
    } catch {
      setError("Fayl oxunmadı.");
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
      if (!name.trim()) {
        setError("Sahənin adını daxil edin.");
        return;
      }
      const poly = validateBoundary();
      if (!poly) return;
      if (areaHa != null && areaHa < 0.05) {
        setError(`Sahə çox kiçikdir (${areaHa.toFixed(3)} ha). Peyk analizi üçün minimum ~0.05 ha lazımdır — sərhədi yenidən çəkin.`);
        return;
      }
      void fetchGeo(poly);
    }
    if (step === 2 && !(data.crop_type && data.crop_type.trim())) {
      setError(t("meta.cropRequired"));
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function back() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  async function submit() {
    setError("");
    const poly = validateBoundary();
    if (!poly) {
      setStep(1);
      return;
    }
    if (!name.trim()) {
      setStep(1);
      setError(t("field.err.noPolygon"));
      return;
    }
    if (!(data.crop_type && data.crop_type.trim())) {
      setStep(2);
      setError(t("meta.cropRequired"));
      return;
    }

    setBusy(true);
    try {
      const field = await api.post<Field>("/api/fields", {
        farm_id: farmId,
        name,
        geometry: poly,
      });

      // Build the metadata payload: base state + repeatable arrays + folded extras.
      const payload = toPayload();
      for (const def of ARRAY_DEFS) {
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
        ? "Sahə çox kiçikdir (minimum ~0.05 ha). Sərhədi yenidən çəkin."
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
          <FormField label={t("field.name")} required>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
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
                    ? "Barmağınızla (və ya siçanla) sahənin sərhədini çəkin — buraxanda avtomatik tamamlanacaq."
                    : detect
                      ? "Sahənizin içinə toxunun — sərhədi avtomatik tapacağıq."
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
                    {brush ? "✓ Fırça (aktiv)" : "✏️ Fırça ilə çək"}
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
                    {detecting ? "Tapılır…" : detect ? "✓ Toxun və tap (aktiv)" : "✨ Toxun və tap"}
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
                  <Upload className="h-3.5 w-3.5" /> İdxal (GeoJSON/KML/Shapefile)
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
              {areaHa !== null ? `${areaHa.toFixed(3)} ${t("field.ha")}` : "—"}
            </span>
          </div>
        </div>
      )}

      {/* STEP 2 — essential info */}
      {step === 2 && (
        <div className="space-y-6">
          <FormField label="Əkin növü" required>
            <CycleCards value={cycle} onChange={(v) => set("crop_cycle", v)} />
          </FormField>

          <FormField label={t("meta.crop_type")} required>
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

          <FormField label={isPerennial ? "Əkilmə ili" : "Səpin tarixi"}>
            <ClickDate
              mode={isPerennial ? "year" : "date"}
              value={data.planting_date ?? null}
              onChange={(v) => set("planting_date", v ?? undefined)}
            />
          </FormField>

          <FormField label={t("meta.irrigation_method")}>
            <ChoiceChips
              options={IRRIGATION_METHOD_OPTIONS}
              value={data.irrigation_method ?? null}
              onChange={(v) => set("irrigation_method", v ?? undefined)}
              allowOther
              allowUnknown
            />
          </FormField>

          <FormField label={t("meta.irrigation_available")}>
            <YesNo
              value={data.irrigation_available ?? null}
              onChange={(v) => set("irrigation_available", v ?? undefined)}
            />
          </FormField>

          <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
            <FormField label="Ölkə">
              <select className="input" value="AZ" disabled>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Rayon">
              <select
                className="input"
                value={AZ_RAYONS.find((r) => (data.region ?? "").includes(r)) ?? ""}
                onChange={(e) => set("region", e.target.value || undefined)}
              >
                <option value="">{geoLoading ? "Tapılır…" : "Rayon seçin"}</option>
                {AZ_RAYONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
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
              label="İstiqamət"
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
            Bu addım tamamilə istəyə bağlıdır — istədiyiniz sahələri doldurun, qalanlarını buraxın.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            {showAdvanced ? "Ətraflı sahələri gizlət" : "Ətraflı sahələri göstər"}
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
                  <FormField label="Ağac aralığı">
                    <NumberSlider
                      value={treeSpacing}
                      onChange={setTreeSpacing}
                      min={1}
                      max={12}
                      step={0.5}
                      unit="m"
                    />
                  </FormField>
                  <FormField label="Bağın yaşı">
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
                {ARRAY_DEFS.map((def) => (
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
              <SummaryItem label={t("field.name")} value={name || "—"} />
              <SummaryItem
                label={t("field.area")}
                value={areaHa !== null ? `${areaHa.toFixed(3)} ${t("field.ha")}` : "—"}
              />
              <SummaryItem label={t("meta.crop_type")} value={labelOf(CROP_OPTIONS, data.crop_type)} />
              <SummaryItem label={t("meta.variety")} value={data.variety || "—"} />
              <SummaryItem
                label={isPerennial ? "Əkilmə ili" : "Səpin tarixi"}
                value={data.planting_date || "—"}
              />
              <SummaryItem
                label={t("meta.irrigation_method")}
                value={labelOf(IRRIGATION_METHOD_OPTIONS, data.irrigation_method)}
              />
              <SummaryItem
                label="Rayon"
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
                label="İstiqamət"
                value={aspectLabel || "—"}
                icon={<Compass className="h-4 w-4 text-slate-400" />}
              />
            </dl>
          </div>
          <p className="text-sm text-slate-500">
            Sahə yaradıldıqdan sonra peyk məlumatları avtomatik növbəyə alınacaq.
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
            {busy ? t("common.saving") : "Sahəni yarat"}
          </button>
        )}
      </div>
    </div>
  );
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
