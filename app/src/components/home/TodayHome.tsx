"use client";

// D2.2 — "Bu gün" home. The farmer-facing landing (verdict-before-data): a dated greeting, a
// one-line "how many fields need attention" summary, an attention strip of active risk/weather
// alerts, then one card PER FIELD carrying a plain-language health verdict + an irrigation hint.
// Everything is deterministic (reuses the İcmal insight engine) so it renders without the LLM.
//
// W2 — on a WIDE stage the same material is re-laid-out as an instrument panel: a four-tile stat
// header (TodayStats), the multi-field map promoted to a primary object with the attention hero and
// the alerts as a rail beside it (TodayInstrument), then "Sahələrim". Narrow stays the stacked
// screen below, unchanged.
//
// THIS IS THE DEFAULT HOME for every signed-in farmer. app/src/app/page.tsx renders
// `v2 ? <TodayHome/> : <Dashboard/>`, and useUiV2 (lib/uiFlag.ts) is ON unless localStorage holds
// the sticky "v1" that only `?ui=v1` writes. So the ternary is an ESCAPE HATCH, not a rollout gate:
// changes here are user-facing the moment they deploy. The old console Dashboard is still reachable
// at ?ui=v1, which is why page.tsx caps its width itself — "/" is a wide stage now.
//
// The branch is chosen from a MEASURED stage width, never a breakpoint: AppShell's content stage is
// the viewport minus the 78px rail minus a field list that only appears at xl, which makes the
// stage NARROWER at xl (~778px) than at lg (~894px). No media query can express that inversion —
// this is the same reason FieldWorkbench measures (see workbench/useStageWidth).
//
// Every number on the screen is real: wellness scores come from the STORED read model
// (GET /api/orgs/{id}/wellness — one request per org, never a per-field computation), weather from
// the field centroid via keyless Open-Meteo + the rain-nowcast endpoint. Missing data is omitted,
// never faked. The onboarding checklist, the PWA nudge and the org switcher all stay.
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Sprout } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t, tp, getLocale, type Locale } from "@/lib/i18n";
import { ErrorNote } from "@/components/ui";
import { ListSkeleton } from "@/components/Skeleton";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import TrialBanner from "@/components/TrialBanner";
import InstallPrompt from "@/components/InstallPrompt";
import FieldsOverviewMap, { type GeoField } from "@/components/FieldsOverviewMap";
import AttentionHero from "@/components/home/AttentionHero";
import FieldGrid from "@/components/home/FieldGrid";
import AlertList, { type TodayAlert } from "@/components/home/AlertList";
import TodayInstrument from "@/components/home/TodayInstrument";
import TodayStats, { type AlertSummary } from "@/components/home/TodayStats";
import WeatherBar from "@/components/home/WeatherBar";
import { bandOf, type FieldScore } from "@/components/home/ScoreBadge";
import { useStageWidth } from "@/components/field/workbench/useStageWidth";
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

/**
 * The stage width at which the instrument layout turns on. Same floor as FieldWorkbench, so a 778px
 * xl stage qualifies for both.
 *
 * It cannot reach a phone: below `md` there is no rail and no field list, which caps the stage at
 * roughly vw - 32 (≤ 736px). The only sub-`lg` viewports that clear this are ~890px landscape
 * tablets, which already run the full desktop shell (AppRail is md:flex, BottomNav is md:hidden).
 */
const WIDE_MIN = 760;

/**
 * The reading column for everything on this screen that is ONE column of cards.
 *
 * AppShell used to bound "/" at max-w-[1040px] (its DOC_STAGE) and that cap is what kept the field
 * cards card-shaped. "/" now takes the full-bleed stage so the instrument row can actually reach its
 * ≥1280 tier, which means the cap has to be re-applied HERE, per block, instead of once out there:
 * the stat row and the map+rail row want all ~1400px, a stack of single cards and a 3-up card grid
 * do not — stretched to 1400 they become the giant-card failure this number exists to prevent.
 *
 * 1040 is deliberately the shell's own number, so nothing on this page is wider than it was before.
 * A COMPLETE class literal, never assembled: Tailwind's scanner cannot see a fragment.
 *
 * It is applied INSIDE the measured stage, never to the element carrying `stageRef` — the branch
 * between the stacked and the instrument layout is decided from the OUTER stage width, and capping
 * the measured node would feed the decision its own answer and pin the screen at the narrow layout.
 */
const READ_COL = "w-full max-w-[1040px]";

/**
 * The size of the response GET /api/notifications will not exceed.
 *
 * services/app/routers/advice.py::list_notifications reads `order by created_at desc limit 60` from
 * SQL, runs the per-user notification matrix over those 60 rows, then slices the survivors to 30.
 * A 30-row response therefore means the count we can show is a floor, not a total — TodayStats
 * renders it as "30+".
 *
 * The 60-row SQL cut is the REAL ceiling and it is invisible from here. When the matrix filters
 * heavily (a farmer who muted weather during a stormy week), the endpoint can return 12 rows out of
 * 60 read: `capped` is false, the tile prints an exact-looking "12", and unread criticals older than
 * those 60 rows were never sent to the browser at all. Knowing the true total needs a count endpoint
 * the API does not have — deliberately out of scope — so read this number as "at least this many",
 * and do NOT add UI that presents it as a complete tally.
 */
const NOTIF_LIMIT = 30;

/** The alert row as the API sends it. `read` is the one field the strip itself does not render, so
 *  it lives here rather than in AlertList's display type. */
type NotifRow = TodayAlert & { read?: boolean };

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
  // null, not [], until the request resolves — and it stays null when the request FAILS, so the
  // stats tile can render a dash and say why instead of publishing a confident "0 alerts".
  const [alertsAll, setAlertsAll] = useState<TodayAlert[] | null>(null);
  const [alertsCapped, setAlertsCapped] = useState(false);
  const [error, setError] = useState("");
  const [stageRef, stageW] = useStageWidth();

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
        const r = await api.get<{ notifications: NotifRow[] }>("/api/notifications");
        if (active) {
          const rows = r?.notifications ?? [];
          // Measured on the RAW response, before our own unread/severity filter: the ceiling
          // belongs to the endpoint, and whether a row was already read has nothing to do with
          // whether rows were cut off. The two are genuinely independent — 30 read rows and zero
          // unread ones set this true with a total of 0, which is why TodayStats suppresses the
          // "+" at zero instead of rendering the nonsense string "0+".
          setAlertsCapped(rows.length >= NOTIF_LIMIT);
          // Stored WHOLE — the stat tile needs the true count, the strips slice at render.
          setAlertsAll(
            rows.filter((n) => !n.read && (n.severity === "critical" || n.severity === "warning")),
          );
        }
      } catch { /* best-effort — alertsAll stays null, which the tile reports honestly */ }
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

  // The skeleton also covers "not measured yet". Guessing the branch for one frame would construct
  // a MapLibre map and tear it straight back down again; the callback ref measures synchronously on
  // attach (see useStageWidth), so this costs at most one non-painted frame — and the ref sits on
  // the same <div> in both returns, so React reuses the node and never re-runs the measurement.
  if (loading || fields === null || stageW == null) {
    return (
      <div ref={stageRef}>
        <ListSkeleton count={4} />
      </div>
    );
  }

  const wide = stageW >= WIDE_MIN;

  const resolved = fields.map((f) => todays[f.id]).filter((x): x is FieldToday => x != null);
  const attn = resolved.filter((ft) => needsAttention(ft, scores[ft.field.id])).length;
  // How many fields we can actually SAY something about — not how many requests came back.
  // fetchFieldToday catches each of its three requests (lib/today.ts), so a field whose /insights
  // 404s still resolves, with verdict null. It then fails needsAttention (nothing to flag) AND
  // counts as resolved, so an all-clear built on `resolved.length` would announce "everything is
  // fine" over a field nobody could evaluate. A stored wellness score also counts as evaluated:
  // it comes from a different endpoint, so one of the two failing still leaves us with a verdict.
  const evaluated = resolved.filter(
    (ft) => ft.verdict != null || scores[ft.field.id] != null,
  ).length;
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

  // The strips show a slice; the tile counts the whole list. Both read the one stored array.
  const shownAlerts = alertsAll ? alertsAll.slice(0, wide ? 3 : 4) : [];
  const alertsMore = (alertsAll?.length ?? 0) - shownAlerts.length;
  const alertSummary: AlertSummary | null =
    alertsAll == null
      ? null
      : {
          total: alertsAll.length,
          critical: alertsAll.filter((n) => n.severity === "critical").length,
          capped: alertsCapped,
        };

  const greeting = user?.full_name ? `${t("app.home.todayHome.greeting")}${user.full_name.split(" ")[0]}` : null;

  const orgSwitcher =
    orgs.length > 1 ? (
      <select
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        className={wide ? "input max-w-[220px]" : "input mt-3 max-w-xs"}
        aria-label={t("today.org")}
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    ) : null;

  return (
    <div ref={stageRef} className="space-y-5">
      {wide ? (
        // The roll-up sentence is dropped here on purpose: the stat tiles below say the same thing
        // with more precision, and saying it twice is noise.
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{formatToday(today, locale)}</p>
            <h1 className="mt-0.5 text-2xl font-bold text-slate-900">{t("today.title")}</h1>
            {greeting && <p className="mt-1 truncate text-sm text-slate-600">{greeting}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* D4.3 — org switcher for agronomists managing more than one organization */}
            {orgSwitcher}
            <Link href="/onboarding" className="btn-primary whitespace-nowrap">
              <Plus className="h-4 w-4" /> {t("bnav.addField")}
            </Link>
          </div>
        </div>
      ) : (
        /* Dated greeting + one-line status roll-up */
        <div>
          <p className="text-sm font-medium text-slate-500">{formatToday(today, locale)}</p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900">{t("today.title")}</h1>
          {fields.length > 0 && (
            <p className="mt-1 text-sm text-slate-600">
              {greeting ? `${greeting} — ` : ""}
              {fields.length} {tp("app.plural.fields", fields.length)}
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
          {orgSwitcher}
        </div>
      )}

      {/* The notice stack is also one column of cards, so it takes the reading column too — a
          six-row checklist stretched across a 1400px stage is the same failure as a giant field
          card. `empty:hidden` is load-bearing: all four of these self-hide (no error, no trial,
          checklist complete, PWA already installed), and without it the leftover wrapper would
          still collect a space-y-5 gap and open a phantom 20px hole in the steady state. */}
      <div className={`${READ_COL} space-y-5 empty:hidden`}>
        <ErrorNote message={error} />

        {/* D3.6 — activation checklist (hides itself once complete) */}
        {orgId && <TrialBanner orgId={orgId} />}
        <OnboardingChecklist />

        {/* D3.5 — PWA install nudge at a value moment (satellite data ready) */}
        <InstallPrompt show={hasReady} />
      </div>

      {wide ? (
        // Four dashes over an empty map is not a control room, it is a broken one: with no fields
        // the screen goes straight to the empty card below.
        fields.length > 0 && (
          <>
            <TodayStats
              fields={fields}
              scores={scores}
              alerts={alertSummary}
              attn={attn}
              evaluatedCount={evaluated}
            />
            <TodayInstrument
              geoFields={geoFields}
              scores={scores}
              stageW={stageW}
              weather={
                weatherField && weatherPoint
                  ? {
                      lat: weatherPoint.lat,
                      lon: weatherPoint.lon,
                      label: weatherField.name,
                      fieldId: weatherField.id,
                    }
                  : null
              }
              worst={worst}
              worstScore={worst ? scores[worst.field.id] : undefined}
              alerts={shownAlerts}
              alertsMore={alertsMore}
            />
          </>
        )
      ) : (
        /* One column of stacked cards — capped at the reading column so it cannot inherit the
           full-bleed stage. `space-y-5` moves onto this wrapper because it is now a single child of
           the parent stack, which keeps the gaps between these blocks exactly what they were, and
           `empty:hidden` covers the case where every block inside declines to render (no weather
           point, nothing flagged, no unread alert, no geometry) so no phantom gap appears. */
        <div className={`${READ_COL} space-y-5 empty:hidden`}>
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
              <SectionTitle>{t("app.home.todayHome.attentionNeeded")}</SectionTitle>
              <AttentionHero ft={worst} score={scores[worst.field.id]} />
            </section>
          )}

          {/* Attention strip — active alerts, each deep-links to its field */}
          <AlertList alerts={shownAlerts} />

          {/* D4.3 — desktop agronomist workspace: all fields on one map (click a polygon to open).
              Gated on real geometry, not on a non-empty array: a basemap with nothing drawn on it
              looks like a map of your farm and is a map of nothing. */}
          {geoFields.some((g) => g?.geom != null) && (
            <section className="hidden md:block">
              <SectionTitle>{t("today.fieldsOnMap")}</SectionTitle>
              <div className="h-[380px]">
                {/* Pass the scores we already loaded so the map does not repeat the same org-wide
                    request; it repaints itself when they land. */}
                <FieldsOverviewMap fields={geoFields} heightClass="h-full" scores={scores} />
              </div>
            </section>
          )}
        </div>
      )}

      {/* MOCK-app-today-fieldgrid — "Sahələrim". READ_COL on both arms: the 3-up grid is the block
          the full-bleed stage damages most (three cards across 1400px are billboards, not cards),
          and a lone empty-state card stretched that wide reads as a broken panel. */}
      {fields.length === 0 ? (
        <div className={`card ${READ_COL} text-center`}>
          <Sprout className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="mt-2 text-slate-700">{t("today.noFields")}</p>
          <Link href="/onboarding" className="btn-primary mt-3 inline-flex">
            <Plus className="h-4 w-4" /> {t("today.addFirst")}
          </Link>
        </div>
      ) : (
        <section className={READ_COL}>
          <div className="mb-2 mt-1 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-600">{t("app.home.todayHome.myFields")}</h2>
            {/* One add affordance per screen: the wide header already carries the primary button. */}
            {!wide && (
              // The hit area is grown to the 48px floor with a pseudo-element rather than padding:
              // an inline link beside a heading has to keep its 20px visual box or the row's rhythm
              // shifts, but at 20px it was the smallest tappable thing on the phone home.
              <Link
                href="/onboarding"
                className="relative inline-flex items-center gap-1 text-sm font-bold text-emerald-700 after:absolute after:inset-x-[-8px] after:-inset-y-3.5 after:content-['']"
              >
                <Plus className="h-4 w-4" /> {t("common.add")}
              </Link>
            )}
          </div>
          <FieldGrid fields={fields} todays={todays} scores={scores} />
        </section>
      )}
    </div>
  );
}
