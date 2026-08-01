"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import {
  DEFAULT_SECTION, GROUP_OF, SECTION_GROUPS, groupSections, resolveSection, sectionOf,
  type SectionKey,
} from "@/lib/fieldSections";
import { ErrorNote, Spinner } from "@/components/ui";
// FieldPulse / SignalsActions / ShareButton are no longer imported here: the phone renders them
// inside FieldFeed (mobile/FieldFeed.tsx), which is now the only narrow body of the status section.
import SatelliteTab from "@/components/field/SatelliteTab";
import { UI_SENSORS } from "@/lib/sensors";
import ExportButton from "@/components/field/ExportButton";
import ReportButton from "@/components/field/ReportButton";
import FieldMapSheet from "@/components/field/FieldMapSheet";
import FieldMapCard from "@/components/field/FieldMapCard";
import type { PickerVariant } from "@/components/field/layers/LayerPicker";
import AiTab from "@/components/field/AiTab";
import MetadataTab from "@/components/field/MetadataTab";
import PhotoDiagnose from "@/components/field/PhotoDiagnose";
import SoilLabUpload from "@/components/field/SoilLabUpload";
import FertilizerTab from "@/components/field/FertilizerTab";
import PhotosTab from "@/components/field/PhotosTab";
import PeerSuggest from "@/components/field/PeerSuggest";
import ScoutingTab from "@/components/field/ScoutingTab";
import { useScoutMap } from "@/components/field/scouting/useScoutMap";
import OperationsTab from "@/components/field/OperationsTab";
import SeasonTab from "@/components/field/SeasonTab";
import DocumentsTab from "@/components/field/DocumentsTab";
import WeatherHistoryTab from "@/components/field/WeatherHistoryTab";
import SeasonCompareChart from "@/components/field/SeasonCompareChart";
import BackfillCard from "@/components/field/BackfillCard";
import RainNowcast from "@/components/field/RainNowcast";
import DataPreparing from "@/components/field/DataPreparing";
import { useFieldDataStatus } from "@/lib/useFieldDataStatus";
import FieldHeader from "@/components/field/FieldHeader";
import FieldWorkbench from "@/components/field/workbench/FieldWorkbench";
import { fieldLayout, useStageWidth } from "@/components/field/workbench/useStageWidth";
import FieldFeed from "@/components/field/mobile/FieldFeed";
import SectionHeaderBar from "@/components/field/mobile/SectionHeaderBar";
import type { FieldDetail } from "@/lib/types";

// Sections that build their own MapLibre map, and therefore must NOT also get the persistent card
// stacked above them. "zones" used to be the second entry; it left with the productivity-zones
// feature, so "satellite" is now the only one. Hand-maintained, and it lives here rather than in
// fieldSections.ts because that file is the section taxonomy, not a rendering detail; a future
// section that embeds a map has to be added here or it will sit under a second map.
const SECTION_OWNS_MAP = new Set<SectionKey>(["satellite"]);

export default function FieldDetailPage() {
  // useSearchParams (tab state) requires a Suspense boundary under the app router.
  return (
    <Suspense fallback={<Spinner />}>
      <FieldDetailInner />
    </Suspense>
  );
}

function FieldDetailInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();


  const [field, setField] = useState<FieldDetail | null>(null);
  // Above the early `if (!field)` return on purpose — hook order must not depend on load state.
  const dataStatus = useFieldDataStatus(field?.id ?? "");
  const [error, setError] = useState("");
  // Tab lives in the URL (?tab=) so notifications/Telegram can deep-link and the back button steps
  // through tabs instead of leaving the field (D0.3).
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tab: SectionKey = resolveSection(searchParams.get("tab"));
  // Whether the section entry currently on the stack was pushed BY US. The phone's tabless screen
  // needs it for the same reason ?map=full does below: a farmer who arrived straight on
  // ?tab=metadata from a notification has no feed behind them, and router.back() there ejects them
  // from the app entirely. Every in-page route into a section sets it; backToFeed consumes it.
  const pushedSectionRef = useRef(false);
  function setTab(key: SectionKey) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", key);
    // A section change always leaves fullscreen: the param must never survive one, or tapping
    // "Peyk görüntüsü" from inside the overlay would land on the satellite section still covered.
    sp.delete("map");
    sp.delete("chart");
    // TRUE only when the entry we are pushing ON TOP OF is the feed. A bare `= true` made this a
    // "we pushed something" flag rather than "the feed is underneath": section → section → back
    // then popped to the FIRST section while the bar still named the feed, so the control landed
    // somewhere other than the screen it advertised.
    pushedSectionRef.current = tab === DEFAULT_SECTION;
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }
  /**
   * Back out of a phone DETAIL view to the feed (?tab=status).
   *
   * Mirrors closeFullscreen's idiom exactly: pop our own entry when there is one, otherwise push a
   * fresh feed URL. Pushing is the safe branch, not the clever one — the worst it costs is an extra
   * history entry, whereas an unconditional router.back() on a deep link leaves the field.
   */
  function backToFeed() {
    if (pushedSectionRef.current) {
      pushedSectionRef.current = false;
      router.back();
      return;
    }
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", DEFAULT_SECTION);
    sp.delete("map");
    sp.delete("chart");
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  // 6.6 — the map card's fullscreen state is in the URL, alongside ?tab=, for the reason D0.3 put
  // the tab there: the Android back gesture and the browser back button then close it for free,
  // with no popstate listener and no history.pushState monkey-patching under the App Router.
  const fullscreen = searchParams.get("map") === "full";
  // Whether the entry currently on the stack is OURS. A reloaded or shared ?map=full URL has none,
  // and router.back() there would throw the farmer out of the field entirely.
  const pushedFullRef = useRef(false);
  function openFullscreen() {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("map", "full");
    // Two fullscreen surfaces, never both: the chart overlay and the map overlay are each fixed
    // inset-0, so a URL carrying both would stack them with no way to see the lower one.
    sp.delete("chart");
    pushedFullRef.current = true;
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }
  function closeFullscreen() {
    if (pushedFullRef.current) {
      pushedFullRef.current = false;
      router.back();
      return;
    }
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("map");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // The index chart's own fullscreen, mirroring ?map=full for the same reason: the Android back
  // gesture and the browser back button then close it for free, with no popstate listener and no
  // history.pushState monkey-patching under the App Router (the D0.3 / 6.6 precedent).
  const chartFullscreen = searchParams.get("chart") === "full";
  const pushedChartRef = useRef(false);
  function openChartFullscreen() {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("chart", "full");
    sp.delete("map");
    pushedChartRef.current = true;
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }
  function closeChartFullscreen() {
    if (pushedChartRef.current) {
      pushedChartRef.current = false;
      router.back();
      return;
    }
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("chart");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [undoDeleted, setUndoDeleted] = useState(false);
  // Feature D — the status section lays itself out from its MEASURED width, not a breakpoint. The
  // ref now sits on the page frame rather than inside the status branch: the same measurement has
  // to exist on EVERY section, because it decides the persistent map card too.
  const [stageRef, stageW] = useStageWidth();
  // One map decision, from one number. Wide → FieldWorkbench owns the map and the card is not
  // rendered on the ordinary sections (a "persistent" element that vanishes on one section is
  // worse than not having it, and the desktop answer to "what am I looking at" is the workbench
  // plus the field list panel). Narrow → the card, except on the sections that build their own map.
  // stageW === null is the single unmeasured frame: build neither, exactly as before.
  // The classification itself lives with the measurement (workbench/useStageWidth), so the threshold
  // exists once and every surface that derives from it moves together.
  const layout = fieldLayout(stageW);
  const wide = layout === "wide";
  // The phone's tabless field screen (OneSoil teardown §3). TWO view modes, decided by the URL and
  // the measurement alone — no extra state, no alias table, no URL rewriting:
  //   FEED   = narrow stage AND ?tab=status → one continuous scroll (FieldFeed)
  //   DETAIL = narrow stage AND any other tab → that section's UNCHANGED body + a back-to-feed bar
  // Because no section body is touched, every ?tab= URL keeps working byte-for-byte: a share link,
  // a notification deep link, ?tab=metadata&focus=… and the retired ?tab=overview|ai|sentinel2|nasa
  // values (which resolveSection folds onto "status", i.e. onto the feed) all land where they did.
  const narrow = layout === "narrow";
  const feedMode = narrow && tab === DEFAULT_SECTION;
  // 6.5 — "scouting" is the one exception to the wide rule. Its notes ARE map data: pins with no
  // map is a feature with its output removed, and the workbench only renders on the status
  // section, so a wide stage would otherwise leave this section mapless. Everywhere else the wide
  // answer is still "the workbench owns the map".
  const showCard =
    stageW !== null && !SECTION_OWNS_MAP.has(tab) && (!wide || tab === "scouting");
  // W4 — and the SAME number decides how the layer picker opens, for both surfaces that have one.
  // Neither of them may measure again: this is the measurement that already decided whether the
  // card is on screen at all, and a component that re-measures its own box can disagree with the
  // page about which room it is in. Left to themselves they got it backwards — the card opened a
  // fixed inset-0 overlay on a 1440px desktop (it survives there for the scouting section), while
  // the satellite section pushed ~1250px of in-flow tiles between the button and the chart on a
  // 375px phone, with no way out but scrolling back up.
  const pickerVariant: PickerVariant = wide ? "panel" : "sheet";
  // The scouting section's pins have to reach a card mounted ABOVE the section, so the state that
  // joins them lives here, in their only common ancestor. Called unconditionally and before every
  // early return below — hook order has to be identical on every render.
  const scout = useScoutMap(showCard);

  function openEdit() {
    if (field) setEditName(field.name);
    setConfirmDel(false);
    setEditing(true);
  }

  async function onSaveName() {
    if (!field) return;
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await api.put(`/api/fields/${field.id}`, { name });
      setField({ ...field, name });
      setEditing(false);
    } catch (err) {
      setError(azError(err));
    } finally {
      setSaving(false);
    }
  }

  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function onDelete() {
    if (!field) return;
    setDeleting(true);
    try {
      await api.del(`/api/fields/${field.id}`);
      // Soft-deleted (D2.7): show a 6s undo bar before leaving; restore if the farmer taps undo.
      setDeleting(false);
      setEditing(false);
      setUndoDeleted(true);
      undoTimer.current = setTimeout(() => router.push("/"), 6000);
    } catch (err) {
      setError(azError(err));
      setDeleting(false);
      setConfirmDel(false);
    }
  }

  async function onUndoDelete() {
    if (!field) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    try {
      await api.post(`/api/fields/${field.id}/restore`);
      setUndoDeleted(false);
    } catch (err) {
      setError(azError(err));
    }
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    let active = true;
    // Clear FIRST. This page is reused across field ids — the desktop field list and notification
    // deep links change ?id without remounting it — and every child below reads `field`. Holding
    // the previous field's object while the new one loads paints field A's satellite scenes, A's
    // metrics and A's layer thumbnails under B's name, and the layer picker's session cache then
    // stores A's picture under B's key for good. The spinner this causes is a second of honesty,
    // not a regression.
    setField(null);
    setError("");
    (async () => {
      try {
        const f = await api.get<FieldDetail>(`/api/fields/${params.id}`);
        // Two quick taps in the field list would otherwise let A's slower response land last and
        // overwrite B.
        if (active) setField(f);
      } catch (err) {
        if (active) setError(azError(err));
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading || !user) return <Spinner />;
  if (error) return <ErrorNote message={error} />;
  if (!field) return <Spinner />;

  // Field detail is presented two ways from the SAME state/handlers: the classic stacked layout,
  // and (behind ?ui=v2) the D2.3 map-first sheet. Build each piece once, then compose per branch.
  //
  // The bottom offset is --nav-clear (globals.css), not a hand-rolled safe-area calc: the bar it
  // must clear is BottomNav, whose border-box height plus home-indicator inset that token already
  // states. env(safe-area-inset-bottom) + 1rem put this z-50 bar at inset+16..inset+84 — entirely
  // inside the nav band (inset..inset+81.5) and above the nav's z-40, so "Geri qaytar" covered all
  // four navigation slots for its six seconds. The token collapses to the inset alone at md+, where
  // the bar is hidden and the rail takes over.
  const undoBar = undoDeleted ? (
    <div className="fixed inset-x-0 bottom-[calc(var(--nav-clear)_+_0.75rem)] z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-white shadow-lg">
      <span className="text-sm">“{field.name}” {t("app.fieldDetail.fieldDeleted")}</span>
      <button
        onClick={onUndoDelete}
        className="min-h-11 rounded-lg bg-white/20 px-4 py-1.5 text-sm font-bold hover:bg-white/30"
      >
        {t("app.fieldDetail.undoRestore")}
      </button>
    </div>
  ) : null;

  // W2 parity — mockup field header: back chip, name in the display face, "ha · məhsul · yer"
  // subtitle and the 0-100 score pill (the pill renders only when a score actually exists).
  const titleRow = (
    <FieldHeader
      fieldId={field.id}
      name={field.name}
      areaHa={field.area_ha}
      // Both already on FieldDetail, so the breadcrumb and the previous/next walk cost no extra
      // lookup for the field itself — only the org's list, cached for five minutes.
      orgId={field.org_id}
      farmId={field.farm_id}
      layout={layout}
      // In a phone DETAIL view the chevron returns to the FEED, not out of the field: the feed is
      // the screen this section was opened from, so leaving the field on the first back press would
      // skip a whole level. Undefined everywhere else, which is FieldHeader's own default (browser
      // back, then /fields).
      onBack={narrow && !feedMode ? backToFeed : undefined}
      actions={
        !editing ? (
          <>
            <ExportButton name={field.name} geom={field.geom} />
            <ReportButton fieldId={field.id} />
            <button
              onClick={openEdit}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Settings className="h-4 w-4" /> {t("app.fieldDetail.editButton")}
            </button>
          </>
        ) : undefined
      }
    />
  );

  // Field settings/edit panel — rename + delete live here (delete no longer in the header).
  const editPanel = (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{t("app.fieldDetail.settingsTitle")}</h3>
        <button onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:text-slate-700">
          {t("app.fieldDetail.close")}
        </button>
      </div>

      <div className="mt-3">
        <label className="text-xs font-medium text-slate-500">{t("app.fieldDetail.nameLabel")}</label>
        <div className="mt-1 flex gap-2">
          <input
            className="input flex-1"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <button
            onClick={onSaveName}
            disabled={saving || !editName.trim() || editName.trim() === field.name}
            className="btn-primary shrink-0 disabled:opacity-50"
          >
            {saving ? t("app.fieldDetail.saving") : t("app.fieldDetail.save")}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {t("app.fieldDetail.editHint")}
        </p>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        {confirmDel ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <span className="text-sm text-red-700">{t("app.fieldDetail.deleteConfirmQuestion")}</span>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? t("app.fieldDetail.deleting") : t("app.fieldDetail.confirmDelete")}
            </button>
            <button onClick={() => setConfirmDel(false)} disabled={deleting} className="rounded px-2 py-1 text-sm text-slate-600 hover:text-slate-800">
              {t("app.fieldDetail.cancel")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            {t("app.fieldDetail.deleteButton")}
          </button>
        )}
      </div>
    </div>
  );

  const activeGroup = GROUP_OF[tab];
  const groupTabs = groupSections(activeGroup);
  // Above xl the left panel carries this navigation (FieldSectionMenu); below xl the panel does not
  // exist, so the chip rows stay. The two are never on screen together.
  //
  // The chip row now also depends on the MEASURED stage, and that pairing is what keeps a dead band
  // from opening up. FieldListPanel is `xl:flex` and this row is `xl:hidden` — one contract — so the
  // three cases are:
  //   narrow  → no chips; the feed's blocks, its "Daha çox" list and the detail back bar navigate.
  //   wide    → chips render exactly as before. That covers stage ≥ 760 with viewport < xl (iPad,
  //             a half-screen laptop), which has neither the feed nor the left panel.
  //   unknown → nothing for the one unmeasured frame, so no chip row flashes and then vanishes.
  const tabNav = !wide ? null : (
    <div className="space-y-2 xl:hidden">
      {/* Primary: 3 farmer intents */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {SECTION_GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setTab(g.sections[0].key)}
            aria-current={activeGroup === g.key}
            className={`min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
              activeGroup === g.key ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"
            }`}
          >
            {t(g.labelKey)}
          </button>
        ))}
      </div>
      {/* Secondary: this group's tabs (hidden when the group has just one) */}
      {groupTabs.length > 1 && (
        <div className="flex flex-nowrap gap-1 overflow-x-auto border-b border-slate-200">
          {groupTabs.map((sc) => {
            const tk = sc.key;
            return (
              <button
                key={tk}
                onClick={() => setTab(tk)}
                className={`-mb-px min-h-11 shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
                  tab === tk
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-600 hover:text-slate-800"
                }`}
              >
                {t(sc.labelKey)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const tabContent = (
    <div>
      {/* Above xl the chip rows are hidden, so the content column has to say which section is open. */}
      <h2 className="mb-3 hidden font-display text-xl font-bold text-ink xl:block">
        {t(sectionOf(tab).labelKey)}
      </h2>
      {/* Phone DETAIL view: the only chrome a section gains from the tabless screen. It carries the
          way back to the feed and, below xl, the name of the section — the <h2> above is
          `hidden xl:block`, and this bar is `xl:hidden`, so exactly one of them is ever on screen. */}
      {narrow && !feedMode && (
        <SectionHeaderBar title={t(sectionOf(tab).labelKey)} onBack={backToFeed} />
      )}
      {tab === "status" && (
        <div>
          {layout === "unknown" ? (
            // One frame. Rendering the stacked branch here would construct a MapLibre map on a wide
            // screen and tear it down again the moment the measurement lands.
            <div className="h-[460px] animate-pulse rounded-xl bg-paper-2" aria-hidden="true" />
          ) : wide && stageW !== null ? (
            // `wide` already implies a measured stage — fieldLayout() returns "unknown" for null —
            // but that is an invariant across two variables, and TypeScript narrows types, not
            // invariants: `stageW` stays `number | null` here and FieldWorkbench wants a `number`.
            // The redundant-looking test is the narrowing, and it is the honest one: passing
            // `stageW ?? 0` would compile and then feed the workbench's own 1000/1280 tier ladder a
            // zero if the invariant were ever broken.
            <div className="space-y-4">
              {/* Above everything: while the satellite archive is still being read there is no
                  point offering charts. It renders nothing once the field is ready. */}
              <DataPreparing status={dataStatus} />
              <RainNowcast fieldId={field.id} />
              <FieldWorkbench
                field={field}
                stageW={stageW}
                onOpenSatellite={() => setTab("satellite")}
                onOpenAnalysis={() => setTab("analysis")}
              />
            </div>
          ) : (
            // NARROW — and, since "unknown" and "wide" are handled above, this leaf IS feedMode.
            //
            // The phone's whole field screen: one continuous scroll (teardown §3). The satellite
            // block is not here and never was — FieldMapCard renders it above the nav, for every
            // section, and two /scenes read models would drift apart within one tap. RainNowcast
            // MOVED into the spraying block inside the feed, where its verdict belongs.
            <FieldFeed
              field={field}
              pathname={pathname}
              search={searchParams.toString()}
              onOpenAnalysis={() => setTab("analysis")}
              onOpenWeather={() => setTab("weather")}
              // A "Daha çox" row is a <Link>, so it pushes without going through setTab — tell the
              // back bar the entry it would pop is ours.
              onNavigateSection={() => {
                // Same rule as setTab: only the feed may be claimed as the entry underneath.
                pushedSectionRef.current = tab === DEFAULT_SECTION;
              }}
            />
          )}
        </div>
      )}
      {tab === "satellite" && (
        <SatelliteTab
          field={field}
          // From the flag, not a literal: with a hardcoded "S2" here, HLS_ENABLED controlled
          // nothing at all on this screen. UI_SENSORS[0] is "S2" today and stays "S2" when the
          // flag flips — the flag's job is to make the second sensor EXIST, not to replace the
          // first — but the dependency is now real and greppable.
          sensor={UI_SENSORS[0]}
          pickerVariant={pickerVariant}
          layout={layout}
          chartFullscreen={chartFullscreen}
          onOpenChartFullscreen={openChartFullscreen}
          onCloseChartFullscreen={closeChartFullscreen}
        />
      )}
      {tab === "weather" && <WeatherHistoryTab fieldId={field.id} />}
      {tab === "analysis" && (
        <div className="space-y-6">
          <AiTab fieldId={field.id} />
          <PeerSuggest fieldId={field.id} />
          <div id="photo-diagnose" className="scroll-mt-4">
            <PhotoDiagnose fieldId={field.id} />
          </div>
        </div>
      )}
      {tab === "fertilizer" && <FertilizerTab fieldId={field.id} />}
      {tab === "photos" && <PhotosTab fieldId={field.id} />}
      {tab === "soil" && <SoilLabUpload fieldId={field.id} />}
      {tab === "season" && (
        <div className="space-y-6">
          <SeasonCompareChart fieldId={field.id} />
          <SeasonTab fieldId={field.id} />
          {/* The backfill request UI lives here now. It used to sit under "zones", which was the
              only way to ask for past seasons at all — and past seasons are what this chart and the
              forecast's own-history rung are made of. Without forZones: the peak-season COGs only
              productivity zones needed are no longer written. */}
          <BackfillCard fieldId={field.id} />
        </div>
      )}
      {tab === "documents" && <DocumentsTab fieldId={field.id} />}
      {tab === "metadata" && <MetadataTab fieldId={field.id} />}
      {tab === "scouting" && <ScoutingTab fieldId={field.id} map={scout} />}
      {tab === "operations" && <OperationsTab fieldId={field.id} />}
    </div>
  );

  return (
      <>
        {undoBar}
        <FieldMapSheet
          stageRef={stageRef}
          onCamera={() => {
            // Camera FAB: open the AI (photo-diagnose) tab, then scroll straight to the
            // photo-diagnose card (D5.4+ guided capture). Content is in normal flow now, so a plain
            // scrollIntoView reaches it.
            const sp = new URLSearchParams(searchParams.toString());
            sp.set("tab", "analysis");
            sp.delete("map"); // same rule as setTab: a section change always leaves fullscreen
            sp.delete("chart");
            // Same bookkeeping setTab does, and the same rule: the flag means "the feed is the
            // entry underneath", so it is only true when we are leaving the feed.
            pushedSectionRef.current = tab === DEFAULT_SECTION;
            router.push(`${pathname}?${sp.toString()}`, { scroll: false });
            setTimeout(
              () => document.getElementById("photo-diagnose")?.scrollIntoView({ behavior: "smooth", block: "start" }),
              350,
            );
          }}
          header={
            <>
              {titleRow}
              {editing && <div className="mt-3">{editPanel}</div>}
            </>
          }
          mapCard={
            showCard ? (
              <FieldMapCard
                field={field}
                onOpenSatellite={() => setTab("satellite")}
                fullscreen={fullscreen}
                onOpenFullscreen={openFullscreen}
                onCloseFullscreen={closeFullscreen}
                pickerVariant={pickerVariant}
                {...scout.card}
              />
            ) : undefined
          }
          tabNav={tabNav}
          // Teardown §4.10 — the floating "AI aqronom" pill, and it belongs to the FEED only: in a
          // detail view the section the pill opens may already be the one on screen. Ours is free
          // where OneSoil paywalls it, which is exactly why it is worth a permanent shortcut.
          onOpenAi={feedMode ? () => setTab("analysis") : undefined}
        >
          {tabContent}
        </FieldMapSheet>
      </>
  );
}
