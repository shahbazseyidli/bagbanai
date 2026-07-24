"use client";

// D2.1 / OneSoil-form — Sahələr as a MAP-FIRST screen: a tall multi-field map is the hero, the field
// list sits beside it (desktop two-column) or below it (mobile stack). Multi-select checkboxes, the
// bulk-actions bar and the per-row wellness score chips are all preserved from the flat-list version.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, Plus } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { SupportCard } from "@/components/ui/SupportCard";
import { ListSkeleton } from "@/components/Skeleton";
import BulkActions from "@/components/BulkActions";
import FieldsOverviewMap, { type GeoField } from "@/components/FieldsOverviewMap";
import type { Tone } from "@/lib/indexStatus";
import type { Farm, Field, Org } from "@/lib/types";

// A3 — the 0-100 wellness score as a compact row chip. Read model only: ONE org-wide request
// (/api/orgs/{id}/wellness) returns the latest STORED score per field, so the list never pays for a
// computation. A field with no stored score renders no chip at all — never a placeholder number.
interface FieldScore {
  field_id: string;
  score: number;
  tone: Tone | null;
  headline: string | null;
  computed_on: string | null;
  stale: boolean;
}

const CHIP: Record<Tone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  bad: "border-red-200 bg-red-50 text-red-700",
};

// Trust the server's tone, but derive it from the same cut-offs (wellness.py _GOOD_MIN/_WARN_MIN)
// if an old row ever arrives without one.
function bandOf(s: FieldScore): Tone {
  if (s.tone === "good" || s.tone === "warn" || s.tone === "bad") return s.tone;
  return s.score >= 70 ? "good" : s.score >= 45 ? "warn" : "bad";
}

function ScoreChip({ s }: { s: FieldScore }) {
  const band = bandOf(s);
  const tip = [s.headline, s.computed_on ? `Hesablanma: ${s.computed_on}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <span
      title={tip || undefined}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-sm font-bold tabular-nums ${CHIP[band]} ${
        s.stale ? "opacity-70" : ""
      }`}
    >
      <span className="sr-only">Sağlamlıq balı: </span>
      {s.score}
      <span className="text-[10px] font-normal opacity-70">/100</span>
    </span>
  );
}

export default function FieldsListPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [fields, setFields] = useState<Field[] | null>(null);
  const [error, setError] = useState("");
  // B14 — multi-select drives the bulk task/operation bar.
  const [orgId, setOrgId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  // A3 — field_id → latest stored wellness score (may stay empty; the chips are optional garnish).
  const [scores, setScores] = useState<Record<string, FieldScore>>({});
  // Map hero — the org's field geometries (name + area + data_status + geom in one call). Best-effort:
  // if it fails the list still stands on its own.
  const [geoFields, setGeoFields] = useState<GeoField[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    (async () => {
      try {
        const orgs = await api.get<Org[]>("/api/orgs");
        if (orgs.length === 0) {
          router.replace("/onboarding");
          return;
        }
        setOrgId(orgs[0].id);
        const farms = await api.get<Farm[]>(`/api/farms?org_id=${orgs[0].id}`);
        const lists = await Promise.all(
          farms.map((f) => api.get<Field[]>(`/api/fields?farm_id=${f.id}`).catch(() => [])),
        );
        const flat = lists.flat();
        setFields(flat);
        if (flat.length > 0) {
          // Map geometry for the hero — one org-wide read (never per field). A bonus over the list.
          try {
            const g = await api.get<{ fields: GeoField[] }>(`/api/fields/geo?org_id=${orgs[0].id}`);
            setGeoFields(g?.fields ?? []);
          } catch {
            /* the map is a garnish — the list stands on its own */
          }
          // A3 — one org-wide read for every chip (never one request per field). Best-effort: a
          // failure just means no chips, never a broken list.
          try {
            const w = await api.get<{ fields: FieldScore[] }>(`/api/orgs/${orgs[0].id}/wellness`);
            const map: Record<string, FieldScore> = {};
            for (const s of w?.fields ?? []) {
              if (s && s.field_id && typeof s.score === "number") map[s.field_id] = s;
            }
            setScores(map);
          } catch {
            /* score chips are optional — the list stands on its own */
          }
        }
      } catch (err) {
        setError(azError(err));
        setFields([]);
      }
    })();
  }, [loading, user, router]);

  if (loading || fields === null) return <ListSkeleton count={4} />;

  const totalHa = fields.reduce((sum, f) => sum + (f.area_ha ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-teal">Sahələr</h1>
          {fields.length > 0 && (
            <p className="mt-0.5 text-sm text-ink-soft">
              {fields.length} sahə · {totalHa.toFixed(2)} ha
            </p>
          )}
        </div>
        <Link href="/onboarding" className="btn-primary">
          <Plus className="h-4 w-4" /> Sahə əlavə et
        </Link>
      </div>
      <ErrorNote message={error} />

      {fields.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Sahələrinizi əlavə edin"
          body="Peyk monitorinqi, hava proqnozu və AI aqronom məsləhəti üçün ilk sahənizi xəritədə çəkin — bir neçə dəqiqə çəkir."
          action={{ label: "Sahə əlavə et", href: "/onboarding", icon: Plus }}
        >
          <SupportCard />
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          {/* Map hero — dominant, tall, beside the list on wide screens. NOT position:sticky:
              a WebGL canvas inside a sticky layer isn't composited until a window resize forces
              it, which left the map blank on first paint. A plain tall column renders correctly. */}
          <FieldsOverviewMap
            fields={geoFields}
            scores={scores}
            heightClass="h-[48vh] min-h-[320px] lg:h-[70vh] lg:min-h-[520px]"
          />

          {/* Field list — beside the map (desktop) / below it (mobile). */}
          <div className="space-y-3">
            <ul className="space-y-2">
              {fields.map((f) => {
                const s = scores[f.id];
                return (
                  <li key={f.id} className="flex items-center gap-2">
                    <label className="flex h-11 w-11 shrink-0 items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-emerald-600"
                        checked={selected.includes(f.id)}
                        aria-label={`${f.name} seç`}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked ? [...prev, f.id] : prev.filter((x) => x !== f.id),
                          )
                        }
                      />
                    </label>
                    <Link
                      href={`/fields/${f.id}`}
                      className="flex min-h-14 flex-1 items-center justify-between gap-3 rounded-xl2 border border-line bg-white px-4 py-3 transition hover:border-grass hover:shadow-soft"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-ink">{f.name}</p>
                        <p className="text-sm text-ink-soft">
                          {f.area_ha != null ? `${f.area_ha.toFixed(2)} ha` : "—"}
                        </p>
                      </div>
                      {s && <ScoreChip s={s} />}
                      <ChevronLeft
                        className="h-5 w-5 shrink-0 rotate-180 text-slate-400"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* OneSoil-style "request a free call" support card, pinned under the list. */}
            <SupportCard />
          </div>
        </div>
      )}

      {orgId && selected.length > 0 && (
        <BulkActions orgId={orgId} fieldIds={selected} onDone={() => setSelected([])} />
      )}
    </div>
  );
}
