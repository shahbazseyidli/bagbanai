"use client";

// Shared 0-100 Field Wellness Score UI for the "Bu gün" home (approved mockup: the .scoredot in the
// attention hero + the numeric .pill in the field grid).
//
// SOURCE OF TRUTH: GET /api/orgs/{org_id}/wellness — the read model that returns the latest STORED
// score per field (never computed on read, see services/app/routers/analytics.py). A field with no
// stored score renders an em-dash, NEVER an invented or back-filled number.
import { t } from "@/lib/i18n";
import { wellnessAgeLabel, wellnessHeadline } from "@/lib/wellnessText";
import type { Tone } from "@/lib/indexStatus";

/** One row of GET /api/orgs/{org_id}/wellness. Fields without a stored score are simply absent. */
export interface FieldScore {
  field_id: string;
  score: number;
  tone?: string | null;
  headline?: string | null;
  headline_code?: string | null;
  headline_params?: Record<string, unknown> | null;
  computed_on?: string | null;
  /** age_days > _STALE_DAYS — a sweep genuinely missed, not merely "not today's". */
  stale?: boolean;
  /** false when the stored row was not computed today. Optional: an older API build omits it. */
  today?: boolean;
  age_days?: number | null;
}

/** Trust the server's tone; fall back to the same cut-offs as services/app/ai/wellness.py. */
export function bandOf(s: FieldScore): Tone {
  if (s.tone === "good" || s.tone === "warn" || s.tone === "bad") return s.tone;
  return s.score >= 70 ? "good" : s.score >= 45 ? "warn" : "bad";
}

/** The screen's shared status vocabulary (Sağlam / Diqqət / Zəif). */
export function toneWord(tone: Tone): string {
  return t(tone === "good" ? "today.tone.good" : tone === "warn" ? "today.tone.warn" : "today.tone.bad");
}

const DOT: Record<Tone, string> = {
  good: "bg-good text-white",
  warn: "bg-warn text-white",
  bad: "bg-bad text-white",
};

const PILL: Record<Tone, string> = {
  good: "bg-good-tint text-good",
  warn: "bg-warn-tint text-warn",
  bad: "bg-bad-tint text-bad",
};

/** Hover/AT detail — the stored headline + the day it was computed (never faked). */
function detail(s?: FieldScore | null): string | undefined {
  if (!s) return undefined;
  const headline = wellnessHeadline(s.headline_code, s.headline_params, s.headline);
  const bits = [headline, s.computed_on ? `${t("app.home.scoreBadge.computedOn")}${s.computed_on}` : null].filter(Boolean);
  return bits.length ? bits.join(" · ") : undefined;
}

/**
 * The date stamp under a score that is not today's, or null when it is today's.
 *
 * VISIBLE, not a tooltip. The stored row is the only thing these tiles can show — the read model
 * never recomputes — so when the daily sweep does not land they hand out an old number. A tooltip
 * nobody opens (and that a phone has no way to open at all) is not a disclosure; a dated number is.
 * See wellnessAgeLabel for why age 1 is dated as well.
 */
function ScoreAge({ score }: { score: FieldScore }) {
  const label = wellnessAgeLabel(score.today, score.age_days, score.computed_on);
  if (!label) return null;
  return (
    <span className="text-[10px] font-medium leading-none text-slate-500">
      <span className="sr-only">{t("app.wl.age.sr")} </span>
      {label}
    </span>
  );
}

/** The mockup's square .scoredot — the big number next to the field name in the attention hero. */
export function ScoreDot({ score, className = "" }: { score?: FieldScore | null; className?: string }) {
  if (!score) {
    return (
      <span
        aria-hidden="true"
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-200 text-sm font-extrabold text-slate-500 ${className}`}
      >
        —
      </span>
    );
  }
  const band = bandOf(score);
  const age = <ScoreAge score={score} />;
  const dot = (
    <span
      title={detail(score)}
      aria-label={`${t("app.home.scoreBadge.fieldScoreLabel")}${score.score} / 100`}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-extrabold tabular-nums ${DOT[band]} ${
        score.stale ? "opacity-80" : ""
      } ${className}`}
    >
      {score.score}
    </span>
  );
  // A fresh score renders EXACTLY what it did before — the stamp adds a row only when there is
  // something to disclose, so the common case keeps its layout to the pixel.
  if (!age) return dot;
  return (
    <span className="inline-flex shrink-0 flex-col items-center gap-0.5">
      {dot}
      {age}
    </span>
  );
}

/** The mockup's numeric .pill — the corner badge on a field card. */
export function ScorePill({ score, className = "" }: { score?: FieldScore | null; className?: string }) {
  if (!score) {
    return (
      <span
        title={t("app.home.scoreBadge.notComputedYet")}
        className={`shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-500 ${className}`}
      >
        <span className="sr-only">{t("app.home.scoreBadge.noScoreYet")}</span>
        <span aria-hidden="true">—</span>
      </span>
    );
  }
  const band = bandOf(score);
  const age = <ScoreAge score={score} />;
  const pill = (
    <span
      title={detail(score)}
      className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${PILL[band]} ${
        score.stale ? "opacity-70" : ""
      } ${className}`}
    >
      <span className="sr-only">{t("app.home.scoreBadge.fieldScoreLabel")}</span>
      {score.score}
    </span>
  );
  if (!age) return pill;
  return (
    <span className="inline-flex shrink-0 flex-col items-end gap-0.5">
      {pill}
      {age}
    </span>
  );
}
