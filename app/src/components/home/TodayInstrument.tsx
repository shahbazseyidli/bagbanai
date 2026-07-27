"use client";

// W2 — the wide "Bu gün" instrument row: the multi-field map as a primary object on the left, and
// everything that demands a decision today (weather, the worst field, the open alerts) as a
// scrolling rail beside it.
//
// NEVER sticky, never fixed, no transformed ancestor between this and the MapLibre canvas — that is
// the failure this codebase has hit more than once (a sticky ancestor leaves the canvas blank until
// something forces a resize). The row's height is a LITERAL class, so the container has a definite
// height before the map mounts and can never lay out at 0x0.
//
// The height is fixed rather than viewport-derived on purpose. FieldWorkbench can take
// calc(100dvh - top) because it is the last thing on its page; this row is not — "Sahələrim"
// follows it, and the whole point of that grid is that it stays visible beside the numbers.
import { t } from "@/lib/i18n";
import FieldsOverviewMap, { type GeoField } from "@/components/FieldsOverviewMap";
import AttentionHero from "@/components/home/AttentionHero";
import WeatherBar from "@/components/home/WeatherBar";
import AlertList, { type TodayAlert } from "@/components/home/AlertList";
import type { FieldScore } from "@/components/home/ScoreBadge";
import type { FieldToday } from "@/lib/today";

export default function TodayInstrument({
  geoFields,
  scores,
  stageW,
  weather,
  worst,
  worstScore,
  alerts,
  alertsMore,
}: {
  geoFields: GeoField[];
  /** Already loaded by TodayHome — passed so the map does NOT repeat the org-wide score request. */
  scores: Record<string, FieldScore>;
  /** Measured stage width in px — already known to be at or above the wide threshold. */
  stageW: number;
  weather: { lat: number; lon: number; label: string; fieldId: string } | null;
  worst: FieldToday | null;
  worstScore?: FieldScore;
  alerts: TodayAlert[];
  /** How many unread alerts the rail is not showing. */
  alertsMore: number;
}) {
  // COMPLETE literals, mirrored from FieldWorkbench so the product's two wide screens agree instead
  // of drifting: Tailwind's scanner cannot see a class name assembled from a template string, and a
  // missing grid-cols silently collapses this into one column.
  const cols =
    stageW >= 1280
      ? "grid-cols-[minmax(0,1fr)_400px]"
      : stageW >= 1000
        ? "grid-cols-[minmax(0,1fr)_360px]"
        : "grid-cols-[minmax(0,1fr)_340px]";
  const rowH = stageW >= 1000 ? "h-[460px]" : "h-[420px]";

  // A basemap with no polygons on it is a fabricated object — it looks like a map of your farm and
  // is a map of nothing. Gate on real geometry, not on the array being non-empty.
  const hasGeom = geoFields.some((g) => g?.geom != null);

  const railInner = (
    <>
      {weather && (
        <WeatherBar
          lat={weather.lat}
          lon={weather.lon}
          placeLabel={weather.label}
          fieldId={weather.fieldId}
        />
      )}

      {worst && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-slate-600">
            {t("app.home.todayHome.attentionNeeded")}
          </h2>
          <AttentionHero ft={worst} score={worstScore} />
        </section>
      )}

      <AlertList alerts={alerts} compact more={alertsMore} />
    </>
  );

  // Nothing the rail can carry — every field is fine, no weather point, no unread alert. An empty
  // 340px column beside the map would read as a panel that failed to load, so the map takes the
  // whole stage instead. (WeatherBar can still self-hide when its own fetches come back empty;
  // that leaves a shorter rail, not a hollow one.)
  const hasRail = weather != null || worst != null || alerts.length > 0;

  // Nothing mappable: the rail takes the full stage and flows with the page instead of scrolling
  // inside a height it no longer needs.
  if (!hasGeom) {
    // An empty labelled landmark is worse than no landmark, so with nothing on either side this
    // renders nothing at all and the field grid moves up.
    if (!hasRail) return null;
    return (
      <section aria-label={t("app.home.instrument.railAria")} className="flex flex-col gap-3">
        {railInner}
      </section>
    );
  }

  if (!hasRail) {
    return (
      <section aria-label={t("today.fieldsOnMap")} className={rowH}>
        <FieldsOverviewMap fields={geoFields} heightClass="h-full" scores={scores} />
      </section>
    );
  }

  return (
    <div className={`grid ${cols} ${rowH} gap-4`}>
      {/* min-h-0 / min-w-0 are load-bearing: grid items default to min-height:auto, so without them
          the rail refuses to shrink and pushes the row past its own height instead of scrolling. */}
      <section aria-label={t("today.fieldsOnMap")} className="h-full min-h-0 min-w-0">
        <FieldsOverviewMap fields={geoFields} heightClass="h-full" scores={scores} />
      </section>

      {/* overflow-y-auto WITHOUT overscroll-contain. Scroll chaining has to stay ON here: this row
          only exists above a 760px stage, which is a mouse and a trackpad, and the page itself
          scrolls (the field grid sits below). Containment would mean that once the ~500px rail
          bottoms out inside its 420/460px box, the wheel stops dead over a third of the screen and
          the user cannot reach "Sahələrim" without moving the pointer off the rail. The gesture it
          protects — a sheet over a locked backdrop — cannot occur on this branch by construction. */}
      <aside
        aria-label={t("app.home.instrument.railAria")}
        className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-y-auto"
      >
        {railInner}
      </aside>
    </div>
  );
}
