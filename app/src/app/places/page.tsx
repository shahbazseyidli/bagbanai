"use client";

// Yerlər — non-field map places (B16, HYBRID_PLAN W7). Everything on the farm map that is NOT a
// crop field: buildings, water lines, storages, hazards, roads. Org-scoped page with an org
// switcher (mirrors /ledger). A place is created from typed coordinates, the device location or
// the map centre handed over as ?lat=&lon=. Inline AZ copy (T18 extracts later).
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Droplets,
  LocateFixed,
  MapPin,
  Pencil,
  Plus,
  Route,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote, Field as FormField, Placeholder, Spinner } from "@/components/ui";
import type { Org } from "@/lib/types";

interface PlaceProps {
  id: string;
  org_id: string;
  farm_id: string | null;
  field_id: string | null;
  name: string;
  kind: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface PlaceGeometry {
  type: string;
  coordinates: unknown;
}

interface PlaceFeature {
  type: string;
  id: string;
  geometry: PlaceGeometry | null;
  properties: PlaceProps;
}

interface PlaceCollection {
  type: string;
  features: PlaceFeature[];
}

const KINDS: { value: string; label: string; Icon: typeof MapPin; tone: string }[] = [
  { value: "building", label: "Tikili", Icon: Building2, tone: "text-slate-600" },
  { value: "water", label: "Su xətti", Icon: Droplets, tone: "text-sky-600" },
  { value: "storage", label: "Anbar", Icon: Warehouse, tone: "text-amber-600" },
  { value: "hazard", label: "Təhlükə", Icon: AlertTriangle, tone: "text-red-600" },
  { value: "road", label: "Yol", Icon: Route, tone: "text-slate-500" },
  { value: "other", label: "Digər", Icon: MapPin, tone: "text-emerald-600" },
];

/** First [lon, lat] pair of any Point / LineString / Polygon — enough to show and re-centre. */
function firstCoord(geom: PlaceGeometry | null): [number, number] | null {
  if (!geom) return null;
  const c = geom.coordinates;
  if (geom.type === "Point" && Array.isArray(c) && c.length >= 2) {
    return [Number(c[0]), Number(c[1])];
  }
  if (geom.type === "LineString" && Array.isArray(c) && Array.isArray(c[0])) {
    const p = c[0] as unknown[];
    return [Number(p[0]), Number(p[1])];
  }
  if (geom.type === "Polygon" && Array.isArray(c) && Array.isArray(c[0])) {
    const ring = c[0] as unknown[];
    if (Array.isArray(ring[0])) {
      const p = ring[0] as unknown[];
      return [Number(p[0]), Number(p[1])];
    }
  }
  return null;
}

const GEOM_AZ: Record<string, string> = {
  Point: "Nöqtə",
  LineString: "Xətt",
  Polygon: "Sahə",
};

export default function PlacesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [places, setPlaces] = useState<PlaceFeature[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // form state
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editingGeom, setEditingGeom] = useState<PlaceGeometry | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("building");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    api
      .get<Org[]>("/api/orgs")
      .then((l) => {
        setOrgs(l);
        if (l[0]) setOrgId(l[0].id);
        else setPlaces([]);
      })
      .catch((e) => {
        setError(azError(e));
        setPlaces([]);
      });
  }, [user, loading, router]);

  // Map centre handoff: /places?lat=40.12&lon=48.55 opens the form pre-filled.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const qLat = q.get("lat");
    const qLon = q.get("lon");
    if (qLat && qLon && Number.isFinite(Number(qLat)) && Number.isFinite(Number(qLon))) {
      setLat(qLat);
      setLon(qLon);
      setOpen(true);
    }
  }, []);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const data = await api.get<PlaceCollection>(`/api/orgs/${id}/places`);
      setPlaces(data.features || []);
    } catch (e) {
      setError(azError(e));
      setPlaces([]);
    }
  }, []);

  useEffect(() => {
    if (!orgId) return;
    setPlaces(null);
    void load(orgId);
  }, [orgId, load]);

  function resetForm() {
    setEditingId("");
    setEditingGeom(null);
    setName("");
    setKind("building");
    setLat("");
    setLon("");
    setNotes("");
  }

  function startAdd() {
    resetForm();
    setOpen(true);
  }

  function startEdit(f: PlaceFeature) {
    const c = firstCoord(f.geometry);
    setEditingId(f.properties.id);
    setEditingGeom(f.geometry);
    setName(f.properties.name);
    setKind(f.properties.kind);
    setNotes(f.properties.notes || "");
    setLat(c ? String(c[1]) : "");
    setLon(c ? String(c[0]) : "");
    setOpen(true);
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Cihaz məkanı dəstəkləmir.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLon(pos.coords.longitude.toFixed(6));
      },
      () => setError("Məkan alınmadı — koordinatı əl ilə yazın."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // A non-Point place (water line, road polygon) keeps its drawn geometry when edited here.
  const isPointEdit = !editingId || !editingGeom || editingGeom.type === "Point";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!orgId) return;
    if (!name.trim()) {
      setError("Ad yazın.");
      return;
    }
    const la = Number(lat);
    const lo = Number(lon);
    const needCoords = !editingId || isPointEdit;
    if (needCoords) {
      if (!lat.trim() || !lon.trim() || !Number.isFinite(la) || !Number.isFinite(lo)) {
        setError("Koordinatları yazın (enlik və uzunluq).");
        return;
      }
      if (la < -90 || la > 90 || lo < -180 || lo > 180) {
        setError("Koordinat aralıqdan kənardır.");
        return;
      }
    }
    setBusy(true);
    try {
      const geometry = needCoords ? { type: "Point", coordinates: [lo, la] } : undefined;
      if (editingId) {
        await api.put(`/api/places/${editingId}`, {
          name: name.trim(),
          kind,
          notes: notes.trim(),
          ...(geometry ? { geometry } : {}),
        });
      } else {
        await api.post(`/api/orgs/${orgId}/places`, {
          name: name.trim(),
          kind,
          notes: notes.trim() || undefined,
          geometry,
        });
      }
      resetForm();
      setOpen(false);
      await load(orgId);
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(f: PlaceFeature) {
    if (typeof window !== "undefined" && !window.confirm(`"${f.properties.name}" silinsin?`)) return;
    setError("");
    setBusy(true);
    try {
      await api.del(`/api/places/${f.properties.id}`);
      await load(orgId);
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  const known = new Set(KINDS.map((k) => k.value));
  const groups = [
    ...KINDS.map((k) => ({
      ...k,
      items: (places || []).filter((f) => f.properties.kind === k.value),
    })),
    // Defensive: a row saved before the kind list existed still shows up somewhere.
    {
      value: "__unknown",
      label: "Təsnif edilməyib",
      Icon: MapPin,
      tone: "text-slate-500",
      items: (places || []).filter((f) => !known.has(f.properties.kind)),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Yerlər</h1>
        {orgs.length > 1 && (
          <select
            className="input max-w-xs"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            aria-label="Təsərrüfat seçimi"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="text-sm text-slate-500">
        Sahə olmayan obyektlər: tikili, su xətti, anbar, təhlükə və yollar. Xəritədə göstərmək üçün
        koordinatı yazın və ya cari məkanınızı götürün.
      </p>
      <ErrorNote message={error} />

      {!open && (
        <button type="button" className="btn-primary" onClick={startAdd} disabled={!orgId}>
          <Plus className="h-4 w-4" /> Yer əlavə et
        </button>
      )}

      {open && (
        <form onSubmit={onSubmit} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">
              {editingId ? "Yeri redaktə et" : "Yeni yer"}
            </h2>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              aria-label="Bağla"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Ad" required>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Məsələn: Su nasosu"
              />
            </FormField>
            <FormField label="Növ" required>
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {isPointEdit ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Enlik (lat)" required>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="40.409200"
                  />
                </FormField>
                <FormField label="Uzunluq (lon)" required>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                    placeholder="49.867100"
                  />
                </FormField>
              </div>
              <button type="button" className="btn-secondary" onClick={useMyLocation}>
                <LocateFixed className="h-4 w-4" /> Cari məkanımı götür
              </button>
            </>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Bu yerin həndəsəsi xəritədə çəkilib ({GEOM_AZ[editingGeom?.type || ""] || "həndəsə"}) —
              burada yalnız ad, növ və qeyd dəyişir.
            </p>
          )}

          <FormField label="Qeyd">
            <textarea
              className="input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Əlavə məlumat"
            />
          </FormField>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Yaddaşa yazılır…" : editingId ? "Yadda saxla" : "Əlavə et"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Ləğv et
            </button>
          </div>
        </form>
      )}

      {places === null ? (
        <Spinner />
      ) : places.length === 0 ? (
        <Placeholder>Hələ yer əlavə edilməyib.</Placeholder>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.value} className="card">
              <div className="mb-3 flex items-center gap-2">
                <g.Icon className={`h-5 w-5 ${g.tone}`} aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-800">{g.label}</h2>
                <span className="text-sm text-slate-500">({g.items.length})</span>
              </div>
              <ul className="space-y-2">
                {g.items.map((f) => {
                  const c = firstCoord(f.geometry);
                  const gt = f.geometry?.type || "";
                  return (
                    <li
                      key={f.properties.id}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-xl border-[1.5px] border-slate-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900">
                          {f.properties.name}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          {GEOM_AZ[gt] || gt || "—"}
                          {c ? ` · ${c[1].toFixed(5)}, ${c[0].toFixed(5)}` : ""}
                        </p>
                        {f.properties.notes && (
                          <p className="truncate text-sm text-slate-600">{f.properties.notes}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                          onClick={() => startEdit(f)}
                          aria-label="Redaktə et"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                          onClick={() => void onDelete(f)}
                          disabled={busy}
                          aria-label="Sil"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
