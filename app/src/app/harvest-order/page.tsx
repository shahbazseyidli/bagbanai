"use client";

// A9 — Yığım sırası: təsərrüfatın sahələrini yığıma hazırlıq üzrə sıralayır. Kooperativlər üçün:
// "bu həftə hansı sahədən başlayaq". Sıralama yalnız real mövcud datadan qurulur — son NDVI, NDVI-nin
// dəyişməsi və planlaşdırılan yığım tarixi. Göstəricisi çatmayan sahə uydurma sıra ALMIR, ayrıca
// "sıralana bilmir" siyahısında səbəbi ilə göstərilir. Inline AZ copy (T18 extracts later).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, Info, ListOrdered, Satellite, Sprout } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote, Placeholder, Spinner } from "@/components/ui";
import type { Org } from "@/lib/types";

interface Signal {
  key: string;
  label: string;
  score: number;
  weight: number;
}

interface Row {
  field_id: string;
  name: string;
  area_ha: number | null;
  crop_type: string | null;
  rank: number | null;
  rankable: boolean;
  score: number | null;
  ndvi: number | null;
  ndvi_date: string | null;
  ndvi_prev: number | null;
  ndvi_delta: number | null;
  ndvi_gap_days: number | null;
  sensor: string | null;
  expected_harvest: string | null;
  days_to_harvest: number | null;
  season_year: number | null;
  season_status: string | null;
  harvested: boolean;
  reason: string;
  signals: Signal[];
  missing: string[];
}

interface HarvestOrder {
  org_id: string;
  generated_on: string;
  fields: Row[];
  unranked: Row[];
  counts: { total: number; ranked: number; unranked: number };
  basis: string;
  truncated: boolean;
}

function tone(score: number | null) {
  if (score == null) return { badge: "bg-slate-100 text-slate-600", bar: "bg-slate-300", text: "text-slate-600" };
  if (score >= 70) return { badge: "bg-emerald-600 text-white", bar: "bg-emerald-500", text: "text-emerald-700" };
  if (score >= 40) return { badge: "bg-amber-500 text-white", bar: "bg-amber-400", text: "text-amber-700" };
  return { badge: "bg-slate-200 text-slate-700", bar: "bg-slate-300", text: "text-slate-600" };
}

function harvestLabel(days: number | null): string | null {
  if (days == null) return null;
  if (days < 0) return `${Math.abs(days)} gün gecikib`;
  if (days === 0) return "bu gün";
  return `${days} gün qalıb`;
}

export default function HarvestOrderPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [data, setData] = useState<HarvestOrder | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }
    if (!user) return;
    api.get<Org[]>("/api/orgs").then((l) => { setOrgs(l); if (l[0]) setOrgId(l[0].id); }).catch((e) => setError(azError(e)));
  }, [user, loading, router]);

  useEffect(() => {
    if (!orgId) return;
    setData(null);
    setError("");
    api.get<HarvestOrder>(`/api/orgs/${orgId}/harvest-order`).then(setData).catch((e) => setError(azError(e)));
  }, [orgId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Yığım sırası</h1>
        {orgs.length > 1 && (
          <select className="input max-w-xs" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </div>
      <p className="text-sm text-slate-500">
        Sahələr yığıma hazırlıq üzrə sıralanır: son NDVI ölçüsü, NDVI-nin son həftələrdəki dəyişməsi və
        planlaşdırılan yığım tarixi. Bu təxmindir — yekun qərarı sahədə yoxlayaraq verin.
      </p>

      <ErrorNote message={error} />

      {data === null ? (
        !error && <Spinner label="Sahələr sıralanır…" />
      ) : data.counts.total === 0 ? (
        <div className="card">
          <Placeholder>
            Bu təsərrüfatda hələ sahə yoxdur. Əvvəlcə sahə əlavə edin — peyk məlumatı toplandıqca yığım
            sırası avtomatik hesablanacaq.
          </Placeholder>
          <button type="button" className="btn-primary mt-3" onClick={() => router.push("/fields")}>
            Sahələrə keç
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              {data.counts.ranked} sahə sıralandı, {data.counts.unranked} sahə üçün göstərici çatmadı.
              Hesablanma tarixi: {data.generated_on}.
              {data.truncated ? " Siyahı ilk 500 sahə ilə məhdudlaşdırılıb." : ""}
            </span>
          </div>

          {data.fields.length === 0 ? (
            <div className="card">
              <Placeholder>
                Heç bir sahəni sıralamaq üçün kifayət qədər göstərici yoxdur. Sahələrin planlaşdırılan
                yığım tarixini qeyd edin və ya peyk məlumatının toplanmasını gözləyin.
              </Placeholder>
            </div>
          ) : (
            <div className="space-y-2">
              {data.fields.map((r) => {
                // NOT named `t` on purpose — the T18 i18n sweep imports t() from @/lib/i18n here.
                const tn = tone(r.score);
                const hl = harvestLabel(r.days_to_harvest);
                return (
                  <button
                    key={r.field_id}
                    type="button"
                    onClick={() => router.push(`/fields/${r.field_id}?tab=harvest`)}
                    className="card flex w-full items-start gap-3 text-left hover:bg-slate-50"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${tn.badge}`}>
                      {r.rank}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-semibold text-slate-800">{r.name}</span>
                        {r.crop_type && <span className="text-xs text-slate-500">{r.crop_type}</span>}
                        {r.area_ha != null && <span className="text-xs text-slate-400">{r.area_ha.toFixed(2)} ha</span>}
                      </span>

                      <span className="mt-1 block text-sm leading-snug text-slate-600">{r.reason}</span>

                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        {r.ndvi != null && (
                          <span className="inline-flex items-center gap-1">
                            <Satellite className="h-3.5 w-3.5 text-slate-400" />
                            NDVI {r.ndvi.toFixed(2)}
                            {r.ndvi_delta != null && (
                              <span className={r.ndvi_delta < 0 ? "text-amber-600" : "text-emerald-600"}>
                                ({r.ndvi_delta > 0 ? "+" : ""}{r.ndvi_delta.toFixed(2)})
                              </span>
                            )}
                            {r.ndvi_date && <span className="text-slate-400">· {r.ndvi_date}</span>}
                            {r.sensor && <span className="text-slate-400">· {r.sensor}</span>}
                          </span>
                        )}
                        {hl && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                            Yığım: {hl}
                            {r.expected_harvest && <span className="text-slate-400">· {r.expected_harvest}</span>}
                          </span>
                        )}
                        {r.season_status && (
                          <span className="inline-flex items-center gap-1">
                            <Sprout className="h-3.5 w-3.5 text-slate-400" />
                            {r.season_status}
                          </span>
                        )}
                      </span>

                      {r.missing.length > 0 && (
                        <span className="mt-1 block text-[11px] text-slate-400">
                          Nəzərə alınmayıb: {r.missing.join(", ")} (məlumat yoxdur)
                        </span>
                      )}

                      <span className="mt-2 block h-1.5 rounded-full bg-slate-100">
                        <span
                          className={`block h-1.5 rounded-full ${tn.bar}`}
                          style={{ width: `${Math.max(0, Math.min(100, r.score ?? 0))}%` }}
                        />
                      </span>
                    </span>

                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                );
              })}
            </div>
          )}

          {data.unranked.length > 0 && (
            <div className="card">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ListOrdered className="h-4 w-4 text-slate-400" />
                Sıralana bilməyən sahələr ({data.unranked.length})
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Bu sahələrə sıra verilmir — uydurma yer əvəzinə çatışmayan məlumat göstərilir.
              </p>
              <ul className="mt-3 space-y-2">
                {data.unranked.map((r) => (
                  <li key={r.field_id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/fields/${r.field_id}?tab=season`)}
                      className="flex w-full items-start gap-2 rounded-lg border border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-700">
                          {r.name}
                          {r.crop_type && <span className="ml-2 text-xs font-normal text-slate-500">{r.crop_type}</span>}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-slate-500">{r.reason}</span>
                      </span>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] leading-snug text-slate-400">{data.basis}</p>
        </>
      )}
    </div>
  );
}
