"use client";

// MOCK-app-today-attention — the approved mockup's "Diqqət lazımdır" hero (.verdict treatment: a
// tinted card, the numeric score dot, the field name, the plain-language reason, and the inline
// peer suggestion underneath).
//
// Every line is real: the score comes from the stored Field Wellness row, the headline/sub-line from
// the deterministic İcmal insight engine (lib/insights via lib/today), the irrigation figure from
// the FAO-56 water balance, and the peer strip from GET /api/chat/peers (renders nothing when there
// are no peers). Nothing here is generated for effect.
import Link from "next/link";
import { ChevronRight, Droplets } from "lucide-react";
import { t } from "@/lib/i18n";
import PeerSuggest from "@/components/field/PeerSuggest";
import { ScoreDot, bandOf, type FieldScore } from "./ScoreBadge";
import type { FieldToday } from "@/lib/today";
import type { Tone } from "@/lib/indexStatus";

// .verdict.warn / .verdict.bad — tinted card, matching the mockup's amber hero.
const SHELL: Record<Tone, string> = {
  good: "border-emerald-200 bg-gradient-to-b from-emerald-50 to-white",
  warn: "border-amber-200 bg-gradient-to-b from-amber-50 to-white",
  bad: "border-red-200 bg-gradient-to-b from-red-50 to-white",
};

export default function AttentionHero({
  ft,
  score,
}: {
  ft: FieldToday;
  score?: FieldScore | null;
}) {
  const f = ft.field;
  const preparing = ft.status === "queued" || ft.status === "processing";
  // Tone: the stored score wins (it folds in more evidence than the index verdict); otherwise the
  // İcmal verdict; otherwise a neutral warn, since this card only renders for flagged fields.
  const tone: Tone = score ? bandOf(score) : (ft.verdict?.tone ?? "warn");
  const headline = ft.verdict?.title ?? score?.headline ?? null;
  const sub = ft.verdict ? ft.verdict.sub : null;

  return (
    <div className={`rounded-xl2 border p-4 shadow-soft ${SHELL[tone]}`}>
      <Link href={`/fields/${f.id}`} className="flex items-start gap-3">
        <ScoreDot score={score} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-bold text-slate-900">{f.name}</p>
            {f.area_ha != null && (
              <span className="shrink-0 text-sm text-slate-500">{f.area_ha.toFixed(2)} ha</span>
            )}
          </div>

          {headline ? (
            <p className="mt-1 text-sm font-semibold text-slate-800">{headline}</p>
          ) : preparing ? (
            <p className="mt-1 text-sm text-slate-600">{t("today.preparing")}</p>
          ) : null}

          {sub && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{sub}</p>}

          {ft.waterReco != null && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-warn-tint px-2.5 py-1 text-xs font-bold text-warn">
              <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
              {t("today.waterReco")} (~{Math.round(ft.waterReco)} mm)
            </p>
          )}
        </div>

        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
      </Link>

      {/* Inline peer suggestion (E7). Self-hides when the field has no peers, so the wrapper must
          collapse too — otherwise the hero grows an empty gap. */}
      <div className="mt-3 empty:hidden">
        <PeerSuggest fieldId={f.id} />
      </div>
    </div>
  );
}
