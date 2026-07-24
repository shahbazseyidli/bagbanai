"use client";

// MOCK-app-today-fieldgrid — the approved mockup's "Sahələrim" 3-up card grid: field name + numeric
// score pill, then a compact meta line and the plain-language verdict.
//
// This replaces the stacked one-per-row list on the home screen but keeps everything that list
// carried: the preparing state, the İcmal verdict sentence, and the FAO-56 irrigation hint. Cards
// stack to one column on a phone, two on a small tablet, three from `lg` up (the mockup's grid3a).
import Link from "next/link";
import { Droplets, Loader2, MapPin } from "lucide-react";
import { t } from "@/lib/i18n";
import { ScorePill, toneWord, type FieldScore } from "./ScoreBadge";
import type { FieldToday } from "@/lib/today";
import type { Field } from "@/lib/types";

function FieldGridCard({
  field,
  ft,
  score,
}: {
  field: Field;
  ft?: FieldToday;
  score?: FieldScore;
}) {
  const preparing = ft != null && (ft.status === "queued" || ft.status === "processing");
  const v = ft?.verdict ?? null;
  // Meta line: area + one status word, each of which is either known or omitted.
  const statusWord = preparing ? "hazırlanır" : v ? toneWord(v.tone) : null;
  const meta = [
    field.area_ha != null ? `${field.area_ha.toFixed(2)} ha` : null,
    statusWord,
  ].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/fields/${field.id}`}
      className="flex flex-col rounded-xl2 border-[1.5px] border-line bg-white p-4 shadow-soft transition-colors hover:border-mint"
    >
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">{field.name}</p>
        <ScorePill score={score} />
      </div>

      {meta && <p className="mt-2 text-[13px] text-slate-500">{meta}</p>}

      {ft == null ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Yüklənir…
        </p>
      ) : preparing ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" aria-hidden="true" />
          {t("today.preparing")}
        </p>
      ) : v ? (
        <p className="mt-2 line-clamp-2 text-sm text-slate-700">{v.title}</p>
      ) : (
        <p className="mt-2 line-clamp-2 text-sm text-slate-500">{t("today.noAnalysis")}</p>
      )}

      {ft && ft.waterReco != null && (
        <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-warn-tint px-2.5 py-1 text-xs font-bold text-warn">
          <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
          {t("today.waterReco")} (~{Math.round(ft.waterReco)} mm)
        </p>
      )}
    </Link>
  );
}

export default function FieldGrid({
  fields,
  todays,
  scores,
}: {
  fields: Field[];
  todays: Record<string, FieldToday>;
  scores: Record<string, FieldScore>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) => (
        <FieldGridCard key={f.id} field={f} ft={todays[f.id]} score={scores[f.id]} />
      ))}
    </div>
  );
}
