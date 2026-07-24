"use client";

// A6 productivity zones + A7 VRA-lite (HYBRID_PLAN W8).
//
// The multi-season raster maths runs in the geo image (services/geo_pipeline/zones.py) via the
// deploy/process-zones.sh cron; this tab only enqueues a run, polls for it, draws the resulting
// polygons and turns them into a variable-rate fertilizer plan.
// Zone 1 = the WEAKEST part of the field … zone n = the STRONGEST (set by the backend).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Layers, RefreshCw, Info, Sprout } from "lucide-react";
import { api, azError } from "@/lib/api";
import { BLANK_STYLE, applyBasemap, getSavedBasemap } from "@/lib/basemaps";
import { ErrorNote, Placeholder, Spinner } from "@/components/ui";

// ── types (local on purpose — lib/types.ts is shared and owned elsewhere) ────────────────
type Ring = [number, number][];
interface PolygonGeom { type: "Polygon"; coordinates: Ring[] }
interface MultiPolygonGeom { type: "MultiPolygon"; coordinates: Ring[][] }
type ZoneGeom = PolygonGeom | MultiPolygonGeom;

interface ZoneRun {
  id: string;
  index_name: string;
  sensor: string;
  n_zones: number;
  month_from: number;
  month_to: number;
  season_from: number | null;
  season_to: number | null;
  n_scenes: number;
  pixel_size_m: number | null;
  valid_pixels: number | null;
  field_mean: number | null;
  homogeneity_cv: number | null;
  homogeneity_class: string | null;
  status: string;
  message: string | null;
  computed_at: string | null;
}

interface Zone {
  id: string;
  zone_no: number;
  geom: ZoneGeom | null;
  area_ha: number | null;
  area_pct: number | null;
  pixel_count: number | null;
  mean_value: number | null;
  min_value: number | null;
  max_value: number | null;
  std_value: number | null;
  p10: number | null;
  p50: number | null;
  p90: number | null;
  rel_to_field: number | null;
}

interface ZonesResponse {
  status: string; // none | queued | running | ready | insufficient_data | failed
  hint: string | null;
  run: ZoneRun | null;
  zones: Zone[];
  field_area_ha: number | null;
}

interface VraDose {
  zone_no: number;
  area_ha: number | null;
  dose_kg_ha: number | null;
  total_kg: number | null;
}

interface VraPlan {
  id: string;
  run_id: string | null;
  season_year: number;
  crop_type: string | null;
  nutrient: string;
  strategy: string;
  base_dose_kg_ha: number | null;
  uniform_total_kg: number | null;
  vra_total_kg: number | null;
  saved_kg: number | null;
  price_azn_per_kg: number | null;
  saved_azn: number | null;
  notes: string | null;
  created_at: string;
}

interface VraResponse { plan: VraPlan | null; doses: VraDose[] }

interface FieldGeom { id: string; name: string; geom: PolygonGeom | null; area_ha: number | null }

// ── zone colour ramp (weak → strong), 5 steps sampled for any 3..7 zone count ────────────
const RAMP = ["#d73027", "#fc8d59", "#fee08b", "#a6d96a", "#1a9850"];

function zoneColor(zoneNo: number, n: number): string {
  if (n <= 1) return RAMP[4];
  const idx = Math.round(((zoneNo - 1) / (n - 1)) * (RAMP.length - 1));
  return RAMP[Math.max(0, Math.min(RAMP.length - 1, idx))];
}

function fmt(v: number | null | undefined, digits = 2): string {
  return v == null || Number.isNaN(v) ? "—" : v.toFixed(digits);
}

function eachCoord(geom: ZoneGeom | PolygonGeom, cb: (c: [number, number]) => void) {
  if (geom.type === "Polygon") {
    (geom.coordinates as Ring[]).forEach((ring) => ring.forEach(cb));
  } else {
    (geom.coordinates as Ring[][]).forEach((poly) => poly.forEach((ring) => ring.forEach(cb)));
  }
}

// ── map ─────────────────────────────────────────────────────────────────────────────────
function ZonesMap({
  zones,
  nZones,
  outline,
}: {
  zones: Zone[];
  nZones: number;
  outline: PolygonGeom | null;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);

  const collection = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: zones
        .filter((z) => z.geom)
        .map((z) => ({
          type: "Feature" as const,
          geometry: z.geom as unknown as GeoJSON.Geometry,
          properties: { zone_no: z.zone_no, color: zoneColor(z.zone_no, nZones) },
        })),
    };
  }, [zones, nZones]);

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: boxRef.current,
      style: BLANK_STYLE,
      center: [48.5, 40.4],
      zoom: 6,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");

    function draw() {
      if (map.getSource("zones")) return; // already built
      applyBasemap(map, getSavedBasemap());
      map.addSource("zones", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "zones-fill",
        type: "fill",
        source: "zones",
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.6 },
      });
      map.addLayer({
        id: "zones-line",
        type: "line",
        source: "zones",
        paint: { "line-color": "#ffffff", "line-width": 0.8, "line-opacity": 0.8 },
      });
      map.addSource("field-outline", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "field-outline-line",
        type: "line",
        source: "field-outline",
        paint: { "line-color": "#facc15", "line-width": 2 },
      });
      readyRef.current = true;
      map.resize();
    }

    if (map.isStyleLoaded()) draw();
    else map.on("load", draw);
    map.on("idle", draw);

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push data + fit bounds whenever the zones (or the field outline) change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    function apply() {
      if (cancelled || !mapRef.current || !readyRef.current) return;
      const m = mapRef.current;
      (m.getSource("zones") as maplibregl.GeoJSONSource | undefined)?.setData(
        collection as unknown as GeoJSON.GeoJSON,
      );
      (m.getSource("field-outline") as maplibregl.GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features: outline
          ? [{ type: "Feature", geometry: outline as unknown as GeoJSON.Geometry, properties: {} }]
          : [],
      } as GeoJSON.GeoJSON);

      const b = new maplibregl.LngLatBounds();
      let any = false;
      collection.features.forEach((f) => {
        eachCoord(f.geometry as unknown as ZoneGeom, (c) => { b.extend(c); any = true; });
      });
      if (!any && outline) eachCoord(outline, (c) => { b.extend(c); any = true; });
      if (any) m.fitBounds(b, { padding: 36, maxZoom: 16, duration: 0 });
      m.resize();
    }

    if (readyRef.current) apply();
    else map.once("idle", apply);
    return () => { cancelled = true; };
  }, [collection, outline]);

  return (
    <div
      ref={boxRef}
      className="h-72 w-full overflow-hidden rounded-2xl border-[1.5px] border-slate-200"
    />
  );
}

// ── tab ─────────────────────────────────────────────────────────────────────────────────
const SENSORS: { value: string; label: string }[] = [
  { value: "S2", label: "Sentinel-2 (10 m)" },
  { value: "HLS", label: "NASA HLS (30 m)" },
];
const ZONE_COUNTS = [3, 4, 5, 6, 7];
const NUTRIENTS: { value: string; label: string }[] = [
  { value: "N", label: "Azot (N)" },
  { value: "P", label: "Fosfor (P)" },
  { value: "K", label: "Kalium (K)" },
];
const STRATEGIES: { value: string; label: string; hint: string }[] = [
  { value: "compensate", label: "Zəif zonaya çox", hint: "Geridə qalan hissələri qidalandır" },
  { value: "maximize", label: "Güclü zonaya çox", hint: "Ən məhsuldar hissəyə sərmayə qoy" },
];

export default function ZonesTab({ fieldId }: { fieldId: string }) {
  const [data, setData] = useState<ZonesResponse | null>(null);
  const [field, setField] = useState<FieldGeom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // run settings
  const [nZones, setNZones] = useState(5);
  const [sensor, setSensor] = useState("S2");

  // VRA panel
  const [vra, setVra] = useState<VraResponse | null>(null);
  const [nutrient, setNutrient] = useState("N");
  const [strategy, setStrategy] = useState("compensate");
  const [baseDose, setBaseDose] = useState("");
  const [price, setPrice] = useState("");
  const [vraBusy, setVraBusy] = useState(false);
  const [vraError, setVraError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get<ZonesResponse>(`/api/fields/${fieldId}/zones`);
      setData(res);
      if (res?.run?.n_zones) setNZones(res.run.n_zones);
      if (res?.run?.sensor) setSensor(res.run.sensor);
      setError("");
    } catch (e) {
      setError(azError(e));
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const f = await api.get<FieldGeom>(`/api/fields/${fieldId}`);
        if (active) setField(f);
      } catch { /* the map still works from the zone polygons alone */ }
    })();
    return () => { active = false; };
  }, [fieldId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const v = await api.get<VraResponse>(`/api/fields/${fieldId}/vra?nutrient=${nutrient}`);
        if (active) setVra(v);
      } catch { if (active) setVra(null); }
    })();
    return () => { active = false; };
  }, [fieldId, nutrient]);

  // Poll while the geo worker is computing (the cron picks the row up within ~5 min).
  const computing = data?.status === "queued" || data?.status === "running";
  useEffect(() => {
    if (!computing) return;
    const id = window.setInterval(() => { void load(); }, 15000);
    return () => window.clearInterval(id);
  }, [computing, load]);

  async function compute() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/fields/${fieldId}/zones`, {
        index_name: "NDVI",
        sensor,
        n_zones: nZones,
        month_from: 5,
        month_to: 8,
        max_cloud_pct: 60,
      });
      await load();
    } catch (e) {
      setError(azError(e));
    } finally {
      setBusy(false);
    }
  }

  async function buildVra() {
    setVraBusy(true);
    setVraError("");
    try {
      const body: Record<string, unknown> = { nutrient, strategy };
      // Mirror the server's bounds (VraIn: dose 0-2000, price 0-100) so an out-of-range entry
      // gets a specific Azerbaijani message instead of a generic 422.
      const bd = parseFloat(baseDose.replace(",", "."));
      if (!Number.isNaN(bd) && bd > 0) {
        if (bd > 2000) { setVraError("Baza norması 2000 kq/ha-dan çox ola bilməz."); return; }
        body.base_dose_kg_ha = bd;
      }
      const pr = parseFloat(price.replace(",", "."));
      if (!Number.isNaN(pr) && pr >= 0) {
        if (pr > 100) { setVraError("Gübrə qiyməti 100 ₼/kq-dan çox ola bilməz."); return; }
        body.price_azn_per_kg = pr;
      }
      await api.post(`/api/fields/${fieldId}/vra`, body);
      const v = await api.get<VraResponse>(`/api/fields/${fieldId}/vra?nutrient=${nutrient}`);
      setVra(v);
    } catch (e) {
      setVraError(
        azError(e) === "Xəta baş verdi. Yenidən cəhd edin."
          ? "Plan qurulmadı — zonalar hazır olmalı və baza norması (kq/ha) verilməlidir."
          : azError(e),
      );
    } finally {
      setVraBusy(false);
    }
  }

  const zones = data?.zones ?? [];
  const run = data?.run ?? null;
  const ready = data?.status === "ready" && zones.length > 0;

  const verdict = useMemo(() => {
    if (!run || run.homogeneity_cv == null) return null;
    const cv = run.homogeneity_cv;
    const cls = run.homogeneity_class;
    const head =
      cls === "uniform" ? "Sahə bircinsdir" :
      cls === "moderate" ? "Sahədə orta fərqlilik var" : "Sahə dəyişkəndir";
    return `${head} (dəyişkənlik əmsalı ${cv.toFixed(2)}). ${data?.hint ?? ""}`.trim();
  }, [run, data]);

  if (loading) return <Spinner label="Zonalar yüklənir…" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}

      {/* ── settings + compute ───────────────────────────────────────────── */}
      <div className="card space-y-3">
        <div className="flex items-start gap-2">
          <Layers className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Məhsuldarlıq zonaları</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Bir neçə mövsümün peyk şəkilləri birləşdirilir və sahə daimi olaraq zəif/güclü
              hissələrə bölünür. 1-ci zona ən zəif, sonuncu zona ən güclüdür.
            </p>
          </div>
        </div>

        <div>
          <label className="label">Zona sayı</label>
          <div className="flex flex-wrap gap-2">
            {ZONE_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNZones(n)}
                className={`min-h-[44px] min-w-[44px] rounded-lg border px-3 text-sm font-medium ${
                  n === nZones
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Peyk mənbəyi</label>
          <div className="flex flex-wrap gap-2">
            {SENSORS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSensor(s.value)}
                className={`min-h-[44px] rounded-lg border px-3 text-sm font-medium ${
                  s.value === sensor
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void compute()}
          disabled={busy || computing}
          className="btn-primary min-h-[44px] w-full disabled:opacity-60"
        >
          {busy || computing ? "Hesablanır…" : "Zonaları hesabla"}
        </button>
        <p className="text-[11px] text-slate-400">
          Yay pəncərəsi (may–avqust), buludluluq ≤ 60 %. Hesablama fon prosesində aparılır.
        </p>
      </div>

      {/* ── computing / insufficient / empty states ──────────────────────── */}
      {computing && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
          <span>Zonalar hesablanır — bu bir neçə dəqiqə çəkə bilər. Səhifə özü yenilənəcək.</span>
        </div>
      )}

      {data?.status === "insufficient_data" && (
        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{data.hint ?? "Zonalama üçün kifayət qədər peyk şəkli yoxdur."}</span>
        </div>
      )}

      {data?.status === "failed" && (
        <ErrorNote message={data.hint ?? "Zonalar hesablanmadı — yenidən cəhd edin."} />
      )}

      {data?.status === "none" && !computing && (
        <Placeholder>
          Hələ zona hesablanmayıb. Yuxarıdakı “Zonaları hesabla” düyməsi ilə başlayın.
        </Placeholder>
      )}

      {/* ── map + legend ─────────────────────────────────────────────────── */}
      {ready && (
        <div className="card space-y-3">
          <ZonesMap zones={zones} nZones={run?.n_zones ?? nZones} outline={field?.geom ?? null} />

          {verdict && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
              {verdict}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-1 pr-2 font-medium">Zona</th>
                  <th className="py-1 pr-2 font-medium">Orta {run?.index_name ?? "NDVI"}</th>
                  <th className="py-1 pr-2 font-medium">Sahə (ha)</th>
                  <th className="py-1 pr-2 font-medium">Payı</th>
                  <th className="py-1 font-medium">Sahəyə nisbət</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-sm"
                          style={{ background: zoneColor(z.zone_no, run?.n_zones ?? nZones) }}
                        />
                        <span className="font-medium text-slate-700">{z.zone_no}</span>
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-slate-700">{fmt(z.mean_value, 3)}</td>
                    <td className="py-1.5 pr-2 text-slate-700">{fmt(z.area_ha, 2)}</td>
                    <td className="py-1.5 pr-2 text-slate-700">
                      {z.area_pct == null ? "—" : `${z.area_pct.toFixed(0)}%`}
                    </td>
                    <td className="py-1.5 text-slate-700">
                      {z.rel_to_field == null ? "—" : `${(z.rel_to_field * 100).toFixed(0)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400">
            {run?.n_scenes ?? 0} peyk şəkli · {run?.pixel_size_m ? `${fmt(run.pixel_size_m, 0)} m piksel · ` : ""}
            {run?.valid_pixels ?? 0} piksel
            {run?.computed_at ? ` · ${run.computed_at.slice(0, 10)}` : ""}
          </p>
        </div>
      )}

      {/* ── A7 VRA-lite ──────────────────────────────────────────────────── */}
      {ready && (
        <div className="card space-y-3">
          <div className="flex items-start gap-2">
            <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Zonalı gübrələmə (VRA)</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Hər zona üçün ayrıca norma hesablanır və bərabər norma ilə müqayisə edilir.
              </p>
            </div>
          </div>

          {vraError && <ErrorNote message={vraError} />}

          <div>
            <label className="label">Qida elementi</label>
            <div className="flex flex-wrap gap-2">
              {NUTRIENTS.map((n) => (
                <button
                  key={n.value}
                  type="button"
                  onClick={() => setNutrient(n.value)}
                  className={`min-h-[44px] rounded-lg border px-3 text-sm font-medium ${
                    n.value === nutrient
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Strategiya</label>
            <div className="flex flex-wrap gap-2">
              {STRATEGIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStrategy(s.value)}
                  title={s.hint}
                  className={`min-h-[44px] rounded-lg border px-3 text-left text-sm font-medium ${
                    s.value === strategy
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <span className="block">{s.label}</span>
                  <span className="block text-[11px] font-normal text-slate-400">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Baza norması (kq/ha)</label>
              <input
                className="input"
                inputMode="decimal"
                placeholder="Gübrə planından"
                value={baseDose}
                onChange={(e) => setBaseDose(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Qiymət (₼/kq)</label>
              <input
                className="input"
                inputMode="decimal"
                placeholder="1.2"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void buildVra()}
            disabled={vraBusy}
            className="btn-secondary min-h-[44px] w-full disabled:opacity-60"
          >
            {vraBusy ? "Hazırlanır…" : "Plan hazırla"}
          </button>

          {vra?.plan && (
            <div className="space-y-3">
              <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
                <div className="text-sm font-semibold text-emerald-800">
                  Gözlənilən qənaət: {fmt(vra.plan.saved_azn, 2)} ₼
                </div>
                <div className="mt-0.5 text-xs text-emerald-700">
                  Bərabər norma {fmt(vra.plan.uniform_total_kg, 1)} kq · zonalı{" "}
                  {fmt(vra.plan.vra_total_kg, 1)} kq · fərq {fmt(vra.plan.saved_kg, 1)} kq
                </div>
                {(vra.plan.saved_kg ?? 0) < 0 && (
                  <div className="mt-1 text-[11px] text-emerald-700">
                    Mənfi fərq = plan bərabər normadan daha çox gübrə tələb edir (zəif zonalar
                    əlavə qidalanır).
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] text-left text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="py-1 pr-2 font-medium">Zona</th>
                      <th className="py-1 pr-2 font-medium">Sahə (ha)</th>
                      <th className="py-1 pr-2 font-medium">Norma (kq/ha)</th>
                      <th className="py-1 font-medium">Cəmi (kq)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vra.doses.map((d) => (
                      <tr key={d.zone_no} className="border-t border-slate-100">
                        <td className="py-1.5 pr-2">
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 shrink-0 rounded-sm"
                              style={{ background: zoneColor(d.zone_no, run?.n_zones ?? nZones) }}
                            />
                            <span className="font-medium text-slate-700">{d.zone_no}</span>
                          </span>
                        </td>
                        <td className="py-1.5 pr-2 text-slate-700">{fmt(d.area_ha, 2)}</td>
                        <td className="py-1.5 pr-2 font-medium text-slate-800">
                          {fmt(d.dose_kg_ha, 1)}
                        </td>
                        <td className="py-1.5 text-slate-700">{fmt(d.total_kg, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-400">
                Dozalar ELEMENT əsaslıdır (kq {vra.plan.nutrient}), kommersiya gübrəsi deyil.
                Baza norması {fmt(vra.plan.base_dose_kg_ha, 1)} kq/ha, qiymət{" "}
                {fmt(vra.plan.price_azn_per_kg, 2)} ₼/kq. Konkret məhsul və norma üçün torpaq
                analizi və aqronom məsləhəti lazımdır.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
