"use client";

// The dashboard's right-hand panel — the reference design's "Intelligence Feed": a titled column of
// small-caps groups separated by hairlines, each one a different question the farmer might be here
// to answer, in decision-urgency order.
//
// EVERY GROUP IS EXISTING MATERIAL. Nothing here fetches anything: the attention hero, the alert
// rows, the weather bar, the satellite buckets and the wellness scores are all state TodayHome
// already holds for the tiles and the map. The panel is a re-arrangement, not a new data source —
// which is also why a group that has nothing to say renders NOTHING rather than an empty shell with
// a heading over it.
import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, ChevronRight, MoreHorizontal, Plus, Sprout, X } from "lucide-react";
import { t, tf } from "@/lib/i18n";
import AlertList, { type TodayAlert } from "./AlertList";
import AttentionHero from "./AttentionHero";
import WeatherBar from "./WeatherBar";
import { bandOf, type FieldScore } from "./ScoreBadge";
import type { SatelliteSummary } from "./TodayStats";
import type { FieldToday } from "@/lib/today";
import type { Tone } from "@/lib/indexStatus";
import type { Field } from "@/lib/types";

/** The five pipeline buckets, in the order a farmer cares about them. Colours match the processing
 *  palette DashboardMap paints "no score yet" fields with, so the panel and the map agree.
 *  `total` is deliberately absent: it is the denominator, not a bucket. */
const SAT_ROWS: { key: Exclude<keyof SatelliteSummary, "total">; color: string; i18n: string }[] = [
  { key: "ready", color: "#10b981", i18n: "app.home.sat.ready" },
  { key: "partial", color: "#f59e0b", i18n: "app.home.sat.partial" },
  { key: "preparing", color: "#94a3b8", i18n: "app.home.sat.preparing" },
  { key: "failed", color: "#B91C1C", i18n: "app.home.sat.failed" },
  { key: "notStarted", color: "#CBD5E1", i18n: "app.home.sat.notStarted" },
];

const BAND_DOT: Record<Tone, string> = { good: "bg-good", warn: "bg-warn", bad: "bg-bad" };

function GroupTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{children}</h3>
  );
}

export default function IntelligenceFeed({
  onClose,
  weather,
  worst,
  worstScore,
  alerts,
  alertsMore,
  satellite,
  fields,
  scores,
}: {
  onClose: () => void;
  weather: { lat: number; lon: number; label: string; fieldId: string } | null;
  worst: FieldToday | null;
  worstScore?: FieldScore;
  alerts: TodayAlert[];
  /** How many unread alerts the list is not showing — drives AlertList's "see all" link. */
  alertsMore: number;
  /** null = GET /api/fields/geo failed; the group then stays out rather than claiming zeros. */
  satellite: SatelliteSummary | null;
  fields: Field[];
  scores: Record<string, FieldScore>;
}) {
  const scored = fields
    .map((f) => ({ field: f, score: scores[f?.id] }))
    .filter((r): r is { field: Field; score: FieldScore } => r.score != null && typeof r.score.score === "number")
    .sort((a, b) => a.score.score - b.score.score);

  // Built with a loop rather than a filter so the count travels WITH the row: reading it back out of
  // `satellite` inside the JSX would need a second null check for a value already proven present.
  const satRows: { key: string; color: string; i18n: string; n: number }[] = [];
  if (satellite) {
    for (const r of SAT_ROWS) {
      const n = satellite[r.key];
      if (n > 0) satRows.push({ key: r.key, color: r.color, i18n: r.i18n, n });
    }
  }

  return (
    <section
      aria-label={t("app.home.feed.title")}
      className="rounded-xl2 border-[1.5px] border-line bg-panel shadow-soft"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="truncate text-sm font-bold text-ink">{t("app.home.feed.title")}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("app.home.dash.closeFeed")}
          title={t("app.home.dash.closeFeed")}
          className="-mr-2 grid min-h-[var(--tap)] min-w-[var(--tap)] place-items-center rounded-lg text-ink-soft transition-colors hover:bg-slate-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="divide-y divide-line">
        {/* 1 — the single worst field. Same component, same data as the phone screen's hero. */}
        {worst && (
          <div className="space-y-2 px-4 py-3">
            <GroupTitle>{t("app.home.todayHome.attentionNeeded")}</GroupTitle>
            <AttentionHero ft={worst} score={worstScore} />
          </div>
        )}

        {/* 2 — unread critical/warning notifications, each deep-linking to its field. */}
        {alerts.length > 0 && (
          <div className="space-y-2 px-4 py-3">
            <GroupTitle>{t("app.home.feed.alerts")}</GroupTitle>
            <AlertList alerts={alerts} compact more={alertsMore} />
          </div>
        )}

        {/* 3 — live conditions over the field currently in scope (keyless Open-Meteo + nowcast).
            The heading is passed INTO WeatherBar rather than wrapped around it: the bar renders
            nothing at all when neither of its two sources answers, and a "HAVA" heading left
            standing over that gap would be a labelled empty landmark — worse than no landmark. */}
        {weather && (
          <div className="px-4 py-3 empty:hidden">
            <WeatherBar
              lat={weather.lat}
              lon={weather.lon}
              placeLabel={weather.label}
              fieldId={weather.fieldId}
              heading={t("app.home.feed.weather")}
            />
          </div>
        )}

        {/* 4 — the pipeline breakdown the KPI tile can only summarise in one line. Every non-zero
            bucket appears here, so a failure is never hidden behind a larger "preparing" count. */}
        {satRows.length > 0 && (
          <div className="space-y-2 px-4 py-3">
            <GroupTitle>{t("app.home.sat.label")}</GroupTitle>
            <ul className="space-y-1.5">
              {satRows.map((r) => (
                <li key={r.key} className="flex items-center gap-2 text-sm text-slate-700">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: r.color }}
                    aria-hidden="true"
                  />
                  {tf(r.i18n, { n: r.n })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 5 — one row per field that HAS a stored wellness score, worst first. A field with no
            stored row is left out entirely and the coverage line below says how many that is; there
            is no bar drawn from a number we do not have.
            NO TREND ARROW: the read model returns the latest score only, so an arrow would have to
            be invented from a comparison we never fetched. */}
        <div className="space-y-2 px-4 py-3">
          <GroupTitle>{t("app.home.feed.health")}</GroupTitle>
          {scored.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("app.home.feed.healthEmpty")}</p>
          ) : (
            <>
              <ul className="space-y-1.5">
                {scored.map(({ field, score }) => {
                  const band = bandOf(score);
                  return (
                    <li key={field.id}>
                      <Link
                        href={`/fields/${field.id}`}
                        className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-slate-50"
                      >
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${BAND_DOT[band]}`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                          {field.name}
                        </span>
                        {/* The bar is the score itself, so its width is an inline style: a Tailwind
                            class assembled from a number would never reach the generated CSS. */}
                        <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-slate-200">
                          <span
                            className={`block h-full rounded-full ${BAND_DOT[band]}`}
                            style={{ width: `${Math.max(0, Math.min(100, score.score))}%` }}
                          />
                        </span>
                        <span className="w-8 shrink-0 text-right text-sm font-bold tabular-nums text-slate-800">
                          {score.score}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {scored.length < fields.length && (
                <p className="text-[12px] text-ink-soft">
                  {tf("app.home.stats.coverage", { covered: scored.length, total: fields.length })}
                </p>
              )}
            </>
          )}
        </div>

        {/* 6 — four destinations that exist. Labels reuse the navigation's own words so the panel
            cannot invent a route or rename one. */}
        <div className="space-y-2 px-4 py-3">
          <GroupTitle>{t("app.home.feed.quick")}</GroupTitle>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/onboarding" className="btn-ghost justify-start border border-line text-sm">
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t("bnav.addField")}</span>
            </Link>
            <Link href="/fields" className="btn-ghost justify-start border border-line text-sm">
              <Sprout className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t("bnav.fields")}</span>
            </Link>
            <Link href="/notifications" className="btn-ghost justify-start border border-line text-sm">
              <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t("nav.notifications")}</span>
            </Link>
            <Link href="/more" className="btn-ghost justify-start border border-line text-sm">
              <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t("bnav.more")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* The panel's only outbound link that is not a group of its own — kept at the foot so the
          groups above stay pure content. */}
      <div className="border-t border-line px-4 py-2.5">
        <Link
          href="/fields"
          className="inline-flex min-h-[var(--tap)] items-center gap-1 text-sm font-bold text-emerald-700"
        >
          {t("app.home.todayHome.myFields")}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
