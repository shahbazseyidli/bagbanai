"use client";

// THE PHONE HOME — a full-bleed map of the farm, with the day's attention material under it.
//
// docs/ONESOIL_MOBILE_TEARDOWN.md §3 is the brief: "Xəritə default tab-dır və evdir. Ayrıca
// dashboard/bu gün ekranı YOXDUR." So on a narrow stage "/" stops being a dated greeting over a
// stack of cards and becomes the map, with add-field as a control ON it (§2, `add_field_button`,
// 48×48) rather than a cell in the bottom bar.
//
// THIS COMPONENT FETCHES NOTHING. TodayHome already loads every input on this screen — the org
// list, the fields, one FieldToday per field, the org-wide wellness read model, the field geometry
// and the notifications — so the phone home adds zero requests and mounts no second poller. It also
// does not re-decide the branch: TodayHome measures the stage once (grep `useStageWidth` there) and
// only ever renders this component on the narrow side of it.
//
// EVERY NUMBER TRACES TO AN ENDPOINT. The polygon colour is the stored wellness band
// (GET /api/orgs/{id}/wellness, painted by FieldsOverviewMap), the row score is the same stored row
// (ScorePill renders an em-dash and says why when there is none), the verdict line is the
// deterministic İcmal engine via lib/today, and the all-clear sentence is gated on how many fields
// could be evaluated AT ALL — never on how many requests came back. Nothing here is computed for
// effect and nothing is filled in.
//
// WHAT IS NOT BUILT HERE, AND WHY (the map is composed, not rewritten): FieldsOverviewMap owns the
// MapLibre instance and does not expose it, so this file ships NO locate button and NO basemap
// switcher — a control that cannot move the map is a lie, and a dead button is worse than a missing
// one. Tapping a polygon opens that field directly (FieldsOverviewMap's own click handler) instead
// of raising a peek card, for the same reason. All three need optional props on a file this wave
// does not own; the report names them.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Plus,
  Search,
  Sprout,
  CloudOff,
  Square,
  X,
} from "lucide-react";
import { t, tf, tp } from "@/lib/i18n";
import { Skeleton } from "@/components/Skeleton";
import FieldsOverviewMap, { type GeoField } from "@/components/FieldsOverviewMap";
import AlertList, { type TodayAlert } from "@/components/home/AlertList";
import { ScoreDot, ScorePill, toneWord, type FieldScore } from "@/components/home/ScoreBadge";
import { getSavedBasemap, type Basemap } from "@/lib/basemaps";
import { useFormatArea } from "@/lib/units";
import { wellnessHeadline } from "@/lib/wellnessText";
import type { FieldToday } from "@/lib/today";
import type { Field, Org } from "@/lib/types";

/** How many unread alerts the sheet lists before it defers the rest to /notifications. */
const SHEET_ALERTS = 6;

/** The dark map-control treatment measured off OneSoil (`#222425`, docs/ONESOIL_DESIGN_SYSTEM.md
 *  §4.2). `ink` is this product's near-black token; /90 keeps a hint of the imagery underneath so
 *  the control reads as sitting ON the map rather than punched through it.
 *
 *  Deliberately NO backdrop-blur: `backdrop-filter` makes an element the containing block for every
 *  fixed descendant, and this whole subtree lives under AppShell's bleed, which spells that rule out
 *  (grep SHELL_BLEED in shell/AppShell.tsx). These controls have no fixed descendants today, and the
 *  cheapest way to keep that true is to not introduce the property at all. */
const MAP_CTRL = "bg-ink/90 text-white shadow-soft";

/** 48×48 exactly — the teardown finds no exception to it (§2.3, "hamısı 48 dp"). Written as the
 *  --tap token rather than h-12 so the one touch floor in globals.css still governs it. */
const MAP_BTN = `grid h-[var(--tap)] w-[var(--tap)] shrink-0 place-items-center rounded-full ${MAP_CTRL}`;

/** One row of the field sheet: the score, the name, and the little the screen can say for certain. */
function SheetRow({
  field,
  ft,
  score,
  active,
  areaText,
  onScope,
}: {
  field: Field;
  ft?: FieldToday;
  score?: FieldScore;
  active: boolean;
  areaText: string | null;
  onScope: () => void;
}) {
  const preparing = ft != null && (ft.status === "queued" || ft.status === "processing");
  // The same status vocabulary as the field cards (ScoreBadge.toneWord) — a farmer must not have to
  // learn a second set of words for the same three states inside one screen.
  const statusWord = preparing ? t("today.preparing") : ft?.verdict ? toneWord(ft.verdict.tone) : null;
  const meta = [areaText, statusWord].filter(Boolean).join(" · ");

  return (
    <li className="flex items-stretch gap-1">
      {/* TWO hit areas, both at the 48px floor: the row FOCUSES the map on this field (which is
          what the pill above the map then names), the chevron OPENS it. Splitting them is what lets
          the sheet be a map control and a field list at once without either meaning being a guess. */}
      <button
        type="button"
        onClick={onScope}
        aria-pressed={active}
        className={`flex min-h-[var(--tap)] min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left ${
          active ? "bg-brand-light" : "bg-white"
        }`}
      >
        <ScorePill score={score} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-900">{field.name}</span>
          {meta && <span className="block truncate text-xs text-slate-500">{meta}</span>}
        </span>
      </button>
      <Link
        href={`/fields/${field.id}`}
        aria-label={`${t("app.home.map.openField")} — ${field.name}`}
        className="grid min-h-[var(--tap)] w-12 shrink-0 place-items-center rounded-xl text-slate-400"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </li>
  );
}

export default function MapHome({
  fields,
  geoFields,
  geoError,
  scores,
  todays,
  flaggedIds,
  worst,
  evaluated,
  alerts,
  orgs,
  orgId,
  onOrgChange,
}: {
  fields: Field[];
  /** GET /api/fields/geo. null = not resolved OR failed — never "this org has no boundaries". */
  geoFields: GeoField[] | null;
  /**
   * That read FAILED, as opposed to "has not answered yet". Both leave `geoFields` null, and on
   * this screen the map is the entire home — so without the distinction a dead request rendered a
   * skeleton that spun for the rest of the session, with no error and no way to retry.
   */
  geoError: boolean;
  /** The stored wellness read model, keyed by field id. A field with no row is simply absent. */
  scores: Record<string, FieldScore>;
  todays: Record<string, FieldToday>;
  /**
   * The ids TodayHome's needsAttention() flagged. Passed in rather than re-derived for the same
   * reason TodayStats takes `attn`: two definitions of "needs attention" inside one screen can
   * disagree, and then the map, the bar and the sheet each tell a different story.
   */
  flaggedIds: string[];
  /** The single worst flagged field, or null when nothing is flagged. */
  worst: FieldToday | null;
  /** How many fields could be evaluated AT ALL — not how many requests resolved. */
  evaluated: number;
  /** Unread critical/warning notifications, whole. null = the request did not resolve. */
  alerts: TodayAlert[] | null;
  orgs: Org[];
  orgId: string;
  onOrgChange: (id: string) => void;
}) {
  const fmtArea = useFormatArea();

  // ── the measured height ─────────────────────────────────────────────────────────────────────
  // Same technique, and for the same reason, as the desktop workbench (grep
  // `const measure = () => setTop` in field/workbench/FieldWorkbench.tsx): the chrome above this
  // box is not a constant — a sticky header whose height changes with the safe-area inset, main's
  // padding, and a notice stack that appears and disappears — so the only honest height is
  // "everything the shell left", measured.
  //
  // A CALLBACK ref, not a RefObject, for useStageWidth's reason: this component returns a different
  // tree while the org has no fields, so an effect that ran once on mount would find no node and
  // never measure when the fields arrive.
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const rootRef = useCallback((node: HTMLDivElement | null) => setRootEl(node), []);
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    if (!rootEl) return;
    const measure = () => setTop(Math.round(rootEl.getBoundingClientRect().top + window.scrollY));
    measure();
    // document.body, not the element: what moves this box is something ABOVE it growing (a wrapped
    // header, the trial banner arriving), which never resizes the box itself.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [rootEl]);

  // ── local UI state (nothing here is fetched) ────────────────────────────────────────────────
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [wantFocus, setWantFocus] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Read once on mount, never during render: getSavedBasemap() touches localStorage, and a value
  // that exists only in the browser must not decide any server-rendered markup.
  const [basemap, setBasemap] = useState<Basemap | null>(null);
  useEffect(() => setBasemap(getSavedBasemap()), []);

  useEffect(() => {
    if (sheetOpen && wantFocus) searchRef.current?.focus();
  }, [sheetOpen, wantFocus]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setWantFocus(false);
    setFlaggedOnly(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, closeSheet]);

  const openSheet = (opts: { focus?: boolean; flagged?: boolean } = {}) => {
    setFlaggedOnly(opts.flagged === true);
    setWantFocus(opts.focus === true);
    setSheetOpen(true);
  };

  // ── what the map is asked to draw ───────────────────────────────────────────────────────────
  // Scoping is the only viewport control this file has: FieldsOverviewMap refits whenever the field
  // SET changes (grep `lastFitRef` there), so handing it one field flies to that field, and handing
  // the whole list back zooms out to the farm. A scope pointing at a field the org no longer has
  // (the switcher moved) silently falls back to "all" rather than showing an empty map.
  const scopedField = scopeId ? (fields.find((f) => f.id === scopeId) ?? null) : null;
  const geoList = geoFields ?? [];
  const drawable = geoList.filter((g) => g?.geom != null);
  const mapFields = scopedField ? drawable.filter((g) => g.id === scopedField.id) : drawable;

  const flagged = useMemo(() => new Set(flaggedIds), [flaggedIds]);
  const attn = flaggedIds.length;

  const sheetFields = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return fields.filter((f) => {
      if (flaggedOnly && !flagged.has(f.id)) return false;
      if (q && !f.name.toLocaleLowerCase().includes(q)) return false;
      return true;
    });
  }, [fields, flagged, flaggedOnly, query]);

  const shownAlerts = alerts ? alerts.slice(0, SHEET_ALERTS) : [];
  const moreAlerts = alerts ? Math.max(0, alerts.length - shownAlerts.length) : 0;

  // ── the all-clear sentence ──────────────────────────────────────────────────────────────────
  // The same discipline TodayStats applies to its attention tile: "hamısı qaydasındadır" is a claim
  // about EVERY field, so it may only be made when every field was actually evaluated. With a
  // partial view the bar states the coverage fraction instead, and with nothing evaluated it says
  // so outright — a green all-clear over fields nobody could look at is the exact failure this rule
  // exists to prevent.
  const fullyEvaluated = fields.length > 0 && evaluated >= fields.length;
  const allClear =
    evaluated === 0
      ? t("app.home.stats.attnUnknown")
      : // Defensive, and cheap: this line only renders when `worst` is null, which today can only
        // happen when nothing is flagged — worstOf() and flaggedIds run the SAME predicate over the
        // same resolved list. If those two ever drift, the bar states the count rather than
        // announcing an all-clear over fields that are in fact flagged.
        attn > 0
        ? tf("app.home.stats.fieldsAttn", { n: attn })
        : fullyEvaluated
          ? t("app.home.stats.fieldsAllGood")
          : tf("app.home.stats.coverage", { covered: evaluated, total: fields.length });

  const worstScore = worst ? scores[worst.field.id] : undefined;
  // Mirrors AttentionHero's resolution order (the İcmal verdict first, then the stored wellness
  // headline) so the compact bar and the wide hero never name the same field differently.
  const worstLine =
    worst?.verdict?.title ??
    (worstScore
      ? wellnessHeadline(worstScore.headline_code, worstScore.headline_params, worstScore.headline)
      : null) ??
    (worst && (worst.status === "queued" || worst.status === "processing") ? t("today.preparing") : null);

  // ── empty farm ──────────────────────────────────────────────────────────────────────────────
  // A basemap with nothing drawn on it looks like a map of your farm and is a map of nothing, so
  // there is no map here at all — the teardown's empty-state formula (§4.9): icon, one sentence,
  // one button.
  if (fields.length === 0) {
    return (
      <div className="card text-center">
        <Sprout className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
        <p className="mt-2 text-slate-700">{t("today.noFields")}</p>
        <Link href="/onboarding" className="btn-primary mt-3 inline-flex">
          <Plus className="h-4 w-4" aria-hidden="true" /> {t("today.addFirst")}
        </Link>
      </div>
    );
  }

  const scopeLabel = scopedField ? scopedField.name : t("app.home.dash.allFields");

  return (
    <div
      ref={rootRef}
      // Rule: narrow on the NULLABLE value itself, never `?? 0` — an unmeasured box must fall back
      // to the class floor below, not silently claim a top of zero.
      style={top != null ? { height: `calc(100dvh - ${top}px - var(--nav-clear) - 1rem)` } : undefined}
      // dvh, not vh: Android's collapsing browser chrome makes vh taller than the box the farmer can
      // actually see, and this screen is sized to fill exactly that box.
      //
      // `- var(--nav-clear) - 1rem` is the mirror of layout.tsx's
      // `pb-[calc(var(--nav-clear)_+_1rem)]` (grep it there), so on a phone the document ends up
      // exactly 100dvh and nothing scrolls. At md that padding becomes `md:pb-6` = 24px while
      // --nav-h collapses to 0, which would leave 8px of overflow — `md:-mb-2` is exactly that 8px.
      //
      // -mx-4 cancels main's own `px-4` (grep `max-w-6xl px-4 py-6` in app/layout.tsx) for a
      // full-bleed map; md:mx-0 gives it straight back, because from md up the shell has a fixed
      // sidebar and its own track padding, and a box wider than the stage would slide under both.
      // NOTE the bleed is a MARGIN: never a transform, which would make this the containing block
      // for every fixed descendant and break the sidebar (see AppShell's SHELL_BLEED note).
      //
      // min-h-[320px] is the floor under the measured height: below that the map stops being a map
      // of a farm and becomes a strip, so the screen is allowed to grow past the viewport instead —
      // 40px of scroll is a smaller failure than a 120px map. It only binds when the notice stack
      // above is unusually tall (an error, a trial warning and the checklist all at once). WHOLE
      // class literals throughout: Tailwind's scanner cannot see a size built from a constant.
      className={`-mx-4 flex min-h-[320px] flex-col md:mx-0 md:-mb-2 ${
        top == null ? "h-[calc(100dvh_-_16rem)]" : ""
      }`}
    >
      {/* ── the map stage ──────────────────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        {geoError ? (
          // The read FAILED. Say so and offer the way back — a skeleton here spins forever, and a
          // farmer cannot tell a dead request from a slow one. `geoFields` is null in this arm too,
          // which is exactly why this test has to come FIRST.
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <CloudOff className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-sm text-slate-700">{t("app.home.map.loadFailed")}</p>
            <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
              {t("common.retry")}
            </button>
          </div>
        ) : geoFields == null ? (
          // Not "no boundaries" — we have not been told yet. Claiming either state here would be
          // inventing an answer to a request that has not come back.
          <Skeleton className="h-full w-full rounded-2xl" />
        ) : drawable.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Square className="h-8 w-8 text-emerald-600" aria-hidden="true" />
            <p className="text-sm text-slate-700">{t("app.home.map.noGeometry")}</p>
            <Link href="/fields" className="btn-secondary">
              {t("bnav.fields")}
            </Link>
          </div>
        ) : (
          <>
            {/* Composed, never re-implemented: FieldsOverviewMap already gates construction on
                useMapReady (a map built in a hidden tab never loads its style and stays blank
                forever), paints each polygon by its stored wellness band, draws a legend listing
                ONLY the classes actually on screen, refits when the field set changes, and opens a
                field on tap. Nothing about a phone changes any of that. */}
            <div className="absolute inset-0">
              <FieldsOverviewMap fields={mapFields} scores={scores} heightClass="h-full" />
            </div>


            {/* Basemap credit. FieldsOverviewMap constructs with `attributionControl:false` and adds
                nothing back, so on a screen that is almost entirely basemap the Esri / EOX
                (CC BY-NC-SA 4.0) / OSM credits would otherwise be absent — and all three require
                attribution. Rendered from the SAME saved basemap the map applies. */}
            {basemap && (
              <p className="pointer-events-none absolute bottom-1 right-2 z-20 max-w-[52%] text-right text-[10px] leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                {basemap.attribution}
              </p>
            )}
          </>
        )}

        {/* ── map controls ─────────────────────────────────────────────────────────────────────
            OUTSIDE the map branch, and that placement is the whole point. This column carries the
            ONLY add-field control on the phone home — the bottom bar's centre "+" was removed
            because OneSoil puts add-field on the map (teardown §2, `add_field_button`, 48×48).
            Nested inside the map arm it existed only once geometry had loaded AND at least one
            polygon was drawable, so the three states where a farmer most needs it — still loading,
            read failed, and no boundary drawn yet — were exactly the three with no way to add one.

            Gated on `fields.length` rather than on geometry: with no fields at all the empty state
            below already leads with its own "add your first field" button, and two competing
            primary actions on one screen is its own defect.

            Top-LEFT, not OneSoil's top-right: FieldsOverviewMap mounts MapLibre's own zoom stack in
            that corner and this file cannot turn it off. Overlapping a 48px control onto a 29px one
            is worse than moving the group. */}
        {fields.length > 0 && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col items-start gap-4">
            <button
              type="button"
              onClick={() => openSheet()}
              className={`pointer-events-auto flex min-h-[var(--tap)] max-w-full items-center gap-2 rounded-full px-4 ${MAP_CTRL}`}
            >
              <Layers className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate text-sm font-semibold">{scopeLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
            </button>

            <div className="flex flex-col gap-4">
              <Link
                href="/onboarding"
                aria-label={t("bnav.addField")}
                title={t("bnav.addField")}
                className={`pointer-events-auto ${MAP_BTN}`}
              >
                <Plus className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => openSheet({ focus: true })}
                aria-label={t("app.home.map.searchFields")}
                title={t("app.home.map.searchFields")}
                className={`pointer-events-auto ${MAP_BTN}`}
              >
                <Search className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* ── the field sheet ────────────────────────────────────────────────────────────────
            Deliberately INSIDE the map stage rather than a body-level portal: this screen is
            exactly viewport-height, so there is no page scroll to lock, and adding a lock would put
            a second counter into lib/scrollLock's ref-counted pair for no gain.

            OUTSIDE the map branch above, though: the attention bar can open this sheet, and the bar
            renders whether or not a polygon was ever drawn. Nested inside the map arm it would have
            been a control that silently did nothing on exactly the accounts with no geometry. */}
        {sheetOpen && (
          <>
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={closeSheet}
              className="absolute inset-0 z-30 bg-ink/40"
            />
            <div
              role="dialog"
              // Deliberately NOT aria-modal: the scrim covers the map stage, but the attention bar
              // below it stays operable, and telling a screen reader the rest of the page is inert
              // when it is not is worse than saying nothing.
              aria-label={t("app.home.map.sheetAria")}
              className="absolute inset-x-0 bottom-0 z-40 flex max-h-[85%] flex-col rounded-t-2xl border-t-[1.5px] border-slate-300 bg-white shadow-lift"
            >
              <div className="flex items-center gap-2 px-3 pt-3">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("app.home.map.searchFields")}
                    aria-label={t("app.home.map.searchFields")}
                    className="input pl-9"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeSheet}
                  aria-label={t("common.close")}
                  className="grid h-[var(--tap)] w-[var(--tap)] shrink-0 place-items-center rounded-xl text-slate-500"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
                {orgs.length > 1 && (
                  // D4.3's org switcher, unchanged in meaning: an agronomist managing more than
                  // one organization has to be able to move between them, and this sheet is the
                  // only chrome the phone home has left.
                  <select
                    value={orgId}
                    onChange={(e) => onOrgChange(e.target.value)}
                    className="input mt-3"
                    aria-label={t("today.org")}
                  >
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                )}

                {flaggedOnly && (
                  <button
                    type="button"
                    onClick={() => setFlaggedOnly(false)}
                    className="mt-3 inline-flex min-h-[var(--tap)] items-center gap-1.5 rounded-full bg-warn-tint px-3 text-xs font-bold text-warn"
                  >
                    {t("app.home.stats.attnLabel")}
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}

                <ul className="mt-3 space-y-1">
                  <li className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => {
                        setScopeId(null);
                        closeSheet();
                      }}
                      aria-pressed={scopedField == null}
                      className={`flex min-h-[var(--tap)] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-slate-900 ${
                        scopedField == null ? "bg-brand-light" : "bg-white"
                      }`}
                    >
                      <Layers className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                      {t("app.home.dash.allFields")}
                    </button>
                  </li>
                  {sheetFields.map((f) => (
                    <SheetRow
                      key={f.id}
                      field={f}
                      ft={todays[f.id]}
                      score={scores[f.id]}
                      active={scopedField?.id === f.id}
                      areaText={f.area_ha != null ? fmtArea(f.area_ha) : null}
                      onScope={() => {
                        setScopeId(f.id);
                        closeSheet();
                      }}
                    />
                  ))}
                </ul>

                {sheetFields.length === 0 && (
                  <p className="mt-3 px-3 text-sm text-slate-500">{t("app.home.map.searchEmpty")}</p>
                )}

                {/* The unread critical/warning rows, rendered by the SAME component the desktop
                    feed uses, each still deep-linking to its own field. AlertList returns null
                    when the list is empty, so nothing appears in the calm case. */}
                <div className="mt-4 empty:hidden">
                  <AlertList alerts={shownAlerts} compact more={moreAlerts} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── the attention bar ──────────────────────────────────────────────────────────────────
          Where the old stacked home's hero went. IN FLOW under the map, not floating over it:
          FieldsOverviewMap's legend owns the bottom-left corner and it is the only explanation of
          what the polygon colours mean, so covering it to save 60px would cost more than it buys.
          "Which field needs me today" is now zero taps (the bar names it, the map colours it) and
          opening it is one. */}
      <div className="shrink-0 border-t-[1.5px] border-slate-300 bg-white">
        {worst ? (
          <div className="flex items-stretch">
            <Link
              href={`/fields/${worst.field.id}`}
              className="flex min-h-[var(--tap)] min-w-0 flex-1 items-center gap-3 px-4 py-2"
            >
              {/* At its own 44px size. Passing `h-9 w-9` through className would NOT shrink it:
                  same-specificity Tailwind utilities resolve by stylesheet order, not by the order
                  they appear in the attribute, so h-11 could just as easily win. */}
              <ScoreDot score={worstScore} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-900">{worst.field.name}</span>
                {worstLine && <span className="block truncate text-xs text-slate-600">{worstLine}</span>}
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            </Link>
            {/* "+n" counts the flagged fields this bar did NOT name; the sheet it opens lists all
                of them, the named one included, because a list that silently omits the field you
                just read about is harder to trust than one that repeats it. */}
            {attn > 1 && (
              <button
                type="button"
                onClick={() => openSheet({ flagged: true })}
                className="min-h-[var(--tap)] shrink-0 border-l border-slate-200 px-3 text-xs font-bold text-emerald-700"
              >
                +{attn - 1} {tp("app.plural.fields", attn - 1)}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openSheet()}
            className="flex min-h-[var(--tap)] w-full items-center gap-2 px-4 py-2 text-left"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${fullyEvaluated ? "bg-good" : "bg-slate-300"}`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{allClear}</span>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
