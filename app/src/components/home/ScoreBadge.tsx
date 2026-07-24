"use client";

// Shared 0-100 Field Wellness Score UI for the "Bu gün" home (approved mockup: the .scoredot in the
// attention hero + the numeric .pill in the field grid).
//
// SOURCE OF TRUTH: GET /api/orgs/{org_id}/wellness — the read model that returns the latest STORED
// score per field (never computed on read, see services/app/routers/analytics.py). A field with no
// stored score renders an em-dash, NEVER an invented or back-filled number.
import { t } from "@/lib/i18n";
import type { Tone } from "@/lib/indexStatus";

/** One row of GET /api/orgs/{org_id}/wellness. Fields without a stored score are simply absent. */
export interface FieldScore {
  field_id: string;
  score: number;
  tone?: string | null;
  headline?: string | null;
  computed_on?: string | null;
  stale?: boolean;
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
  const bits = [s.headline, s.computed_on ? `Hesablanma: ${s.computed_on}` : null].filter(Boolean);
  return bits.length ? bits.join(" · ") : undefined;
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
  return (
    <span
      title={detail(score)}
      aria-label={`Sahə balı: ${score.score} / 100`}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-extrabold tabular-nums ${DOT[band]} ${
        score.stale ? "opacity-80" : ""
      } ${className}`}
    >
      {score.score}
    </span>
  );
}

/** The mockup's numeric .pill — the corner badge on a field card. */
export function ScorePill({ score, className = "" }: { score?: FieldScore | null; className?: string }) {
  if (!score) {
    return (
      <span
        title="Sahə balı hələ hesablanmayıb"
        className={`shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-500 ${className}`}
      >
        <span className="sr-only">Sahə balı hələ yoxdur</span>
        <span aria-hidden="true">—</span>
      </span>
    );
  }
  const band = bandOf(score);
  return (
    <span
      title={detail(score)}
      className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${PILL[band]} ${
        score.stale ? "opacity-70" : ""
      } ${className}`}
    >
      <span className="sr-only">Sahə balı: </span>
      {score.score}
    </span>
  );
}
