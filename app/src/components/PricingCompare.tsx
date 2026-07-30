"use client";

import { Check, Minus, Star } from "lucide-react";
import { PACKAGES } from "@/lib/pricing";
import { t } from "@/lib/i18n";

// C4 — "Bütün paketlərə daxildir" universal block + a feature-by-feature comparison matrix.
// EVERY matrix row is grounded in services/app/tiers.py (the gating SSoT): free / pro (Paket 2,
// 10 AZN) / business (Paket 3, 25 AZN). A cell with `on:false` means the tier does NOT get the
// feature; `note` carries the quota/detail (e.g. "ayda 8"). `soon` rows are gated ON for the tier
// but still rolling out (mirrors lib/pricing.ts `soon`). Column meta (name/price/highlight) comes
// from PACKAGES so it stays in sync with the cards above. Rendered inside the client PricingView, so
// this is a client component using the synchronous t(); UNIVERSAL/ROWS are built inside the body so
// they re-read the active locale on each render.

type Cell = { on: boolean; note?: string };
interface Row {
  label: string;
  cells: [Cell, Cell, Cell]; // free, pro, business
  soon?: boolean;
}

const YES: Cell = { on: true };
const NO: Cell = { on: false };

function CellView({ cell }: { cell: Cell }) {
  if (!cell.on) {
    return (
      <span className="inline-flex flex-col items-center text-slate-300">
        <Minus className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{t("mkt.compare.srNotIncluded")}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
      {cell.note && <span className="text-[11px] leading-tight text-slate-500">{cell.note}</span>}
    </span>
  );
}

export default function PricingCompare() {
  // tiers.py: sensors=["hls","s2"] for ALL tiers, but S2 on free is limited to the single field.
  // weather forecast (7-day) is free for everyone; alerts gate only the spray-window/frost alerts.
  const UNIVERSAL: string[] = [
    t("mkt.compare.u1"),
    t("mkt.compare.u2"),
    t("mkt.compare.u3"),
    t("mkt.compare.u4"),
    t("mkt.compare.u5"),
    t("mkt.compare.u6"),
  ];

  // Rows map 1:1 to tiers.py flags/limits (free / pro / business).
  const ROWS: Row[] = [
    {
      label: t("mkt.compare.rowFields"), // max_fields 1 / 5 / 100000
      cells: [{ on: true, note: t("mkt.compare.noteFields1") }, { on: true, note: t("mkt.compare.noteFields2") }, { on: true, note: t("mkt.compare.noteFields3") }],
    },
    {
      label: t("mkt.compare.rowMonitoring"), // sensors hls+s2 all tiers; free S2 on the single field only
      cells: [{ on: true, note: t("mkt.compare.noteMon1") }, { on: true, note: t("mkt.compare.noteMon2") }, { on: true, note: t("mkt.compare.noteMon2") }],
    },
    {
      label: t("mkt.compare.rowIndices"),
      cells: [{ on: true, note: t("mkt.compare.noteIdx1") }, { on: true, note: t("mkt.compare.noteIdx2") }, { on: true, note: t("mkt.compare.noteIdx2") }],
    },
    { label: t("mkt.compare.rowRaster"), cells: [YES, YES, YES] },
    { label: t("mkt.compare.rowWeather"), cells: [YES, YES, YES] },
    { label: t("mkt.compare.rowFieldMgmt"), cells: [YES, YES, YES] },
    {
      label: t("mkt.compare.rowAdvice"), // advice_per_month 1 / 8 / 30
      cells: [{ on: true, note: t("mkt.compare.perMonth1Gift") }, { on: true, note: t("mkt.compare.perMonth8") }, { on: true, note: t("mkt.compare.perMonth30") }],
    },
    {
      label: t("mkt.compare.rowChat"), // chat_per_month 0 / 50 / 300
      cells: [NO, { on: true, note: t("mkt.compare.perMonth50") }, { on: true, note: t("mkt.compare.perMonth300") }],
    },
    { label: t("mkt.compare.rowPassport"), cells: [NO, YES, YES] }, // passport
    { label: t("mkt.compare.rowSpray"), cells: [NO, YES, YES] }, // weather_alerts
    { label: t("mkt.compare.rowIrrigation"), cells: [NO, YES, YES] }, // irrigation
    { label: t("mkt.compare.rowEmail"), cells: [NO, YES, YES] }, // email
    { label: t("mkt.compare.rowWhatsapp"), cells: [NO, NO, YES] }, // whatsapp
    { label: t("mkt.compare.rowPhoto"), cells: [NO, NO, { on: true, note: t("mkt.compare.perMonth30") }], soon: true }, // photo_per_month 0/0/30
    { label: t("mkt.compare.rowPest"), cells: [NO, NO, YES], soon: true }, // pest_risk
    { label: t("mkt.compare.rowFertilizer"), cells: [NO, NO, YES], soon: true }, // fertilizer
    { label: t("mkt.compare.rowBenchmark"), cells: [NO, NO, YES], soon: true }, // benchmark
    {
      label: t("mkt.compare.rowResearch"), // research_depth regional / regional / local
      cells: [{ on: true, note: t("mkt.compare.noteResearchGlobalReg") }, { on: true, note: t("mkt.compare.noteResearchGlobalReg") }, { on: true, note: t("mkt.compare.noteResearchLocal") }],
    },
  ];

  return (
    <section className="space-y-4">
      {/* The always-on core, before the table shows the differences. */}
      <div className="rounded-xl2 border border-line bg-mint-soft p-5 shadow-soft">
        <h2 className="font-display text-lg font-bold text-teal sm:text-xl">{t("mkt.compare.coreTitle")}</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {UNIVERSAL.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-grass" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-teal sm:text-2xl">{t("mkt.compare.compareTitle")}</h2>
        <p className="mx-auto mt-1 max-w-2xl text-sm text-slate-600">
          {t("mkt.compare.compareSub")}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-line bg-panel shadow-soft">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-10 bg-panel px-4 py-3 font-display text-sm font-bold text-teal">
                {t("mkt.compare.colFeature")}
              </th>
              {PACKAGES.map((p) => (
                <th
                  key={p.id}
                  className={`px-3 py-3 text-center align-bottom ${p.highlight ? "bg-mint-soft" : ""}`}
                >
                  {p.highlight && (
                    <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      <Star className="h-3 w-3" aria-hidden="true" /> {t("mkt.compare.popular")}
                    </span>
                  )}
                  <div className="font-display text-sm font-bold text-slate-900">{t(p.nameKey)}</div>
                  <div className="text-xs font-medium text-slate-500">
                    {p.price === "0" ? t("mkt.compare.freeLabel") : `${p.price} ${t(p.periodKey)}`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b border-line last:border-0">
                <td className="sticky left-0 z-10 bg-panel px-4 py-3 align-middle text-slate-700">
                  <span>{row.label}</span>
                  {row.soon && (
                    <span className="ml-1.5 whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      {t("mkt.compare.soon")}
                    </span>
                  )}
                </td>
                {row.cells.map((cell, i) => (
                  <td
                    key={PACKAGES[i]?.id ?? i}
                    className={`px-3 py-3 text-center align-middle ${PACKAGES[i]?.highlight ? "bg-mint-soft" : ""}`}
                  >
                    <CellView cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        {t("mkt.compare.footer")}
      </p>
    </section>
  );
}
