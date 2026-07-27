"use client";

// Teardown §4.2 — a number beside a mini scale with a marker on it, so "3" stops being an abstract
// figure and becomes a judgement at a glance: the farmer sees where it sits between "noticed it"
// and "act today" without knowing that the column runs 1..5.
//
// The ramp is the project's own good → warn → bad tokens (tailwind.config.ts: good #15803D,
// warn #B45309, bad #B91C1C), REVERSED relative to legendFor()'s index ramp. That inversion is
// exactly why this is not legendFor(): on a vegetation index high is healthy, on a severity scale
// high is trouble, and reusing the index ramp here would paint a severity of 5 green.
//
// The gradient and the marker offset are inline styles, not assembled class names — Tailwind scans
// for whole class literals and would never emit a class built from a computed percentage.
import { tf } from "@/lib/i18n";

const RAMP = "linear-gradient(90deg,#15803D,#B45309,#B91C1C)";

// The database constraint (migration for scouting_observations, grep "severity"), mirrored by the
// API's _severity_out which already maps the legacy low|medium|high rows onto 2|3|5.
const SEVERITY_MIN = 1;
const SEVERITY_MAX = 5;

export function SeverityScale({ value }: { value: number | null | undefined }) {
  // An unrated note renders NOTHING — no bar, no default, no zero. The precedent is ScoutingTab's
  // `{s.severity != null && …}`: a missing severity is a farmer who chose not to rate it, not a
  // measurement we failed to take, and drawing a marker at the low end would invent the rating.
  if (value == null || !Number.isFinite(value)) return null;

  const label = tf("app.notes.severityAria", { n: value });

  // Outside 1..5 (which _severity_out already prevents server-side): print the number, draw no
  // scale. Clamping the marker would place the value somewhere on the bar it does not sit.
  if (value < SEVERITY_MIN || value > SEVERITY_MAX) {
    return <span className="shrink-0 text-xs font-bold tabular-nums text-ink-soft">{value}</span>;
  }

  const pct = ((value - SEVERITY_MIN) / (SEVERITY_MAX - SEVERITY_MIN)) * 100;

  return (
    <span className="flex shrink-0 items-center gap-1.5" title={label}>
      <span className="text-xs font-bold tabular-nums text-ink">{value}</span>
      {/* No overflow-hidden: the marker deliberately overhangs the track, and clipping it would
          hide half of it at 1 and at 5 — the two readings that matter most. */}
      <span
        role="img"
        aria-label={label}
        className="relative block h-1.5 w-11 rounded-full"
        style={{ backgroundImage: RAMP }}
      >
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white ring-1 ring-slate-900/50"
          style={{ left: `${pct}%` }}
        />
      </span>
    </span>
  );
}

export default SeverityScale;
