// The wellness card's colour table and its sub-score cut-offs, in one place.
//
// FieldPulse (the signed-in card) and DemoPulse (the read-only public copy on /demo) render the same
// 0-100 score. They are deliberately separate components — the public one must never carry a fetch
// or a write affordance — but the two things that would be a real lie if they drifted are the tone
// colours and the thresholds at which a component bar turns amber or red. Those live here, so the
// demo can never show a farmer a greener field than the app would.
//
// The thresholds mirror services/app/ai/wellness.py `_tone`.
export type Tone = "good" | "warn" | "bad";

export const TONE: Record<Tone, { ring: string; text: string; wash: string; edge: string; bar: string }> = {
  good: { ring: "#15803D", text: "text-emerald-800", wash: "bg-emerald-50", edge: "border-emerald-200", bar: "bg-emerald-600" },
  warn: { ring: "#B45309", text: "text-amber-800", wash: "bg-amber-50", edge: "border-amber-200", bar: "bg-amber-500" },
  bad: { ring: "#B91C1C", text: "text-red-800", wash: "bg-red-50", edge: "border-red-200", bar: "bg-red-600" },
};

/** Tone of ONE component's sub-score (the bar), as opposed to the composite score's own tone. */
export function subTone(score: number): Tone {
  return score >= 70 ? "good" : score >= 45 ? "warn" : "bad";
}

// Stable display order — matches the weighting order in services/app/ai/wellness.py.
export const WELLNESS_ORDER = ["ndvi", "water", "pest", "gdd"];
