"use client";

// Marketing upgrade call-to-action — shown INSTEAD of a raw error when a free-tier limit is hit
// (e.g. the 1-field cap). Turns a dead-end "field_limit_reached" into an aspirational nudge.
// Reusable: pass a title/subtitle/benefits, or use the field-limit defaults.

import Link from "next/link";
import { Sparkles, Check, ArrowRight } from "lucide-react";

const DEFAULT_BENEFITS = [
  "5 sahə (~25 ha) — birdən çox sahəni bir yerdən idarə edin",
  "Sentinel-2 10m + NDRE/CIre — daha kəskin, red-edge analiz",
  "AI aqronom məsləhəti (8/ay) + AI chatbot",
  "Bilik Pasportu: torpaq, su balansı, çiləmə pəncərəsi, frost/heat xəbərdarlıq",
];

export default function UpgradeCta({
  title = "Pulsuz paketin sahə limitinə çatdınız 🎉",
  subtitle = "Pulsuz paketdə 1 sahə var. Daha çox sahə əlavə etmək və peşəkar alətləri açmaq üçün paketi yüksəldin.",
  benefits = DEFAULT_BENEFITS,
  priceLine = "Paket 2 — cəmi 10 AZN/ay",
  onDismiss,
}: {
  title?: string;
  subtitle?: string;
  benefits?: string[];
  priceLine?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        <Sparkles className="h-4 w-4" /> Paketi yüksəlt
      </div>
      <h3 className="mt-2 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Paketlərə bax <ArrowRight className="h-4 w-4" />
        </Link>
        <span className="text-sm font-medium text-emerald-700">{priceLine}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto text-sm text-slate-500 hover:text-slate-700"
          >
            Bağla
          </button>
        )}
      </div>
    </div>
  );
}
