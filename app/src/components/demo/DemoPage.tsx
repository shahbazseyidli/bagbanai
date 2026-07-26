"use client";

// /demo — the public demo-field tour. Rendered for SIGNED-OUT visitors on the marketing apex, and
// for signed-in ones too (they get a different CTA, not a different page).
//
// It calls exactly ONE endpoint, GET /api/public/demo, which is unauthenticated and takes no
// parameter of any kind. Nothing on this page may reach an authenticated route: the four blocks are
// read-only presentational components (components/demo/*) precisely so that a later edit cannot
// quietly add a fetch or a write button to a page whose whole audience is anonymous.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Eye, Leaf, MapPin, Ruler } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";
import { t } from "@/lib/i18n";
import { cropLabelOf } from "@/lib/insights";
import { useFormatArea } from "@/lib/units";
import type { Polygon } from "@/lib/types";
import DemoPulse, { type DemoWellness } from "./DemoPulse";
import DemoSatellite, { type DemoScene } from "./DemoSatellite";
import DemoSignals, { type DemoAdvice } from "./DemoSignals";
import DemoWeather, { type DemoDay } from "./DemoWeather";
import DemoTour, { tourAnchor, type TourStep } from "./DemoTour";

interface DemoPayload {
  field: {
    name: string;
    area_ha: number | null;
    crop_type: string | null;
    region: string | null;
    geom: Polygon | null;
    centroid: { type: string; coordinates: [number, number] } | null;
  };
  wellness: DemoWellness | null;
  timeline: DemoScene[] | null;
  advice: DemoAdvice | null;
  // An object rather than a bare list on purpose (see routers/demo.py): a later addition — alerts,
  // a spray window — must not change the shape this page already parses.
  weather: { days: DemoDay[] } | null;
}

// Skipping is a decision too: the tour must not reopen on every visit. The flag only governs the
// AUTO-open — "show the tour again" replays it without clearing anything.
const SEEN_KEY = "bagban_demo_tour";

const STEPS: TourStep[] = [
  { anchor: "map", titleKey: "mkt.demo.tour.s1.title", bodyKey: "mkt.demo.tour.s1.body" },
  { anchor: "timeline", titleKey: "mkt.demo.tour.s2.title", bodyKey: "mkt.demo.tour.s2.body" },
  { anchor: "pulse", titleKey: "mkt.demo.tour.s3.title", bodyKey: "mkt.demo.tour.s3.body" },
  { anchor: "signals", titleKey: "mkt.demo.tour.s4.title", bodyKey: "mkt.demo.tour.s4.body" },
  { anchor: "cta", titleKey: "mkt.demo.tour.s5.title", bodyKey: "mkt.demo.tour.s5.body" },
];

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode / quota — the tour simply auto-opens again next visit */
  }
}

export default function DemoPage() {
  const [data, setData] = useState<DemoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);
  const { user } = useAuth();
  // Signed-out visitor: the unit preference read 401s and the hook falls back to the locale default.
  const fmtArea = useFormatArea();

  useEffect(() => {
    let active = true;
    api
      .get<DemoPayload>("/api/public/demo")
      .then((d) => {
        if (active) setData(d ?? null);
      })
      .catch(() => {
        // No field is flagged is_demo yet, or the platform is mid-deploy. Either way the visitor
        // gets the graceful "not available" state, never an error code.
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Auto-open once, AFTER the data has painted — a tour pinned to blocks that do not exist yet
  // would ring empty space.
  useEffect(() => {
    if (!data) return;
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      seen = true;
    }
    if (!seen) setTourOpen(true);
  }, [data]);

  const closeTour = useCallback(() => setTourOpen(false), []);

  // One CTA, computed once and shared by the tour card, the hero and the closing block. A signed-in
  // visitor goes to /onboarding, which already creates the org/farm silently when they are missing,
  // so nothing here has to ask the server how many fields they own.
  const cta = useMemo(
    () => (user
      ? { href: "/onboarding", label: t("mkt.demo.ctaAddField") }
      : { href: "/signup", label: t("landing.ctaSignup") }),
    [user],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <Spinner label={t("mkt.demo.loading")} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl space-y-5 py-10 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">{t("mkt.demo.unavailableTitle")}</h1>
        <p className="text-[14px] leading-relaxed text-ink-soft">{t("mkt.demo.unavailableBody")}</p>
        <Link
          href={cta.href}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-grass px-5 text-base font-bold text-white hover:bg-grass-deep"
        >
          {cta.label} <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const field = data.field;
  const timeline = data.timeline ?? [];
  const weather = data.weather?.days ?? [];
  const cropLabel = field.crop_type ? cropLabelOf(field.crop_type) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <header className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-grass">
          {t("mkt.demo.eyebrow")}
        </p>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-bold leading-tight tracking-tight text-ink">
          {t("mkt.demo.title")}
        </h1>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
          {t("mkt.demo.subtitle")}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1 text-[13px] font-semibold text-grass-deep">
            <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
            {field.name}
          </span>
          {field.area_ha != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-panel-2 px-3 py-1 text-[13px] font-medium text-ink-soft">
              <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
              {fmtArea(field.area_ha)}
            </span>
          )}
          {cropLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-panel-2 px-3 py-1 text-[13px] font-medium text-ink-soft">
              {cropLabel}
            </span>
          )}
          {field.region && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-panel-2 px-3 py-1 text-[13px] font-medium text-ink-soft">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {field.region}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line px-3 py-1 text-[12.5px] font-semibold text-ink-soft">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {t("mkt.demo.readOnlyBadge")}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setTourOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-line bg-panel px-4 text-[14px] font-semibold text-ink-soft hover:border-grass hover:text-grass-deep"
        >
          <Compass className="h-4 w-4" aria-hidden="true" />
          {t("mkt.demo.startTour")}
        </button>
      </header>

      <DemoSatellite
        polygon={field.geom}
        timeline={timeline}
        activeIdx={sceneIdx}
        onPick={setSceneIdx}
      />

      {data.wellness && (
        <div {...tourAnchor("pulse")}>
          <DemoPulse wellness={data.wellness} />
        </div>
      )}

      <div {...tourAnchor("signals")}>
        <DemoSignals advice={data.advice} />
      </div>

      {weather.length > 0 && <DemoWeather days={weather} />}

      <section
        {...tourAnchor("cta")}
        className="rounded-2xl border-[1.5px] border-mint bg-mint-soft p-5 text-center"
      >
        <h2 className="font-display text-[20px] font-bold text-grass-deep">{t("mkt.demo.ctaTitle")}</h2>
        <p className="mx-auto mt-2 max-w-[52ch] text-[14px] leading-relaxed text-ink-soft">
          {t("mkt.demo.ctaBody")}
        </p>
        <Link
          href={cta.href}
          className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-grass px-5 text-base font-bold text-white hover:bg-grass-deep"
        >
          {cta.label} <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
        <p className="mt-3 text-[12.5px] text-ink-soft">{t("mkt.demo.ctaFine")}</p>
        <button
          type="button"
          onClick={() => setTourOpen(true)}
          className="mt-3 min-h-9 text-[12.5px] font-semibold text-grass underline-offset-2 hover:text-grass-deep hover:underline"
        >
          {t("mkt.demo.replayTour")}
        </button>
      </section>

      <DemoTour
        steps={STEPS}
        open={tourOpen}
        ctaHref={cta.href}
        ctaLabel={cta.label}
        onClose={closeTour}
        onFinish={markSeen}
      />
    </div>
  );
}
