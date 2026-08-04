"use client";

// The wide "Bu gün" workspace row, rebuilt as the reference dashboard's lower half: a toolbar
// (scope dropdown + a segmented strip that chooses what the map is coloured BY + the feed toggle),
// the multi-field map as the primary object, and the Intelligence Feed beside it.
//
// SCOPE: this component only ever renders above a MEASURED 760px stage (TodayHome decides, from
// useStageWidth — never a media query, because the stage is narrower at xl than at lg once the field
// list appears). The phone renders TodayHome's stacked branch and never reaches this file.
//
// NEVER sticky, never fixed, no transformed ancestor between this and the MapLibre canvas — that is
// the failure this codebase has hit more than once (a sticky ancestor leaves the canvas blank until
// something forces a resize). The feed's scroll container is a SIBLING column, not an ancestor of
// the map. Row heights are LITERAL classes, so the map's box has a definite height before the map
// mounts and can never lay out at 0x0.
//
// The heights are fixed rather than viewport-derived on purpose. FieldWorkbench can take
// calc(100dvh - top) because it is the last thing on its page; this row is not — "Sahələrim"
// follows it, and the whole point of that grid is that it stays visible beside the numbers.
import { useEffect, useState } from "react";
import { PanelRightOpen } from "lucide-react";
import { t } from "@/lib/i18n";
import DashboardMap, { type DashMode } from "@/components/home/DashboardMap";
import IntelligenceFeed from "@/components/home/IntelligenceFeed";
import type { TodayAlert } from "@/components/home/AlertList";
import type { FieldScore } from "@/components/home/ScoreBadge";
import type { SatelliteSummary } from "@/components/home/TodayStats";
import type { FieldToday } from "@/lib/today";
import type { Field } from "@/lib/types";

/** Structural shape of a row of GET /api/fields/geo, declared locally for the same reason
 *  DashboardMap declares its own: this file takes no build dependency on FieldsOverviewMap. */
interface GeoRow {
  id: string;
  name: string;
  area_ha: number | null;
  data_status?: string;
  geom: { type: "Polygon"; coordinates: number[][][] } | null;
}

/** Remembered per browser, same convention as the shell's bagban_fieldlist_collapsed. */
const FEED_COLLAPSED_KEY = "bagban_home_feed_collapsed";

/** How many unread alerts the feed lists before deferring to "see all". */
const FEED_ALERTS = 3;

const MODES: { id: DashMode; i18n: "app.home.dash.viewHealth" | "app.home.dash.viewAlerts" | "app.home.dash.viewWeather" }[] = [
  { id: "health", i18n: "app.home.dash.viewHealth" },
  { id: "alerts", i18n: "app.home.dash.viewAlerts" },
  { id: "weather", i18n: "app.home.dash.viewWeather" },
];

export default function TodayInstrument({
  fields,
  geoFields,
  scores,
  stageW,
  weather,
  weatherFor,
  worst,
  worstScore,
  alertsAll,
  alertsCapped,
  openAlerts,
  satellite,
}: {
  /** Every field in the org — the feed's health list covers all of them, geometry or not. */
  fields: Field[];
  /** Only the fields the API could return geometry for; the map and the scope dropdown use these. */
  geoFields: GeoRow[];
  /** Already loaded by TodayHome — passed so the map does NOT repeat the org-wide score request. */
  scores: Record<string, FieldScore>;
  /** Measured stage width in px — already known to be at or above the wide threshold. */
  stageW: number;
  /** Where the weather bar points when the scope is "all fields" (TodayHome picks the worst field). */
  weather: { lat: number; lon: number; label: string; fieldId: string } | null;
  /** Centroid lookup for a scoped field. Owned by TodayHome so `pointOf` has one implementation. */
  weatherFor: (fieldId: string) => { lat: number; lon: number; label: string; fieldId: string } | null;
  worst: FieldToday | null;
  worstScore?: FieldScore;
  /** The WHOLE unread critical/warning list — the map colours from it, the feed shows a slice.
   *  null means the request failed, which is not the same as "no alerts". */
  alertsAll: TodayAlert[] | null;
  alertsCapped: boolean;
  /** Rows whose RULE is still matching, read or not — the feed leads with these, the map does not
   *  use them (it colours from unread severity and says so in its own legend caveat). */
  openAlerts: TodayAlert[];
  satellite: SatelliteSummary | null;
}) {
  const [selected, setSelected] = useState("");
  const [mode, setMode] = useState<DashMode>("health");
  // Starts open and is corrected from storage after mount: reading localStorage in the initial
  // state would make the server-rendered markup and the first client render disagree.
  const [feedOpen, setFeedOpen] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(FEED_COLLAPSED_KEY) === "1") setFeedOpen(false);
    } catch {
      /* private mode / disabled storage — the panel simply stays open */
    }
  }, []);

  function toggleFeed(open: boolean) {
    setFeedOpen(open);
    try {
      window.localStorage.setItem(FEED_COLLAPSED_KEY, open ? "0" : "1");
    } catch {
      /* ignore */
    }
  }

  // A basemap with no polygons on it is a fabricated object — it looks like a map of your farm and
  // is a map of nothing. Gate on real geometry, not on the array being non-empty.
  const mappable = geoFields.filter((g) => g?.geom != null);
  const hasGeom = mappable.length > 0;

  // Self-healing scope: if the selection no longer exists (org switch, field deleted) it falls back
  // to "all fields" without an effect, and the <select> value stays one of its own options.
  const scoped = mappable.find((g) => g.id === selected) ?? null;
  const scopeValue = scoped ? scoped.id : "";
  const drawn = scoped ? [scoped] : mappable;

  // The feed's two alert groups get separate budgets: an OPEN condition outranks an unread row that
  // may already be over, so it must never be pushed out of the panel by three notifications the
  // farmer simply has not opened yet.
  const shownOpen = openAlerts.slice(0, FEED_ALERTS);
  const openIds = new Set(shownOpen.map((a) => a.id));
  const shownAlerts = (alertsAll ?? []).filter((a) => !openIds.has(a.id)).slice(0, FEED_ALERTS);
  // Counted by id over the unread list, not by subtracting lengths: the two groups overlap (an open
  // alert is usually also unread) and openAlerts may contain rows that are not in alertsAll at all
  // (already read), so arithmetic on the lengths can undercount and even go negative.
  const shownIds = new Set([...openIds, ...shownAlerts.map((a) => a.id)]);
  const alertsMore = (alertsAll ?? []).filter((a) => !shownIds.has(a.id)).length;
  const scopedWeather = scoped ? weatherFor(scoped.id) : weather;
  const satRowCount = satellite
    ? [satellite.ready, satellite.partial, satellite.preparing, satellite.failed, satellite.notStarted]
        .filter((n) => n > 0).length
    : 0;
  const scoredCount = fields.filter((f) => scores[f?.id] != null).length;

  // Everything the feed could carry beyond its two always-present blocks (the health group's own
  // empty state and the quick actions). With nothing mappable AND nothing substantive to say, this
  // whole row steps aside and the field grid moves up — the behaviour the rail had before.
  const hasSubstance =
    worst != null || shownOpen.length > 0 || shownAlerts.length > 0 || scopedWeather != null ||
    satRowCount > 0 || scoredCount > 0;
  if (!hasGeom && !hasSubstance) return null;

  // COMPLETE literals, mirrored from FieldWorkbench so the product's two wide screens agree instead
  // of drifting: Tailwind's scanner cannot see a class name assembled from a template string, and a
  // missing grid-cols silently collapses this into one column.
  const cols = stageW >= 1280 ? "grid-cols-[minmax(0,1fr)_400px]" : "grid-cols-[minmax(0,1fr)_360px]";
  const rowH = stageW >= 1280 ? "h-[560px]" : stageW >= 1000 ? "h-[500px]" : "h-[420px]";
  // Below 1000px the feed goes UNDER the map and flows with the page instead of scrolling inside a
  // rail. A 340px rail at a 900px stage leaves the map barely 540px, which is not the "large map as
  // the primary object" this screen is built around.
  const sideBySide = stageW >= 1000 && feedOpen && hasGeom;

  const feed = (
    <IntelligenceFeed
      onClose={() => toggleFeed(false)}
      weather={scopedWeather}
      worst={worst}
      worstScore={worstScore}
      alerts={shownAlerts}
      openAlerts={shownOpen}
      alertsMore={alertsMore}
      satellite={satellite}
      fields={fields}
      scores={scores}
    />
  );

  const map = (
    <DashboardMap
      fields={drawn}
      scores={scores}
      alerts={alertsAll}
      alertsCapped={alertsCapped}
      mode={mode}
      heightClass="h-full"
    />
  );

  return (
    // The landmark is named for what it actually contains: with no geometry there is no map in
    // here, and announcing "Sahələr xəritədə" to a screen reader would be a promise of a map.
    <section
      aria-label={hasGeom ? t("today.fieldsOnMap") : t("app.home.instrument.railAria")}
      className="flex flex-col gap-3"
    >
      {/* Toolbar. The scope dropdown lists only fields the map can DRAW — offering a field with no
          geometry in a map filter would be an option that does nothing. The KPI tiles above stay
          org-wide whatever is selected here, which is why the reference puts this control below the
          cards rather than above them. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hasGeom ? (
          <select
            value={scopeValue}
            onChange={(e) => setSelected(e.target.value)}
            aria-label={t("app.home.dash.fieldSelectAria")}
            className="input max-w-[260px]"
          >
            <option value="">{t("app.home.dash.allFields")}</option>
            {mappable.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {/* role="group" with aria-pressed buttons, deliberately NOT role="tablist": a tablist
              without roving tabindex and arrow-key navigation is a half-implemented ARIA pattern
              that announces keyboard affordances it does not have. */}
          {hasGeom && (
            <div
              role="group"
              aria-label={t("app.home.dash.viewGroupAria")}
              className="flex items-center gap-1 rounded-xl2 border-[1.5px] border-line bg-panel p-1"
            >
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={`min-h-[var(--tap)] rounded-lg px-3 text-sm font-semibold transition-colors ${
                    mode === m.id
                      ? "bg-emerald-600 text-white"
                      : "text-ink-soft hover:bg-slate-100"
                  }`}
                >
                  {t(m.i18n)}
                </button>
              ))}
            </div>
          )}

          {!feedOpen && (
            <button
              type="button"
              onClick={() => toggleFeed(true)}
              aria-label={t("app.home.dash.openFeed")}
              title={t("app.home.dash.openFeed")}
              className="grid min-h-[var(--tap)] min-w-[var(--tap)] place-items-center rounded-xl2 border-[1.5px] border-line bg-panel text-ink-soft transition-colors hover:border-mint"
            >
              <PanelRightOpen className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {!hasGeom ? (
        // Nothing to draw: the feed takes the whole stage and flows with the page instead of
        // scrolling inside a height it no longer needs.
        feedOpen ? feed : null
      ) : (
        // ONE tree for both layouts, switched by CLASSES rather than by shape.
        //
        // This used to be two branches — a `<div class="grid …">` and a `<>…</>` — chosen by
        // `sideBySide`, which includes `feedOpen`. React cannot reconcile a div with a Fragment, so
        // closing or reopening the feed unmounted this whole subtree: MapLibre was destroyed and
        // rebuilt, the farmer's pan and zoom were thrown away and refitted, and in weather mode the
        // rain-nowcast fan-out re-ran. Same elements in the same positions now, so the map instance
        // survives a toggle and only its box changes.
        <div className={sideBySide ? `grid ${cols} ${rowH} gap-4` : "flex flex-col gap-4"}>
          {/* min-h-0 / min-w-0 are load-bearing in the grid layout: grid items default to
              min-height:auto, so without them the rail refuses to shrink and pushes the row past
              its own height instead of scrolling. */}
          <div className={sideBySide ? "h-full min-h-0 min-w-0" : rowH}>{map}</div>

          {/* overflow-y-auto WITHOUT overscroll-contain, and only while side-by-side. Scroll
              chaining has to stay ON: this row only exists above a 760px stage, which is a mouse
              and a trackpad, and the page itself scrolls (the field grid sits below). Containment
              would mean that once the feed bottoms out inside its 500/560px box the wheel stops
              dead over a third of the screen and the user cannot reach "Sahələrim" without moving
              the pointer off the rail. The gesture it protects — a sheet over a locked backdrop —
              cannot occur on this branch by construction. Stacked, the feed just flows. */}
          {feedOpen && (
            <aside className={sideBySide ? "h-full min-h-0 min-w-0 overflow-y-auto" : ""}>
              {feed}
            </aside>
          )}
        </div>
      )}
    </section>
  );
}
