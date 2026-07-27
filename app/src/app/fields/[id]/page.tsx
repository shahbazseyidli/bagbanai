"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import {
  GROUP_OF, SECTION_GROUPS, groupSections, resolveSection, sectionOf, type SectionKey,
} from "@/lib/fieldSections";
import { ErrorNote, Spinner } from "@/components/ui";
import FieldPulse from "@/components/field/overview/FieldPulse";
import SignalsActions from "@/components/field/overview/SignalsActions";
import SatelliteTab from "@/components/field/SatelliteTab";
import FieldMapSheet from "@/components/field/FieldMapSheet";
import FieldMapCard from "@/components/field/FieldMapCard";
import { useUiV2 } from "@/lib/uiFlag";
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
import ShareButton from "@/components/field/ShareButton";
import BackfillCard from "@/components/field/BackfillCard";
import RainNowcast from "@/components/field/RainNowcast";
import FieldHeader from "@/components/field/FieldHeader";
import FieldWorkbench from "@/components/field/workbench/FieldWorkbench";
import { useStageWidth } from "@/components/field/workbench/useStageWidth";
import type { FieldDetail } from "@/lib/types";

// The status section becomes the two-column workbench when the measured stage can afford a rail
// plus a map still worth looking at.
//
// This was 920, which sounded reasonable and meant the workbench never appeared: the real stage on
// a 1440px laptop with the field list expanded — the single most common desktop setup — is 778px.
// The feature shipped unreachable. 760 is the honest floor: it leaves the map ~420px next to a
// 340px rail, which is a usable field map, and it is what the layout was actually being asked to
// handle. The rail steps up again as soon as there is room (see FieldWorkbench).
const WORKBENCH_MIN = 760;

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
  const v2 = useUiV2(); // D2.3 map-first presentation behind ?ui=v2

  const [field, setField] = useState<FieldDetail | null>(null);
  const [error, setError] = useState("");
  // Tab lives in the URL (?tab=) so notifications/Telegram can deep-link and the back button steps
  // through tabs instead of leaving the field (D0.3).
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tab: SectionKey = resolveSection(searchParams.get("tab"));
  function setTab(key: SectionKey) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", key);
    // A section change always leaves fullscreen: the param must never survive one, or tapping
    // "Peyk görüntüsü" from inside the overlay would land on the satellite section still covered.
    sp.delete("map");
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
  const wide = stageW !== null && stageW >= WORKBENCH_MIN;
  // 6.5 — "scouting" is the one exception to the wide rule. Its notes ARE map data: pins with no
  // map is a feature with its output removed, and the workbench only renders on the status
  // section, so a wide stage would otherwise leave this section mapless. Everywhere else the wide
  // answer is still "the workbench owns the map".
  const showCard =
    v2 && stageW !== null && !SECTION_OWNS_MAP.has(tab) && (!wide || tab === "scouting");
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
    (async () => {
      try {
        setField(await api.get<FieldDetail>(`/api/fields/${params.id}`));
      } catch (err) {
        setError(azError(err));
      }
    })();
  }, [params.id]);

  if (loading || !user) return <Spinner />;
  if (error) return <ErrorNote message={error} />;
  if (!field) return <Spinner />;

  // Field detail is presented two ways from the SAME state/handlers: the classic stacked layout,
  // and (behind ?ui=v2) the D2.3 map-first sheet. Build each piece once, then compose per branch.
  // The bottom offset carries the safe-area inset so the "Geri qaytar" button never lands in the
  // home-indicator / gesture strip, where the swipe would eat the tap.
  const undoBar = undoDeleted ? (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)_+_1rem)] z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-white shadow-lg">
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
      actions={
        !editing ? (
          <button
            onClick={openEdit}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <Settings className="h-4 w-4" /> {t("app.fieldDetail.editButton")}
          </button>
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
  const tabNav = (
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
      {tab === "status" && (
        <div>
          {stageW === null ? (
            // One frame. Rendering the stacked branch here would construct a MapLibre map on a wide
            // screen and tear it down again the moment the measurement lands.
            <div className="h-[460px] animate-pulse rounded-xl bg-paper-2" aria-hidden="true" />
          ) : wide ? (
            <div className="space-y-4">
              <RainNowcast fieldId={field.id} />
              <FieldWorkbench
                field={field}
                stageW={stageW}
                onOpenSatellite={() => setTab("satellite")}
                onOpenAnalysis={() => setTab("analysis")}
              />
            </div>
          ) : (
            // The satellite block is gone from here: FieldMapCard renders it above the nav, for
            // every section, and two /scenes read models would drift apart within one tap.
            <div className="space-y-4">
              <RainNowcast fieldId={field.id} />
              <FieldPulse field={field} />
              <SignalsActions fieldId={field.id} onOpenAnalysis={() => setTab("analysis")} />
              <ShareButton fieldId={field.id} />
            </div>
          )}
        </div>
      )}
      {tab === "satellite" && <SatelliteTab field={field} sensor="S2" />}
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

  if (v2) {
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
                {...scout.card}
              />
            ) : undefined
          }
          tabNav={tabNav}
        >
          {tabContent}
        </FieldMapSheet>
      </>
    );
  }

  // ?ui=v1 — the classic stacked layout. No map card here (it is a v2 frame slot), but the stage
  // still has to be measured: the status section's workbench/stacked choice reads the same number.
  return (
    <div ref={stageRef} className="space-y-6">
      {undoBar}
      {titleRow}
      {editing && editPanel}
      {tabNav}
      {tabContent}
    </div>
  );
}
