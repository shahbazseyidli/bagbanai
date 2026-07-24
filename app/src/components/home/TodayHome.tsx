"use client";

// D2.2 — "Bu gün" home. The farmer-facing landing (verdict-before-data): a dated greeting, a
// one-line "how many fields need attention" summary, an attention strip of active risk/weather
// alerts, then one card PER FIELD carrying a plain-language health verdict + an irrigation hint.
// Everything is deterministic (reuses the İcmal insight engine) so it renders without the LLM.
// Ships behind ?ui=v2 (see lib/uiFlag) so it can be browser-tested before replacing the console-
// style dashboard for everyone.
//
// W2 mockup parity (artifact c5e155e7) — the screen now follows the approved layout:
//   weather bar (MOCK-app-today-weatherbar) → "Diqqət lazımdır" hero with the numeric score dot and
//   the inline peer suggestion (MOCK-app-today-attention) → "Sahələrim" card grid with score pills
//   (MOCK-app-today-fieldgrid) → "Bu günün işləri" checkable task list (MOCK-app-today-tasks).
// Every number on the screen is real: wellness scores come from the STORED read model
// (GET /api/orgs/{id}/wellness — one request per org, never a per-field computation), tasks from
// GET /api/tasks, weather from the field centroid via keyless Open-Meteo + the rain-nowcast
// endpoint. Missing data is omitted, never faked. The onboarding checklist, the desktop
// multi-field map, the PWA nudge and the org switcher all stay.
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, ChevronRight, AlertTriangle, OctagonAlert, Sprout,
} from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t, getLocale, type Locale } from "@/lib/i18n";
import { ErrorNote } from "@/components/ui";
import { ListSkeleton } from "@/components/Skeleton";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import TrialBanner from "@/components/TrialBanner";
import InstallPrompt from "@/components/InstallPrompt";
import FieldsOverviewMap, { type GeoField } from "@/components/FieldsOverviewMap";
import AttentionHero from "@/components/home/AttentionHero";
import FieldGrid from "@/components/home/FieldGrid";
import TodayTasks from "@/components/home/TodayTasks";
import WeatherBar from "@/components/home/WeatherBar";
import { bandOf, type FieldScore } from "@/components/home/ScoreBadge";
import { fetchFieldToday, type FieldToday } from "@/lib/today";
import type { Tone } from "@/lib/indexStatus";
import type { Farm, Field, Org } from "@/lib/types";

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
// Localized "weekday, day month" — manual AZ arrays (reliable), Intl for en/tr/de.
function formatToday(d: Date, locale: Locale): string {
  if (locale === "az") return azDate(d);
  try {
    const s = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return azDate(d);
  }
}

interface Notif {
  id: string;
  field_id: string | null;
  severity: string;
  title: string;
  body: string;
  read: boolean;
}

/** GET /api/fields/geo also returns the PostGIS centroid — used to place the weather bar. */
interface GeoFieldFull extends GeoField {
  centroid?: { type: string; coordinates: number[] } | null;
}

function pointOf(g: GeoFieldFull | undefined): { lat: number; lon: number } | null {
  if (!g) return null;
  const c = g.centroid?.coordinates;
  if (Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number") {
    return { lon: c[0], lat: c[1] };
  }
  // Fallback: the mean of the outer ring — good enough to ask "what is the weather over there".
  const ring = g.geom?.coordinates?.[0];
  if (Array.isArray(ring) && ring.length > 0) {
    let lon = 0;
    let lat = 0;
    let n = 0;
    for (const p of ring) {
      if (typeof p?.[0] === "number" && typeof p?.[1] === "number") { lon += p[0]; lat += p[1]; n += 1; }
    }
    if (n > 0) return { lon: lon / n, lat: lat / n };
  }
  return null;
}

/** A field is flagged when the stored score is not "good", the index verdict is not "good", or the
 *  water balance asks for irrigation. */
function needsAttention(ft: FieldToday, score?: FieldScore): boolean {
  if (score && bandOf(score) !== "good") return true;
  return (ft.verdict != null && ft.verdict.tone !== "good") || ft.waterReco != null;
}

const TONE_RANK: Record<Tone, number> = { bad: 0, warn: 1, good: 2 };

/** The single worst flagged field — the stored score decides when there is one, otherwise the
 *  deterministic verdict tone does. Returns null when nothing needs attention. */
function worstOf(resolved: FieldToday[], scores: Record<string, FieldScore>): FieldToday | null {
  const flagged = resolved.filter((ft) => needsAttention(ft, scores[ft.field.id]));
  if (flagged.length === 0) return null;
  const scored = flagged
    .filter((ft) => scores[ft.field.id] != null)
    .sort((a, b) => scores[a.field.id].score - scores[b.field.id].score);
  if (scored.length > 0 && bandOf(scores[scored[0].field.id]) !== "good") return scored[0];
  const byTone = [...flagged].sort(
    (a, b) => TONE_RANK[a.verdict?.tone ?? "good"] - TONE_RANK[b.verdict?.tone ?? "good"],
  );
  return byTone[0];
}

const SEV_ICON: Record<string, typeof AlertTriangle> = {
  critical: OctagonAlert,
  warning: AlertTriangle,
};

/** The mockup's .sectitle — one compact heading style for every block on this screen. */
function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-1 text-sm font-bold text-slate-600">{children}</h2>;
}

export default function TodayHome() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [fields, setFields] = useState<Field[] | null>(null);
  const [todays, setTodays] = useState<Record<string, FieldToday>>({});
  const [scores, setScores] = useState<Record<string, FieldScore>>({});
  const [geoFields, setGeoFields] = useState<GeoFieldFull[]>([]);
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

  // Load the selected org's fields (+ verdicts + wellness scores + geometry for the desktop map).
  useEffect(() => {
    if (!orgId) return;
    let active = true;
    setFields(null);
    setTodays({});
    setScores({});
    setGeoFields([]);
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
        const g = await api.get<{ fields: GeoFieldFull[] }>(`/api/fields/geo?org_id=${orgId}`);
        if (active) setGeoFields(g?.fields ?? []);
      } catch { /* map + weather placement are a bonus */ }
      try {
        // A3 read model: ONE org-wide request for every score on the screen (never per field, never
        // an on-demand computation). A field with no stored row simply gets no number.
        const w = await api.get<{ fields: FieldScore[] }>(`/api/orgs/${orgId}/wellness`);
        if (active) {
          const map: Record<string, FieldScore> = {};
          for (const s of w?.fields ?? []) {
            if (s && s.field_id && typeof s.score === "number") map[s.field_id] = s;
          }
          setScores(map);
        }
      } catch { /* scores are optional garnish */ }
    })();
    return () => { active = false; };
  }, [orgId]);

  if (loading || fields === null) return <ListSkeleton count={4} />;

  const resolved = fields.map((f) => todays[f.id]).filter((x): x is FieldToday => x != null);
  const attn = resolved.filter((ft) => needsAttention(ft, scores[ft.field.id])).length;
  const hasReady = resolved.some((x) => x.status === "ready" || x.status === "partial");
  const today = new Date();
  const locale = getLocale();
  const worst = worstOf(resolved, scores);

  // Weather bar placement: the field that needs attention, else the first field we have a point for.
  const geoById: Record<string, GeoFieldFull> = {};
  for (const g of geoFields) geoById[g.id] = g;
  const weatherField =
    (worst && pointOf(geoById[worst.field.id]) ? worst.field : null) ??
    fields.find((f) => pointOf(geoById[f.id]) != null) ??
    null;
  const weatherPoint = weatherField ? pointOf(geoById[weatherField.id]) : null;

  const fieldNames: Record<string, string> = {};
  for (const f of fields) fieldNames[f.id] = f.name;

  const greeting = user?.full_name ? `Salam, ${user.full_name.split(" ")[0]}` : null;

  return (
    <div className="space-y-5">
      {/* Dated greeting + one-line status roll-up */}
      <div>
        <p className="text-sm font-medium text-slate-500">{formatToday(today, locale)}</p>
        <h1 className="mt-0.5 text-2xl font-bold text-slate-900">{t("today.title")}</h1>
        {fields.length > 0 && (
          <p className="mt-1 text-sm text-slate-600">
            {greeting ? `${greeting} — ` : ""}
            {fields.length} {t("today.fieldsWord")}
            {resolved.length > 0 && (
              <>
                {" · "}
                {attn > 0 ? (
                  <span className="font-bold text-warn">{attn} {t("today.needAttention")}</span>
                ) : (
                  <span className="font-bold text-good">{t("today.allGood")}</span>
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
            aria-label={t("today.org")}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
      </div>

      <ErrorNote message={error} />

      {/* D3.6 — activation checklist (hides itself once complete) */}
      {orgId && <TrialBanner orgId={orgId} />}
      <OnboardingChecklist />

      {/* D3.5 — PWA install nudge at a value moment (satellite data ready) */}
      <InstallPrompt show={hasReady} />

      {/* MOCK-app-today-weatherbar — live conditions over the field that matters most today. */}
      {weatherField && weatherPoint && (
        <WeatherBar
          lat={weatherPoint.lat}
          lon={weatherPoint.lon}
          placeLabel={weatherField.name}
          fieldId={weatherField.id}
        />
      )}

      {/* MOCK-app-today-attention — the hero for the single worst field. */}
      {worst && (
        <section>
          <SectionTitle>Diqqət lazımdır</SectionTitle>
          <AttentionHero ft={worst} score={scores[worst.field.id]} />
        </section>
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

      {/* D4.3 — desktop agronomist workspace: all fields on one map (click a polygon to open). */}
      {geoFields.length >= 1 && (
        <section className="hidden md:block">
          <SectionTitle>{t("today.fieldsOnMap")}</SectionTitle>
          <div className="h-[380px]">
            {/* Pass the scores we already loaded so the map does not repeat the same org-wide
                request; it repaints itself when they land. */}
            <FieldsOverviewMap fields={geoFields} heightClass="h-full" scores={scores} />
          </div>
        </section>
      )}

      {/* MOCK-app-today-fieldgrid — "Sahələrim" */}
      {fields.length === 0 ? (
        <div className="card text-center">
          <Sprout className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="mt-2 text-slate-700">{t("today.noFields")}</p>
          <Link href="/onboarding" className="btn-primary mt-3 inline-flex">
            <Plus className="h-4 w-4" /> {t("today.addFirst")}
          </Link>
        </div>
      ) : (
        <section>
          <div className="mb-2 mt-1 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-600">Sahələrim</h2>
            <Link href="/onboarding" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
              <Plus className="h-4 w-4" /> {t("common.add")}
            </Link>
          </div>
          <FieldGrid fields={fields} todays={todays} scores={scores} />
        </section>
      )}

      {/* MOCK-app-today-tasks — "Bu günün işləri" */}
      {orgId && fields.length > 0 && (
        <section>
          <SectionTitle>Bu günün işləri</SectionTitle>
          <TodayTasks orgId={orgId} fieldNames={fieldNames} />
        </section>
      )}
    </div>
  );
}
