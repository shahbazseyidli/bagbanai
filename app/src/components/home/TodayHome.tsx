"use client";

// D2.2 — "Bu gün" home. The farmer-facing landing (verdict-before-data): a dated greeting, a
// one-line "how many fields need attention" summary, an attention strip of active risk/weather
// alerts, then one card PER FIELD carrying a plain-language health verdict + an irrigation hint.
// Everything is deterministic (reuses the İcmal insight engine) so it renders without the LLM.
// Ships behind ?ui=v2 (see lib/uiFlag) so it can be browser-tested before replacing the console-
// style dashboard for everyone.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, MapPin, Droplets, ChevronRight, AlertTriangle, OctagonAlert, Sprout, Loader2,
} from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote } from "@/components/ui";
import { ListSkeleton } from "@/components/Skeleton";
import StatusChip from "@/components/StatusChip";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import InstallPrompt from "@/components/InstallPrompt";
import FieldsOverviewMap, { type GeoField } from "@/components/FieldsOverviewMap";
import { fetchFieldToday, type FieldToday } from "@/lib/today";
import type { Tone } from "@/lib/indexStatus";
import type { Farm, Field, Org } from "@/lib/types";

const TONE_WORD: Record<Tone, string> = { good: "Sağlam", warn: "Diqqət", bad: "Zəif" };

const AZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr",
];
const AZ_WEEKDAYS = [
  "bazar", "bazar ertəsi", "çərşənbə axşamı", "çərşənbə", "cümə axşamı", "cümə", "şənbə",
];
function azDate(d: Date): string {
  const s = `${AZ_WEEKDAYS[d.getDay()]}, ${d.getDate()} ${AZ_MONTHS[d.getMonth()]}`;
  return s.charAt(0).toLocaleUpperCase("az") + s.slice(1);
}

interface Notif {
  id: string;
  field_id: string | null;
  severity: string;
  title: string;
  body: string;
  read: boolean;
}

function needsAttention(t: FieldToday): boolean {
  return (t.verdict != null && t.verdict.tone !== "good") || t.waterReco != null;
}

function FieldCard({ t }: { t: FieldToday }) {
  const f = t.field;
  const preparing = t.status === "queued" || t.status === "processing";
  const v = t.verdict;
  return (
    <Link
      href={`/fields/${f.id}`}
      className="flex items-stretch gap-3 rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 hover:border-emerald-300"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <p className="truncate text-base font-bold text-slate-900">{f.name}</p>
          <span className="shrink-0 text-sm text-slate-500">
            {f.area_ha != null ? `${f.area_ha.toFixed(2)} ha` : ""}
          </span>
        </div>

        {preparing ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" aria-hidden="true" />
            Peyk məlumatı hazırlanır…
          </p>
        ) : v ? (
          <p className="mt-1.5 text-sm text-slate-700">{v.title}</p>
        ) : (
          <p className="mt-1.5 text-sm text-slate-500">
            Hələ peyk təhlili yoxdur — məlumat gələn kimi burada görünəcək.
          </p>
        )}

        {t.waterReco != null && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-warn-tint px-2.5 py-1 text-xs font-bold text-warn">
            <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
            Suvarma tövsiyə olunur (~{Math.round(t.waterReco)} mm)
          </p>
        )}
      </div>

      <div className="flex flex-col items-end justify-between">
        {v && !preparing ? (
          <StatusChip tone={v.tone} label={TONE_WORD[v.tone]} />
        ) : (
          <span />
        )}
        <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>
    </Link>
  );
}

const SEV_ICON: Record<string, typeof AlertTriangle> = {
  critical: OctagonAlert,
  warning: AlertTriangle,
};

export default function TodayHome() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [fields, setFields] = useState<Field[] | null>(null);
  const [todays, setTodays] = useState<Record<string, FieldToday>>({});
  const [geoFields, setGeoFields] = useState<GeoField[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [alerts, setAlerts] = useState<Notif[]>([]);
  const [error, setError] = useState("");

  // Resolve the org list once + the high-severity alerts.
  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const list = await api.get<Org[]>("/api/orgs");
        if (!active) return;
        if (list.length === 0) { router.replace("/onboarding"); return; }
        setOrgs(list);
        setOrgId((cur) => cur || list[0].id);
      } catch (err) {
        if (active) { setError(azError(err)); setFields([]); }
      }
      try {
        const r = await api.get<{ notifications: Notif[] }>("/api/notifications");
        if (active) {
          setAlerts(
            (r?.notifications ?? [])
              .filter((n) => !n.read && (n.severity === "critical" || n.severity === "warning"))
              .slice(0, 4),
          );
        }
      } catch { /* best-effort */ }
    })();
    return () => { active = false; };
  }, [loading, user, router]);

  // Load the selected org's fields (+ verdicts + geometry for the desktop map).
  useEffect(() => {
    if (!orgId) return;
    let active = true;
    setFields(null);
    setTodays({});
    (async () => {
      try {
        const farms = await api.get<Farm[]>(`/api/farms?org_id=${orgId}`);
        const lists = await Promise.all(
          farms.map((f) => api.get<Field[]>(`/api/fields?farm_id=${f.id}`).catch(() => [])),
        );
        const flat = lists.flat();
        if (!active) return;
        setFields(flat);
        flat.forEach((f) => {
          fetchFieldToday(f).then((t) => { if (active) setTodays((prev) => ({ ...prev, [f.id]: t })); });
        });
      } catch (err) {
        if (active) { setError(azError(err)); setFields([]); }
      }
      try {
        const g = await api.get<{ fields: GeoField[] }>(`/api/fields/geo?org_id=${orgId}`);
        if (active) setGeoFields(g?.fields ?? []);
      } catch { /* map is a desktop bonus */ }
    })();
    return () => { active = false; };
  }, [orgId]);

  if (loading || fields === null) return <ListSkeleton count={4} />;

  const resolved = fields.map((f) => todays[f.id]).filter((t): t is FieldToday => t != null);
  const attn = resolved.filter(needsAttention).length;
  const hasReady = resolved.some((t) => t.status === "ready" || t.status === "partial");
  const today = new Date();

  return (
    <div className="space-y-5">
      {/* Dated greeting + one-line status roll-up */}
      <div>
        <p className="text-sm font-medium text-slate-500">{azDate(today)}</p>
        <h1 className="mt-0.5 text-2xl font-bold text-slate-900">Bu gün</h1>
        {fields.length > 0 && (
          <p className="mt-1 text-sm text-slate-600">
            {fields.length} sahə
            {resolved.length > 0 && (
              <>
                {" · "}
                {attn > 0 ? (
                  <span className="font-bold text-warn">{attn} diqqət tələb edir</span>
                ) : (
                  <span className="font-bold text-good">hamısı qaydasındadır</span>
                )}
              </>
            )}
          </p>
        )}
        {/* D4.3 — org switcher for agronomists managing more than one organization */}
        {orgs.length > 1 && (
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="input mt-3 max-w-xs"
            aria-label="Təşkilat"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
      </div>

      <ErrorNote message={error} />

      {/* D3.6 — activation checklist (hides itself once complete) */}
      <OnboardingChecklist />

      {/* D3.5 — PWA install nudge at a value moment (satellite data ready) */}
      <InstallPrompt show={hasReady} />

      {/* D4.3 — desktop agronomist workspace: all fields on one map (click a polygon to open). */}
      {geoFields.length > 1 && (
        <div className="hidden md:block">
          <h2 className="mb-2 text-base font-bold text-slate-800">Bütün sahələr xəritədə</h2>
          <div className="h-[380px]">
            <FieldsOverviewMap fields={geoFields} heightClass="h-full" />
          </div>
        </div>
      )}

      {/* Attention strip — active alerts, each deep-links to its field */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((n) => {
            const Icon = SEV_ICON[n.severity] ?? AlertTriangle;
            const tint = n.severity === "critical" ? "bg-bad-tint text-bad" : "bg-warn-tint text-warn";
            const inner = (
              <div className="flex items-start gap-3 rounded-2xl border-[1.5px] border-slate-300 bg-white px-4 py-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tint}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{n.body}</p>
                </div>
                {n.field_id && <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />}
              </div>
            );
            return n.field_id ? (
              <Link key={n.id} href={`/fields/${n.field_id}`}>{inner}</Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}

      {/* Field feed */}
      {fields.length === 0 ? (
        <div className="card text-center">
          <Sprout className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="mt-2 text-slate-700">Hələ sahəniz yoxdur.</p>
          <Link href="/onboarding" className="btn-primary mt-3 inline-flex">
            <Plus className="h-4 w-4" /> İlk sahənizi əlavə edin
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Sahələrim</h2>
            <Link href="/onboarding" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
              <Plus className="h-4 w-4" /> Əlavə et
            </Link>
          </div>
          {fields.map((f) =>
            todays[f.id] ? (
              <FieldCard key={f.id} t={todays[f.id]} />
            ) : (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-2xl border-[1.5px] border-slate-200 bg-white p-4"
              >
                <MapPin className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="truncate text-base font-bold text-slate-900">{f.name}</span>
                <Loader2 className="ml-auto h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
