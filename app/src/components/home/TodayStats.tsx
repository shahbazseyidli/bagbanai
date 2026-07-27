"use client";

// W2 — the four-tile stat header on "Bu gün": how many fields, how much land, how healthy on
// average, how many alerts are open. It is the first thing a farmer reads on the wide layout, so
// every number on it has to survive the question "where did that come from".
//
// THE HONESTY RULES, all of them in this one file:
//   • Unknown is an em-dash, and the dash explains itself on the sub-line. It is never a zero.
//   • A missing input is SKIPPED, never counted as 0 — and when that happens the tile discloses the
//     fraction it actually covers ("3 / 4 sahə üzrə") instead of averaging the gap away.
//   • A loaded zero is a fact; a fabricated zero is not. `alerts` is null until the request resolves,
//     so "0 açıq xəbərdarlıq" can only appear after a successful fetch.
//   • "Hamısı qaydasındadır" requires a verdict for EVERY field, not merely for some. A per-field
//     fetch that never resolves (404, timeout) would otherwise leave attn at 0 forever and publish
//     an all-clear over a field nobody evaluated; short coverage falls back to the fraction instead.
//   • The alert count admits the ceiling it can SEE, and no more. GET /api/notifications
//     (services/app/routers/advice.py::list_notifications) reads 60 rows from SQL, applies the
//     per-user notification matrix, and returns at most 30 — so a 30-row response renders "30+".
//     The 60-row SQL cut is NOT observable from the response: a heavily muted week can come back
//     with 12 rows out of 60 read, `capped` false, and this tile printing an exact-looking "12"
//     while older unread criticals were never sent. `capped` is a floor marker, never a totality
//     proof. The "+" is suppressed at zero, because "0+" is not a number anyone can read.
//   • Averages iterate `fields` and look UP the score, never the other way round, so a stale read-
//     model row belonging to a deleted field cannot leak into the mean.
//   • A stale contributing score is disclosed in the VISIBLE sub-line, not only in a tooltip. This
//     layout starts at a 760px stage, which landscape tablets clear — there is no hover there.
import Link from "next/link";
import { Bell, Gauge, MapPin, Ruler } from "lucide-react";
import { t, tf } from "@/lib/i18n";
import { areaUnitLabel, formatAreaNumber, useAreaUnit } from "@/lib/units";
import type { FieldScore } from "./ScoreBadge";
import type { Tone } from "@/lib/indexStatus";
import type { Field } from "@/lib/types";

/** What the alerts tile is allowed to say. `null` (not this shape with zeros) means "not loaded". */
export interface AlertSummary {
  /** Unread critical + warning rows the bell itself would show. */
  total: number;
  critical: number;
  /**
   * The RESPONSE came back at its 30-row ceiling, so `total` may understate — rendered as "30+".
   *
   * Independent of `total`, because it is measured before the unread/severity filter: a page of 30
   * already-read rows sets this true with a `total` of 0. That is why the "+" is suppressed at zero
   * instead of printing "0+". It also cannot see the 60-row SQL cut behind the notification matrix,
   * so `false` means "the response was not full", never "you are seeing everything".
   */
  capped: boolean;
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

function Tile({
  icon: Icon,
  label,
  value,
  unit,
  tone,
  sub,
  href,
  title,
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
          className={`text-[26px] font-bold leading-none tabular-nums ${tone ? TONE_TEXT[tone] : "text-ink"}`}
        >
          {value}
        </span>
        {unit && <span className="ml-1 text-sm font-semibold text-ink-soft">{unit}</span>}
      </p>
      {/* Two lines, not one. The sub-line is where the coverage fraction and the stale-score note
          are DISCLOSED, and both can be present at once ("3 / 4 sahə üzrə · Bəzi ballar əvvəlki
          günlərə aiddir"); at one line a ~250px tile clipped the disclosure to nothing on the
          longer locales. min-h-[96px] is a floor, and grid items stretch, so the four tiles stay
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
   * `evaluatedCount` is deliberately NOT "requests that resolved" — see the fieldsSub note below.
   */
  attn: number;
  evaluatedCount: number;
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
      if (s.stale) anyStale = true;
    }
  }
  const avg = covered > 0 ? Math.round(sumScore / covered) : null;

  const coverageSub = (n: number): string | null =>
    n < fields.length ? tf("app.home.stats.coverage", { covered: n, total: fields.length }) : null;

  // "Hamısı qaydasındadır" is a claim about EVERY field, so it needs a verdict for every field —
  // and counting REQUESTS is not the same as counting verdicts. fetchFieldToday (lib/today.ts)
  // catches each of its three calls, so a field whose /insights 404s still resolves, just with
  // verdict null. Gating on "did it come back" therefore let a permanently broken field count as
  // evaluated AND never reach `attn`, publishing an all-clear over a field nobody had looked at.
  // `evaluatedCount` counts fields that produced a verdict or a stored wellness score, so short
  // coverage now falls back to the same fraction the area and score tiles disclose.
  //
  // The attn branch keeps priority over the fraction on purpose: "2 need attention" is a FLOOR and
  // stays true no matter how many fields failed, whereas "all good" is a universal claim and is the
  // only one an unevaluated field can falsify.
  const fieldsSub =
    attn > 0
      ? tf("app.home.stats.fieldsAttn", { n: attn })
      : evaluatedCount >= fields.length && fields.length > 0
        ? t("app.home.stats.fieldsAllGood")
        : coverageSub(evaluatedCount);

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

  const alertsTone: Tone | undefined =
    alerts == null ? undefined : alerts.critical > 0 ? "bad" : alerts.total > 0 ? "warn" : "good";

  return (
    <section aria-label={t("app.home.stats.regionAria")} className="grid grid-cols-4 gap-3">
      <Tile
        icon={MapPin}
        label={t("app.home.stats.fieldsLabel")}
        value={String(fields.length)}
        sub={fieldsSub}
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

      <Tile
        icon={Bell}
        label={t("app.home.stats.alertsLabel")}
        // "+" means "at least"; on zero there is nothing for it to be more than, and "0+" is not a
        // readable number. `capped` can be true with a total of 0 (a full page of already-read rows).
        value={alerts == null ? DASH : `${alerts.total}${alerts.capped && alerts.total > 0 ? "+" : ""}`}
        tone={alertsTone}
        sub={
          alerts == null
            ? t("app.home.stats.alertsUnknown")
            : alerts.critical > 0
              ? tf("app.home.stats.alertsCritical", { n: alerts.critical })
              : null
        }
        href="/notifications"
        title={alerts?.capped ? t("app.home.stats.alertsCapped") : undefined}
      />
    </section>
  );
}
