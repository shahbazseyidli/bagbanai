"use client";

// The phone's field screen: ONE continuous scroll, no tabs (OneSoil teardown §3 — "sahə detalında
// TAB YOXDUR"). It is the body of ?tab=status on a narrow measured stage, nothing else; every other
// section still renders exactly what it rendered before, as a detail view.
//
// What is ABOVE this component is not an accident of layout. FieldMapSheet mounts header → map card
// → nav → children, so the feed's first two stops — the map card and, inside it, the scene history
// strip — are already on screen when this renders. Reproducing either here would mean a second
// /scenes read model on the same screen, which is the drift FieldMapCard's own header warns about.
//
// Order (brief + teardown §3):
//   1 map card        FieldMapCard, above, untouched     → its "Ətraflı təhlil" opens ?tab=satellite
//   2 scene history   the card's date strip, above
//   3 health          FieldPulse
//   4 AI advice       SignalsActions (keeps its own "Tam sahə analizi" hand-off)
//   5 weather         WeatherGlance + "Ətraflı hava" → ?tab=weather
//   6 spraying        SprayWindowCard (rain nowcast + modelled window + alerts)
//   7 Daha çox        every section the six blocks above do NOT reach
//   8 share
//
// NOTHING here fetches on behalf of a child: each block owns its own request exactly as it did when
// it lived in a tab, so opening the feed costs the same calls the status section already made plus
// the two new blocks' own (Open-Meteo daily, and the knowledge passport the analysis side reads
// anyway).
import { t } from "@/lib/i18n";
import FieldPulse from "@/components/field/overview/FieldPulse";
import SignalsActions from "@/components/field/overview/SignalsActions";
import ShareButton from "@/components/field/ShareButton";
import FeedBlock from "./FeedBlock";
import WeatherGlance from "./WeatherGlance";
import SprayWindowCard from "./SprayWindowCard";
import MoreSections from "./MoreSections";
import type { FieldDetail } from "@/lib/types";

export default function FieldFeed({
  field,
  pathname,
  search,
  onOpenAnalysis,
  onOpenWeather,
  onNavigateSection,
}: {
  field: FieldDetail;
  /** The page's pathname + query, so the "Daha çox" links keep every other param. */
  pathname: string;
  search: string;
  onOpenAnalysis: () => void;
  onOpenWeather: () => void;
  /** Fired just before a "Daha çox" link pushes, so the page can own the history entry. */
  onNavigateSection?: () => void;
}) {
  return (
    <div className="space-y-5">
      <FeedBlock title={t("app.field.feed.healthTitle")}>
        <FieldPulse field={field} />
      </FeedBlock>

      {/* No FeedBlock: SignalsActions is a full card with its own heading, timestamp and hand-off
          button — wrapping it would print two titles for one thing. */}
      <SignalsActions fieldId={field.id} onOpenAnalysis={onOpenAnalysis} />

      <FeedBlock
        title={t("app.field.feed.weatherTitle")}
        action={{ label: t("app.field.weatherGlance.more"), onClick: onOpenWeather }}
      >
        <WeatherGlance field={field} />
      </FeedBlock>

      <FeedBlock title={t("app.field.feed.sprayTitle")}>
        <SprayWindowCard fieldId={field.id} />
      </FeedBlock>

      <MoreSections pathname={pathname} search={search} onNavigate={onNavigateSection} />

      <ShareButton fieldId={field.id} />
    </div>
  );
}
