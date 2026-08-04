"use client";

// The KPI header on the wide "Bu gün" dashboard: EIGHT tiles in a 4-across, 2-row grid — how many
// fields, how much land, how healthy on average, how many alerts are open (row 1), then how many
// fields are flagged, how far the satellite pipeline has got, how many fields have a standing
// irrigation recommendation, and the date of the newest scene (row 2).
//
// The reference dashboard this is modelled on carries eight tiles including MARKET INTELLIGENCE and
// a soil count. We have neither, so those slots are NOT filled with a plausible-looking figure —
// they were replaced by four things the API already serves. Every number on this row has to survive
// the question "where did that come from", and the four rules below are how it does.
//
// THE HONESTY RULES, all of them in this one file:
//   • Unknown is an em-dash, and the dash explains itself on the sub-line. It is never a zero.
//   • A missing input is SKIPPED, never counted as 0 — and when that happens the tile discloses the
//     fraction it actually covers ("3 / 4 sahə üzrə") instead of averaging the gap away.
//   • A loaded zero is a fact; a fabricated zero is not. `alerts` is null until the request resolves,
//     so "0 açıq xəbərdarlıq" can only appear after a successful fetch. The same reasoning is why
//     the ATTENTION tile shows a dash rather than "0" while nothing has been evaluated, and why the
//     IRRIGATION tile refuses to say "no field has a recommendation" over partial coverage.
//   • "Hamısı qaydasındadır" requires a verdict for EVERY field, not merely for some. A per-field
//     fetch that never resolves (404, timeout) would otherwise leave attn at 0 forever and publish
//     an all-clear over a field nobody evaluated; short coverage falls back to the fraction instead.
//   • The alert count says what is TRUE, not what has been read. It comes from
//     GET /api/alerts/summary (services/app/routers/notifications.py) over public.alert_state, so it
//     falls when a rule stops matching — not when the farmer opens the bell. It used to count unread
//     notifications, which meant one glance at the bell emptied a tile while the heat rule kept
//     firing underneath. Alerts we could not judge are reported separately as `unconfirmed` and are
//     never folded into either the count or the green tone.
//   • Averages iterate `fields` and look UP the score, never the other way round, so a stale read-
//     model row belonging to a deleted field cannot leak into the mean.
//   • A stale contributing score is disclosed in the VISIBLE sub-line, not only in a tooltip. This
//     layout starts at a 760px stage, which landscape tablets clear — there is no hover there.
import Link from "next/link";
import { AlertTriangle, Bell, CalendarDays, Droplets, Gauge, MapPin, Ruler, Satellite } from "lucide-react";
import { t, tf } from "@/lib/i18n";
import { areaUnitLabel, formatAreaNumber, useAreaUnit } from "@/lib/units";
import { formatShortDate } from "./homeDate";
import type { FieldScore } from "./ScoreBadge";
import type { Tone } from "@/lib/indexStatus";
import type { Field } from "@/lib/types";

/**
 * What the alerts tile is allowed to say. `null` (not this shape with zeros) means "not loaded".
 *
 * OPEN CONDITIONS, NOT UNREAD ROWS (0063). This tile used to count unread notifications and was
 * therefore called "New alerts": a farmer emptied it by glancing at the bell once, while the heat
 * and low-moisture rules kept firing underneath. It now comes from GET /api/alerts/summary, which
 * reads public.alert_state — so the number falls when the CONDITION stops, not when the farmer
 * looks. Nothing on this screen can clear it.
 *
 * `open` is an exact SQL count, not a page of rows, so there is no ceiling and no "+" any more.
 */
export interface AlertSummary {
  /** Rules observed still matching within the last OPEN_MAX_AGE_HOURS (rules/engine.py). */
  open: number;
  /** How many of `open` last fired at critical severity. */
  critical: number;
  /**
   * Fired once and never confirmed either way since — no fresh scene, no fresh forecast, or a
   * producer that cannot report what it evaluated (pest). NOT open and NOT resolved, and it has to
   * stay its own number: adding it to `open` would invent conditions, and hiding it would let
   * "0 open" mean "we stopped looking" without saying so.
   */
  unconfirmed: number;
}

/**
 * The satellite pipeline roll-up, counted from `fields.data_status` as GET /api/fields/geo returns
 * it. `null` means that request failed — NOT "no field is ready".
 *
 * It deliberately does NOT come from FieldToday.status, which is `ins?.data_status ?? "none"`: a
 * field whose /insights call 404s is indistinguishable there from a field that has genuinely never
 * been processed, and this tile would then report a network failure as an unprocessed farm.
 */
export interface SatelliteSummary {
  ready: number;
  partial: number;
  /** queued + processing — the two states the queue worker moves a new field through. */
  preparing: number;
  failed: number;
  /** data_status "none" (or an unrecognised value): the pipeline has not touched it. */
  notStarted: number;
  /** How many fields the roll-up covers = how many came back from /api/fields/geo. */
  total: number;
}

/**
 * The FAO-56 irrigation roll-up. `count` is fields whose latest water-balance day asked for water;
 * `covered` is how many fields answered at all, and it is the whole reason this is not a bare
 * number: "0" over partial coverage would read as "no field needs water", which is a claim about
 * fields we never looked at.
 */
export interface IrrigationSummary {
  count: number;
  covered: number;
}

/** The newest scene date across the org, and how many fields contributed one. */
export interface SceneSummary {
  /** ISO YYYY-MM-DD, straight from the leading vegetation index's latest_date. */
  date: string;
  fields: number;
}

const DASH = "—";

/**
 * The colour band for an AVERAGE. An average has no server-supplied `tone` to trust, so the numeric
 * cut-offs are the only honest source. Same 70/45 boundaries as ScoreBadge.bandOf's fallback and
 * services/app/ai/wellness.py — spelled out here rather than imported because bandOf takes a whole
 * stored row, not a bare number. If wellness.py ever re-bands, this moves with it.
 */
function bandOfNumber(n: number): Tone {
  return n >= 70 ? "good" : n >= 45 ? "warn" : "bad";
}

const TONE_TEXT: Record<Tone, string> = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
};

const TONE_TINT: Record<Tone, string> = {
  good: "bg-good-tint text-good",
  warn: "bg-warn-tint text-warn",
  bad: "bg-bad-tint text-bad",
};

// COMPLETE class literals — a size assembled from a fragment is invisible to Tailwind's scanner.
const VALUE_SIZE: Record<"lg" | "md", string> = {
  lg: "text-[26px]",
  md: "text-[20px]",
};

function Tile({
  icon: Icon,
  label,
  value,
  unit,
  tone,
  sub,
  href,
  title,
  valueSize = "lg",
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  /** Rendered small next to the value ("ha", "/100"). Omitted when the value is a dash. */
  unit?: string;
  /** Only set where a tone actually means something — a count of fields has no health. */
  tone?: Tone;
  sub?: string | null;
  href?: string;
  /** The honesty tooltip (stale scores, a capped alert count) — NOT the label's own fallback. */
  title?: string;
  /**
   * "md" for values that are words rather than figures — a formatted date ("11 iyl 2025") is three
   * times as many glyphs as "37.9" and overflows a ~180px tile at the numeric size.
   */
  valueSize?: "lg" | "md";
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
            tone ? TONE_TINT[tone] : "bg-slate-100 text-ink-soft"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {/* The label has its OWN title, always, and it is not optional. Four tiles across a 1440px
            stage leave ~157px for an 11px uppercase tracking-wide string — about 22 characters —
            so "Durchschnittliche Gesundheit" (28) and Cyrillic "Средний балл здоровья" truncate,
            and a truncated label with no title is unrecoverable by mouse or by screen reader.
            Deliberately NOT merged with the tile-level `title` above: that one carries the stale/
            capped disclosures, and one attribute cannot serve both without eating the other. */}
        <span
          title={label}
          className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wide text-ink-soft"
        >
          {label}
        </span>
      </div>
      <p className="mt-2 flex items-baseline">
        <span
          className={`${VALUE_SIZE[valueSize]} font-bold leading-none tabular-nums ${tone ? TONE_TEXT[tone] : "text-ink"}`}
        >
          {value}
        </span>
        {unit && <span className="ml-1 text-sm font-semibold text-ink-soft">{unit}</span>}
      </p>
      {/* Two lines, not one. The sub-line is where the coverage fraction and the stale-score note
          are DISCLOSED, and both can be present at once ("3 / 4 sahə üzrə · Bəzi ballar əvvəlki
          günlərə aiddir"); at one line a ~250px tile clipped the disclosure to nothing on the
          longer locales. min-h-[96px] is a floor, and grid items stretch, so the tiles stay
          the same height as each other whichever one wraps. */}
      {sub ? <p className="mt-1 line-clamp-2 text-[12px] text-ink-soft">{sub}</p> : null}
    </>
  );

  // When the tile navigates, the WHOLE 96px tile is the target — not a 44px link inside it.
  const shell = "flex min-h-[96px] flex-col rounded-xl2 border-[1.5px] border-line bg-panel px-4 py-3 shadow-soft";
  return href ? (
    <Link href={href} title={title} className={`${shell} transition-colors hover:border-mint`}>
      {inner}
    </Link>
  ) : (
    <div className={shell} title={title}>
      {inner}
    </div>
  );
}

export default function TodayStats({
  fields,
  scores,
  alerts,
  attn,
  evaluatedCount,
  satellite,
  irrigation,
  lastScene,
}: {
  fields: Field[];
  /** The stored wellness read model, keyed by field id. A field with no row is simply absent. */
  scores: Record<string, FieldScore>;
  /** null = the notifications request has not resolved (or failed) — NOT "zero alerts". */
  alerts: AlertSummary | null;
  /**
   * How many fields are flagged, and how many we could evaluate AT ALL. Both arrive already derived:
   * TodayHome owns needsAttention() and drives the attention hero from it, so re-deriving the same
   * predicate here would give this screen two definitions of "needs attention" that could disagree.
   * `evaluatedCount` is deliberately NOT "requests that resolved" — see the attnSub note below.
   */
  attn: number;
  evaluatedCount: number;
  /** null = GET /api/fields/geo failed. See SatelliteSummary. */
  satellite: SatelliteSummary | null;
  irrigation: IrrigationSummary;
  /** null = not one field produced a scene date yet. */
  lastScene: SceneSummary | null;
}) {
  const areaUnit = useAreaUnit();

  // Total area: a null/NaN area_ha is SKIPPED, never summed as zero. `withArea` is what the total
  // actually covers, and the sub-line says so whenever that is less than every field.
  let sumHa = 0;
  let withArea = 0;
  for (const f of fields) {
    if (Number.isFinite(f?.area_ha)) {
      sumHa += f.area_ha;
      withArea += 1;
    }
  }

  // Average health: the mean over fields that have a STORED row, nothing computed on read.
  let sumScore = 0;
  let covered = 0;
  let anyStale = false;
  for (const f of fields) {
    const s = scores[f?.id];
    if (s && typeof s.score === "number") {
      sumScore += s.score;
      covered += 1;
      // `stale` (age >= 2, analytics.py _STALE_DAYS) and NOT the weaker `today === false` that
      // dates an individual chip. The daily sweep writes in UTC at 04:20, so before then every row
      // in the org is legitimately "not today's" — flagging the AVERAGE on that would put a warning
      // under this tile every single morning, and a warning that is always on is not read. Two days
      // means a sweep actually failed, which is worth the farmer's attention.
      if (s.stale) anyStale = true;
    }
  }
  const avg = covered > 0 ? Math.round(sumScore / covered) : null;

  const coverageSub = (n: number): string | null =>
    n < fields.length ? tf("app.home.stats.coverage", { covered: n, total: fields.length }) : null;

  // Stale scores are LABELLED, not hidden — and the label has to be readable without a pointer.
  // The wide layout starts at a 760px stage, which landscape tablets clear (the WIDE_MIN comment in
  // TodayHome says so outright), so a title attribute alone disclosed nothing to exactly the devices
  // that cannot hover. The tooltip is kept as the overflow path for the two-line clamp, not as the
  // disclosure itself.
  const staleNote = anyStale ? t("app.home.stats.scoreStale") : null;
  const scoreSub =
    avg == null
      ? t("app.home.stats.scoreNone")
      : [coverageSub(covered), staleNote].filter(Boolean).join(" · ") || null;

  // Green is a CLAIM — "no rule on your farm is currently matching" — so it needs an empty open set
  // AND nothing left unconfirmed. With unconfirmed rows present the tile still shows 0, because 0
  // open is true, but it stays toneless and the sub-line says how many we could not judge.
  const alertsTone: Tone | undefined =
    alerts == null
      ? undefined
      : alerts.critical > 0
        ? "bad"
        : alerts.open > 0
          ? "warn"
          : alerts.unconfirmed > 0
            ? undefined
            : "good";

  // Order matters: critical outranks everything, then the unconfirmed disclosure, and only a clean
  // zero on both gets to say "no open alerts".
  const alertsSub =
    alerts == null
      ? t("app.home.stats.alertsUnknown")
      : alerts.critical > 0
        ? tf("app.home.stats.alertsCritical", { n: alerts.critical })
        : alerts.unconfirmed > 0
          ? tf("app.home.stats.alertsUnconfirmed", { n: alerts.unconfirmed })
          : alerts.open === 0
            ? t("app.home.stats.alertsNone")
            : null;

  // ── ATTENTION ───────────────────────────────────────────────────────────────────────────────
  // "Hamısı qaydasındadır" is a claim about EVERY field, so it needs a verdict for every field —
  // and counting REQUESTS is not the same as counting verdicts. fetchFieldToday (lib/today.ts)
  // catches each of its three calls, so a field whose /insights 404s still resolves, just with
  // verdict null. Gating on "did it come back" therefore let a permanently broken field count as
  // evaluated AND never reach `attn`, publishing an all-clear over a field nobody had looked at.
  //
  // With NOTHING evaluated the value itself is the lie: `attn` can only be 0, and a green-adjacent
  // "0" is exactly the all-clear this rule exists to prevent — hence the dash. Above zero the count
  // is a FLOOR and stays true no matter how many fields failed, so it prints, with the coverage
  // fraction beside it.
  const attnKnown = evaluatedCount > 0;
  const fullyEvaluated = fields.length > 0 && evaluatedCount >= fields.length;
  const attnTone: Tone | undefined = !attnKnown
    ? undefined
    : attn > 0
      ? "warn"
      : fullyEvaluated
        ? "good"
        : undefined;
  const attnSub = !attnKnown
    ? t("app.home.stats.attnUnknown")
    : fullyEvaluated
      ? attn === 0
        ? t("app.home.stats.fieldsAllGood")
        : null
      : coverageSub(evaluatedCount);

  // ── SATELLITE ───────────────────────────────────────────────────────────────────────────────
  // One line can only carry one bucket, so it carries the first non-empty one in pipeline order.
  // Nothing is hidden by that: IntelligenceFeed's "Peyk məlumatı" group lists EVERY non-zero bucket
  // with its own dot, and both read this same object.
  const satSub = (() => {
    if (!satellite) return t("app.home.sat.unknown");
    if (satellite.preparing > 0) return tf("app.home.sat.preparing", { n: satellite.preparing });
    if (satellite.failed > 0) return tf("app.home.sat.failed", { n: satellite.failed });
    if (satellite.partial > 0) return tf("app.home.sat.partial", { n: satellite.partial });
    if (satellite.notStarted > 0) return tf("app.home.sat.notStarted", { n: satellite.notStarted });
    return coverageSub(satellite.total);
  })();
  // A total of zero has no fraction to show: "0 / 0" is not a reading. /api/fields/geo only returns
  // fields that HAVE geometry, so this is the org whose fields were all created without a polygon.
  // Bound to a local (rather than a boolean flag) so the null check narrows inside the JSX below.
  const sat = satellite && satellite.total > 0 ? satellite : null;

  // ── IRRIGATION ──────────────────────────────────────────────────────────────────────────────
  // Deliberately NO tone. A zero here means either "nothing needs water" or "nothing was computed",
  // and painting it green would silently pick the first reading.
  const irrigKnown = irrigation.covered > 0;
  const irrigSub = !irrigKnown
    ? coverageSub(0)
    : irrigation.count > 0
      ? [t("app.home.stats.irrigationSource"), coverageSub(irrigation.covered)]
          .filter(Boolean)
          .join(" · ")
      : irrigation.covered >= fields.length
        ? t("app.home.stats.irrigationNone")
        : coverageSub(irrigation.covered);

  return (
    <section aria-label={t("app.home.stats.regionAria")} className="grid grid-cols-4 gap-3">
      {/* ── row 1 ───────────────────────────────────────────────────────────────────────────── */}
      {/* No sub-line: this count is exact, and the coverage fraction that used to sit here
          qualifies the EVALUATION, not the number above it — "3 / 5 sahə üzrə" under a tile
          reading "5" says the count is partial, which is the one thing it is not. It moved to the
          attention tile, whose number it actually describes. */}
      <Tile
        icon={MapPin}
        label={t("app.home.stats.fieldsLabel")}
        value={String(fields.length)}
        href="/fields"
      />

      <Tile
        icon={Ruler}
        label={t("app.home.stats.areaLabel")}
        value={withArea === 0 ? DASH : formatAreaNumber(sumHa, areaUnit)}
        unit={withArea === 0 ? undefined : areaUnitLabel(areaUnit)}
        sub={withArea === 0 ? t("app.home.stats.areaUnknown") : coverageSub(withArea)}
      />

      {/* A stale contributing row does NOT suppress the number — it is the stored value, and hiding
          it would be its own lie. The SUB-LINE is what admits the age (see `scoreSub`); the title
          repeats it so the disclosure survives the one-line clamp when coverage is short too. */}
      <Tile
        icon={Gauge}
        label={t("app.home.stats.scoreLabel")}
        value={avg == null ? DASH : String(avg)}
        unit={avg == null ? undefined : "/100"}
        tone={avg == null ? undefined : bandOfNumber(avg)}
        sub={scoreSub}
        title={staleNote ?? undefined}
      />

      {/* An EXACT count of conditions that are currently true — no ceiling, no "+", and reading the
          bell does not move it. A zero here is a real all-clear only when nothing is unconfirmed,
          which is what the tone and the sub-line above are careful about. */}
      <Tile
        icon={Bell}
        label={t("app.home.stats.alertsLabel")}
        value={alerts == null ? DASH : String(alerts.open)}
        tone={alertsTone}
        sub={alertsSub}
        href="/notifications"
        title={
          alerts && alerts.unconfirmed > 0 ? t("app.home.stats.alertsUnconfirmedNote") : undefined
        }
      />

      {/* ── row 2 ───────────────────────────────────────────────────────────────────────────── */}
      <Tile
        icon={AlertTriangle}
        label={t("app.home.stats.attnLabel")}
        value={attnKnown ? String(attn) : DASH}
        tone={attnTone}
        sub={attnSub}
      />

      <Tile
        icon={Satellite}
        label={t("app.home.sat.label")}
        value={sat ? String(sat.ready) : DASH}
        unit={sat ? `/ ${sat.total}` : undefined}
        sub={satSub}
      />

      <Tile
        icon={Droplets}
        label={t("app.home.stats.irrigationLabel")}
        value={irrigKnown ? String(irrigation.count) : DASH}
        sub={irrigSub}
      />

      {/* The newest scene ACROSS the org — not a date that holds for every field, which is exactly
          what the sub-line says. Fields with no vegetation trend contribute no date and are simply
          outside the fraction. */}
      <Tile
        icon={CalendarDays}
        label={t("app.home.stats.sceneLabel")}
        value={lastScene ? formatShortDate(lastScene.date) : DASH}
        valueSize="md"
        sub={
          lastScene
            ? tf("app.home.stats.sceneCoverage", { n: lastScene.fields })
            : t("app.home.stats.sceneNone")
        }
      />
    </section>
  );
}
