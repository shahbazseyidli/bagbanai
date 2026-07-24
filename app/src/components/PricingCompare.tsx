import { Check, Minus, Star } from "lucide-react";
import { PACKAGES } from "@/lib/pricing";

// C4 — "Bütün paketlərə daxildir" universal block + a feature-by-feature comparison matrix.
// EVERY matrix row is grounded in services/app/tiers.py (the gating SSoT): free / pro (Paket 2,
// 10 AZN) / business (Paket 3, 25 AZN). A cell with `on:false` means the tier does NOT get the
// feature; `note` carries the quota/detail (e.g. "ayda 8"). `soon` rows are gated ON for the tier
// but still rolling out (mirrors lib/pricing.ts `soon`). Column meta (name/price/highlight) comes
// from PACKAGES so it stays in sync with the cards above. Copy is inline Azerbaijani pending the
// T18 i18n sweep.

// tiers.py: sensors=["hls","s2"] for ALL tiers, but S2 on free is limited to the single field
// (see the tiers.py comment). weather forecast (7-day) is free for everyone; weather_alerts gates
// only the spray-window/frost alerts.
const UNIVERSAL: string[] = [
  "Peyk sağlamlıq xəritəsi — NASA HLS 30m + Sentinel-2 10m (tək sahə)",
  "9 vegetasiya indeksi + raster overlay, timeline və iki-tarix müqayisə",
  "7 günlük hava proqnozu",
  "Sahə idarəetmə: skautinq, tapşırıq, əməliyyat jurnalı, məhsuldarlıq",
  "Kataloqa baxış + provayderlərlə birbaşa mesajlaşma",
  "1 ay pulsuz Pro sınaq — kart tələb olunmur",
];

type Cell = { on: boolean; note?: string };
interface Row {
  label: string;
  cells: [Cell, Cell, Cell]; // free, pro, business
  soon?: boolean;
}

const YES: Cell = { on: true };
const NO: Cell = { on: false };

// Rows map 1:1 to tiers.py flags/limits (free / pro / business).
const ROWS: Row[] = [
  {
    label: "Sahə sayı", // max_fields 1 / 5 / 100000
    cells: [{ on: true, note: "1 sahə" }, { on: true, note: "5 sahə (~25 ha)" }, { on: true, note: "Limitsiz + komanda" }],
  },
  {
    label: "Peyk monitorinq", // sensors hls+s2 all tiers; free S2 on the single field only
    cells: [{ on: true, note: "HLS 30m + S2 (tək sahə)" }, { on: true, note: "HLS + Sentinel-2 10m" }, { on: true, note: "HLS + Sentinel-2 10m" }],
  },
  {
    label: "Vegetasiya indeksləri",
    cells: [{ on: true, note: "NDVI + 8 indeks" }, { on: true, note: "+ NDRE / CIre" }, { on: true, note: "+ NDRE / CIre" }],
  },
  { label: "Raster overlay · timeline · müqayisə", cells: [YES, YES, YES] },
  { label: "7 günlük hava proqnozu", cells: [YES, YES, YES] },
  { label: "Sahə idarəetmə (skautinq · tapşırıq · jurnal)", cells: [YES, YES, YES] },
  {
    label: "AI aqronom məsləhəti", // advice_per_month 1 / 8 / 30
    cells: [{ on: true, note: "ayda 1 · hədiyyə" }, { on: true, note: "ayda 8" }, { on: true, note: "ayda 30" }],
  },
  {
    label: "AI chatbot", // chat_per_month 0 / 50 / 300
    cells: [NO, { on: true, note: "ayda 50" }, { on: true, note: "ayda 300" }],
  },
  { label: "Bilik Pasportu (torpaq · su · zərərverici)", cells: [NO, YES, YES] }, // passport
  { label: "Çiləmə pəncərəsi + frost/heat xəbərdarlıq", cells: [NO, YES, YES] }, // weather_alerts
  { label: "Suvarma balansı (TAW/RAW · FAO-56)", cells: [NO, YES, YES] }, // irrigation
  { label: "Email bildiriş", cells: [NO, YES, YES] }, // email
  { label: "WhatsApp bildiriş", cells: [NO, NO, YES] }, // whatsapp
  { label: "Foto diaqnoz", cells: [NO, NO, { on: true, note: "ayda 30" }], soon: true }, // photo_per_month 0/0/30
  { label: "Zərərverici risk proqnozu", cells: [NO, NO, YES], soon: true }, // pest_risk
  { label: "Gübrə kalkulyatoru", cells: [NO, NO, YES], soon: true }, // fertilizer
  { label: "Regional benchmark", cells: [NO, NO, YES], soon: true }, // benchmark
  { label: "PDF / EUDR hesabatlar", cells: [NO, NO, YES], soon: true }, // reports
  {
    label: "Araşdırma dərinliyi", // research_depth regional / regional / local
    cells: [{ on: true, note: "qlobal + regional" }, { on: true, note: "qlobal + regional" }, { on: true, note: "+ lokal" }],
  },
];

function CellView({ cell }: { cell: Cell }) {
  if (!cell.on) {
    return (
      <span className="inline-flex flex-col items-center text-slate-300">
        <Minus className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">daxil deyil</span>
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
  return (
    <section className="space-y-4">
      {/* Bütün paketlərə daxildir — the always-on core, before the table shows the differences. */}
      <div className="rounded-xl2 border border-line bg-mint-soft p-5 shadow-soft">
        <h2 className="font-display text-lg font-bold text-teal sm:text-xl">Bütün paketlərə daxildir</h2>
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
        <h2 className="font-display text-xl font-bold text-teal sm:text-2xl">Paketləri müqayisə edin</h2>
        <p className="mx-auto mt-1 max-w-2xl text-sm text-slate-600">
          Hər funksiyanın hansı paketə daxil olduğu. Tezliklə funksiyalar Business paketinə mərhələli açılır.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-line bg-panel shadow-soft">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-10 bg-panel px-4 py-3 font-display text-sm font-bold text-teal">
                Funksiya
              </th>
              {PACKAGES.map((p) => (
                <th
                  key={p.id}
                  className={`px-3 py-3 text-center align-bottom ${p.highlight ? "bg-mint-soft" : ""}`}
                >
                  {p.highlight && (
                    <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      <Star className="h-3 w-3" aria-hidden="true" /> Populyar
                    </span>
                  )}
                  <div className="font-display text-sm font-bold text-slate-900">{p.name}</div>
                  <div className="text-xs font-medium text-slate-500">
                    {p.price === "0" ? "Pulsuz" : `${p.price} ${p.period}`}
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
                      tezliklə
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
        Qiymətlərə ƏDV daxildir. Funksiya siyahısı platformanın gating qaydaları ilə uyğunlaşdırılıb.
      </p>
    </section>
  );
}
