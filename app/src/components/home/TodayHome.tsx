"use client";

// D2.2 — "Bu gün" home. The farmer-facing landing (verdict-before-data): a dated greeting, a
// one-line "how many fields need attention" summary, an attention strip of active risk/weather
// alerts, then one card PER FIELD carrying a plain-language health verdict + an irrigation hint.
// Everything is deterministic (reuses the İcmal insight engine) so it renders without the LLM.
//
// On a WIDE stage the same material is re-laid-out as a dashboard: an EIGHT-tile KPI grid
// (TodayStats, 4 across × 2), then a workspace row (TodayInstrument) carrying a scope dropdown, a
// segmented strip that chooses what the map is coloured BY (health / alerts / weather), the
// multi-field map as the primary object, and the Intelligence Feed beside it. Then "Sahələrim".
//
// ON A NARROW STAGE THE MAP IS THE WHOLE SCREEN (components/home/MapHome.tsx). The stacked
// greeting-plus-cards phone home is gone: docs/ONESOIL_MOBILE_TEARDOWN.md §3 measured a product
// with no "today" screen at all, and the owner took that call. Nothing was dropped, it moved —
//   * "which fields need me" → the polygon colour on the map AND the attention bar under it;
//   * the worst-field hero → that same bar, one tap to open, a "+n" chip for the rest;
//   * the unread alert strip → inside the map's field sheet, same AlertList component, plus its
//     permanent second home in the top bar's NotificationBell;
//   * the weather bar → the /weather tab (it still renders here, inside IntelligenceFeed);
//   * "Sahələrim" → the /fields tab, which is now a first-class bottom-nav destination.
// The notice stack (error / trial / checklist / PWA nudge) deliberately did NOT move: it stays in
// flow above the map, because an error must never be something you have to open a sheet to find.
//
// THIS IS THE ONLY HOME for a signed-in farmer. app/src/app/page.tsx renders it unconditionally on
// the app host — the `?ui=v1` console Dashboard and lib/uiFlag.ts were both deleted on 2026-07-27,
// so there is no longer a fallback and no flag to check. Changes here are user-facing on deploy.
//
// The branch is chosen from a MEASURED stage width, never a breakpoint: AppShell's content stage is
// the viewport minus the sidebar — which WIDENS at xl (grep SIDEBAR_EXPANDED in shell/AppRail) —
// minus a field list that also only appears at xl. Both steps land on the same breakpoint and both
// take width away, so the stage can be NARROWER at xl than at lg. No media query can express that
// inversion; this is the same reason the field workbench measures (see workbench/useStageWidth).
//
// Every number on the screen is real: wellness scores come from the STORED read model
// (GET /api/orgs/{id}/wellness — one request per org, never a per-field computation), weather from
// the field centroid via keyless Open-Meteo + the rain-nowcast endpoint. Missing data is omitted,
// never faked. The onboarding checklist, the PWA nudge and the org switcher all stay.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Sprout } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t, getLocale } from "@/lib/i18n";
import { ErrorNote } from "@/components/ui";
import { ListSkeleton } from "@/components/Skeleton";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import TrialBanner from "@/components/TrialBanner";
import InstallPrompt from "@/components/InstallPrompt";
import { type GeoField } from "@/components/FieldsOverviewMap";
import FieldGrid from "@/components/home/FieldGrid";
import MapHome from "@/components/home/MapHome";
import { type TodayAlert } from "@/components/home/AlertList";
import TodayInstrument from "@/components/home/TodayInstrument";
import TodayStats, {
  type AlertSummary,
  type IrrigationSummary,
  type SatelliteSummary,
  type SceneSummary,
} from "@/components/home/TodayStats";
// WeatherBar is NOT imported here any more — the phone's live-conditions strip moved to the
// /weather tab, and the wide dashboard reaches the same component through IntelligenceFeed. The
// component itself is very much alive; only this file's direct use of it is gone.
import { formatToday } from "@/components/home/homeDate";
import { bandOf, type FieldScore } from "@/components/home/ScoreBadge";
import { useStageWidth } from "@/components/field/workbench/useStageWidth";
import { fetchFieldToday, type FieldToday } from "@/lib/today";
import type { Tone } from "@/lib/indexStatus";
import type { Farm, Field, Org } from "@/lib/types";

/**
 * The stage width at which the dashboard layout turns on.
 *
 * The same number as the field screen's floor (grep WORKBENCH_MIN in workbench/useStageWidth), so a
 * laptop that gets the workbench also gets the dashboard — but deliberately NOT imported from there:
 * that constant is tuned for a map beside a rail on the field page, and the two screens must be
 * free to move apart without one silently dragging the other with it.
 *
 * It cannot reach a phone: below `md` there is no sidebar and no field list, which caps the stage at
 * roughly vw - 32 (≤ 736px). The only sub-`lg` viewports that clear this are ~890px landscape
 * tablets, which already run the full desktop shell (the sidebar is `hidden md:flex`, BottomNav is
 * `md:hidden`, so the two never coexist).
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
 * A 30-row response therefore means this list is a PAGE, not a tally — and the 60-row SQL cut behind
 * it is not even observable from the response.
 *
 * That ceiling is exactly why the KPI tile no longer counts these rows: it reads GET
 * /api/alerts/summary, which counts open conditions in SQL with no limit at all. Everything derived
 * from the list below (the strips, the map colouring, the feed groups) is a VIEW of recent rows and
 * must never be presented as a total — including `openAlerts`, which is "the open alerts among the
 * last 30 notifications", not "every open alert".
 */
const NOTIF_LIMIT = 30;

/** The alert row as the API sends it. `read` is the one field the strip itself does not render, so
 *  it lives here rather than in AlertList's display type.
 *
 *  `open` (0063) is the other axis and answers a different question: `read` is about the reader,
 *  `open` is about the field — the rule behind this row was observed still matching. A row can be
 *  read and open (the farmer saw it, the drought did not stop), or unread and closed (it fired last
 *  week, cleared since, and nobody looked). The feed groups on `open`; the map still colours from
 *  unread, which is a separate, weaker claim it already discloses. */
type NotifRow = TodayAlert & { read?: boolean; open?: boolean };

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

export default function TodayHome() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [fields, setFields] = useState<Field[] | null>(null);
  const [todays, setTodays] = useState<Record<string, FieldToday>>({});
  const [scores, setScores] = useState<Record<string, FieldScore>>({});
  // null, not [], until GET /api/fields/geo resolves — and it STAYS null when that request fails.
  // The two used to be the same value, which made "this org has no drawn geometry" and "we could not
  // ask" indistinguishable; the satellite tile has to tell them apart to choose between "0 ready"
  // and a dash. Every other consumer reads it through `geoList` below.
  const [geoFields, setGeoFields] = useState<GeoFieldFull[] | null>(null);
  /** The geo read FAILED (as opposed to "has not answered yet"). Only the phone home acts on it —
   *  there the map is the entire screen, so the difference decides between a spinner and an error. */
  const [geoError, setGeoError] = useState(false);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  // null, not [], until the request resolves — and it stays null when the request FAILS, so the
  // stats tile can render a dash and say why instead of publishing a confident "0 alerts".
  const [alertsAll, setAlertsAll] = useState<TodayAlert[] | null>(null);
  const [alertsCapped, setAlertsCapped] = useState(false);
  /** Notifications whose underlying rule is STILL matching — read or not. The feed leads with these. */
  const [openAlerts, setOpenAlerts] = useState<TodayAlert[]>([]);
  /**
   * The open/critical/unconfirmed counts behind the KPI tile (GET /api/alerts/summary).
   *
   * A separate request from /api/notifications on purpose: that endpoint returns at most 30 rows
   * after a per-user filter, so counting its rows could only ever produce a floor, and the tile
   * would go on printing exact-looking numbers over a page ceiling. This one counts in SQL over the
   * whole open set. It stays null until it resolves AND when it fails — the tile renders a dash.
   */
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
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
          // Stored WHOLE — the strips slice at render.
          setAlertsAll(
            rows.filter((n) => !n.read && (n.severity === "critical" || n.severity === "warning")),
          );
          // NOT filtered on `read`: an open alert the farmer already opened is still a condition on
          // their field, and dropping it here would rebuild the exact bug this change removes.
          setOpenAlerts(rows.filter((n) => n.open));
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
    setGeoFields(null);
    setGeoError(false);
    setAlertSummary(null);
    // Org-scoped, unlike /api/notifications: the dashboard shows one organization at a time, so the
    // tile must count that organization's open conditions and not an agronomist's whole book.
    // Fired OUTSIDE the sequential chain below — it is one aggregate query and nothing on the screen
    // waits for it, so it must not sit in front of the field list.
    api.get<AlertSummary>(`/api/alerts/summary?org_id=${orgId}`)
      .then((a) => { if (active && a && typeof a.open === "number") setAlertSummary(a); })
      .catch(() => { /* the tile renders a dash and says the alerts did not load */ });
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
      } catch {
        // The map is a bonus on the DESKTOP dashboard, where a missing map costs one panel out of
        // several. On the PHONE the map IS the home screen, so a silent failure left `geoFields`
        // null forever and MapHome — which cannot tell null-because-in-flight from
        // null-because-failed — showed a skeleton that never resolved, with no error, no retry and
        // no add-field control. Record the failure so the phone can say so.
        if (active) setGeoError(true);
      }
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
  // The ids, not just the count: the phone home lists exactly these fields behind its "+n" chip, and
  // deriving them there from a second copy of needsAttention() is how the map, the bar and the sheet
  // would come to disagree about which fields are flagged.
  const flaggedIds = resolved
    .filter((ft) => needsAttention(ft, scores[ft.field.id]))
    .map((ft) => ft.field.id);
  const attn = flaggedIds.length;
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

  // Every consumer below reads the geometry through this, so a FAILED request behaves exactly like
  // an empty one everywhere except the one place that has to tell them apart (the satellite tile).
  const geoList = geoFields ?? [];

  // Weather bar placement: the field that needs attention, else the first field we have a point for.
  const geoById: Record<string, GeoFieldFull> = {};
  for (const g of geoList) geoById[g.id] = g;
  const weatherField =
    (worst && pointOf(geoById[worst.field.id]) ? worst.field : null) ??
    fields.find((f) => pointOf(geoById[f.id]) != null) ??
    null;
  const weatherPoint = weatherField ? pointOf(geoById[weatherField.id]) : null;

  /** The same lookup for an arbitrary field — the dashboard's scope dropdown moves the weather bar
   *  onto whichever field is selected, and pointOf must keep exactly one implementation. */
  const weatherFor = (fieldId: string) => {
    const g = geoById[fieldId];
    const p = pointOf(g);
    return p && g ? { lat: p.lat, lon: p.lon, label: g.name, fieldId } : null;
  };

  // ── the three roll-ups the new KPI tiles read ───────────────────────────────────────────────
  // Satellite: counted from fields.data_status as /api/fields/geo returns it — the DB column, not
  // FieldToday.status. The latter is `ins?.data_status ?? "none"`, so a field whose /insights call
  // failed would be counted as "never processed" and the tile would report a network blip as an
  // untouched farm. null propagates: a failed geo request means we cannot say anything at all.
  const satellite: SatelliteSummary | null = geoFields
    ? geoFields.reduce<SatelliteSummary>(
        (acc, g) => {
          const s = g?.data_status;
          if (s === "ready") acc.ready += 1;
          else if (s === "partial") acc.partial += 1;
          else if (s === "queued" || s === "processing") acc.preparing += 1;
          else if (s === "failed") acc.failed += 1;
          else acc.notStarted += 1;
          acc.total += 1;
          return acc;
        },
        { ready: 0, partial: 0, preparing: 0, failed: 0, notStarted: 0, total: 0 },
      )
    : null;

  // Irrigation: fetchFieldToday already keeps only a POSITIVE reco_mm from the latest FAO-56 day
  // (lib/today.ts), so a non-null waterReco is a standing recommendation and nothing else — the
  // count is exact in the upward direction.
  //
  // A NULL is ambiguous by construction: fetchFieldToday catches its /water-balance call, so "the
  // balance was computed and asks for nothing" and "the request failed" arrive identically here, and
  // no information downstream can separate them. That ambiguity is why the tile carries NO tone and
  // why its zero-case wording is "no field HAS a recommendation" rather than "no field needs water".
  // `covered` narrows it as far as it can go — see IrrigationSummary.
  const irrigation: IrrigationSummary = {
    count: resolved.filter((ft) => ft.waterReco != null).length,
    covered: resolved.length,
  };

  // Newest scene across the org. verdict.date is the leading vegetation index's latest_date, an ISO
  // calendar day, so a plain string comparison orders them correctly. Fields with no vegetation
  // trend contribute no date and stay outside the fraction the tile discloses.
  const sceneDates = resolved
    .map((ft) => ft.verdict?.date)
    .filter((d): d is string => typeof d === "string" && d.length > 0);
  const lastScene: SceneSummary | null =
    sceneDates.length > 0
      ? { date: sceneDates.reduce((a, b) => (a > b ? a : b)), fields: sceneDates.length }
      : null;

  // Both consumers are handed `alertsAll` WHOLE and slice for themselves: the dashboard feed has its
  // own row budget and its map has to colour from every unread row, and the phone's field sheet has
  // a different budget again. The KPI tile no longer derives anything from this list — it reads
  // `alertSummary`, which counts CONDITIONS in SQL rather than rows in a capped page.
  const greeting = user?.full_name ? `${t("app.home.todayHome.greeting")}${user.full_name.split(" ")[0]}` : null;

  // Wide-only now: the phone home has no header to hang it on, so MapHome renders the same control
  // as the first block of its field sheet. Neither surface loses the multi-org agronomist.
  const orgSwitcher =
    orgs.length > 1 ? (
      <select
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        className="input max-w-[220px]"
        aria-label={t("today.org")}
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    ) : null;

  return (
    // The stack gap is WIDE-ONLY. On the phone this element has exactly two children — the notice
    // stack and the full-height MapHome — and MapHome is sized to fill every pixel the shell leaves,
    // so a `space-y-5` margin above it would be 20px of white that nothing can reclaim (the notice
    // wrapper self-hides in the steady state, and a display:none sibling still hands the next child
    // its margin). The gap moves onto the notice wrapper instead, where it only exists when there is
    // actually a notice. The wide branch keeps the stack it shipped with, untouched.
    <div ref={stageRef} className={wide ? "space-y-5" : ""}>
      {/* Dated greeting — wide only. On a phone the map IS the screen (teardown §3), and a title bar
          announcing today's date costs it 80px; the roll-up sentence that used to sit here is now
          carried more precisely by the polygon colours plus MapHome's attention bar. */}
      {wide && (
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
      )}

      {/* The notice stack is also one column of cards, so it takes the reading column too — a
          six-row checklist stretched across a 1400px stage is the same failure as a giant field
          card. `empty:hidden` is load-bearing: all four of these self-hide (no error, no trial,
          checklist complete, PWA already installed), and without it the leftover wrapper would
          still collect a space-y-5 gap and open a phantom 20px hole in the steady state. On the
          phone it also carries the gap to the map below (see the root's className), which the same
          `empty:hidden` correctly withholds when there is no notice to separate.
          NOT moved into MapHome on purpose: an error or a trial warning must be readable without
          opening anything. */}
      <div className={`${READ_COL} space-y-5 empty:hidden ${wide ? "" : "mb-5"}`}>
        <ErrorNote message={error} />

        {/* D3.6 — activation checklist (hides itself once complete) */}
        {orgId && <TrialBanner orgId={orgId} />}
        <OnboardingChecklist />

        {/* D3.5 — PWA install nudge at a value moment (satellite data ready) */}
        <InstallPrompt show={hasReady} />
      </div>

      {wide ? (
        // Eight dashes over an empty map is not a control room, it is a broken one: with no fields
        // the screen goes straight to the empty card below.
        fields.length > 0 && (
          <>
            <TodayStats
              fields={fields}
              scores={scores}
              alerts={alertSummary}
              attn={attn}
              evaluatedCount={evaluated}
              satellite={satellite}
              irrigation={irrigation}
              lastScene={lastScene}
            />
            <TodayInstrument
              fields={fields}
              geoFields={geoList}
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
              weatherFor={weatherFor}
              worst={worst}
              worstScore={worst ? scores[worst.field.id] : undefined}
              alertsAll={alertsAll}
              alertsCapped={alertsCapped}
              openAlerts={openAlerts}
              satellite={satellite}
            />
          </>
        )
      ) : (
        /* THE PHONE HOME. One child, full height, and it fetches nothing — every input below is
           already in this component's state, which is the whole reason the map home costs zero
           extra requests and mounts no second poller. Note it is handed `geoFields` RAW, not
           `geoList`: null there means "we have not been told yet", and MapHome has to tell that
           apart from "this org has drawn no boundaries" to avoid instructing a farmer to draw
           boundaries that already exist. */
        <MapHome
          fields={fields}
          geoFields={geoFields}
          geoError={geoError}
          scores={scores}
          todays={todays}
          flaggedIds={flaggedIds}
          worst={worst}
          evaluated={evaluated}
          alerts={alertsAll}
          orgs={orgs}
          orgId={orgId}
          onOrgChange={setOrgId}
        />
      )}

      {/* MOCK-app-today-fieldgrid — "Sahələrim", WIDE ONLY. The phone reaches the same list through
          the Sahələr tab, which is now a first-class bottom-nav destination rather than a section
          under the fold; leaving it here as well would put a scrolling card grid underneath a screen
          that is exactly viewport-height. READ_COL because the 3-up grid is the block a full-bleed
          stage damages most (three cards across 1400px are billboards, not cards), and a lone
          empty-state card stretched that wide reads as a broken panel. */}
      {wide &&
        (fields.length === 0 ? (
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
              {/* One add affordance per screen, and on this branch the header above already carries
                  the primary button — which is why the inline phone-only "Əlavə et" link that used
                  to sit here is gone with the branch that needed it. */}
            </div>
            <FieldGrid fields={fields} todays={todays} scores={scores} />
          </section>
        ))}
    </div>
  );
}
