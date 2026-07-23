import Link from "next/link";
import { Sprout, Leaf, Gem, Check, Sun } from "lucide-react";
import { PACKAGES, FEATURES } from "@/lib/pricing";
import { t, type I18nKey } from "@/lib/i18n";

// D4.4 — 3 stacked cards, icon+word (no emoji), no comparison table, no horizontal scroll. Each
// card lists what that tier INCLUDES as check bullets (excluded rows are simply omitted). A
// free-core line makes clear the satellite health map + weather are always free.
const ICON = [Sprout, Leaf, Gem] as const;

/** Turn a tier's comparison value into a readable bullet detail ("" when it's a plain ✅). */
function detailOf(v: string): string {
  if (v === "✅") return "";
  return v.replace(/^✅\s*\+?\s*/, "").replace(/^🎁\s*/, "").trim();
}

function bulletsFor(tierIdx: number) {
  return FEATURES.filter((f) => f.values[tierIdx] !== "✕").map((f) => ({
    label: f.label,
    detail: detailOf(f.values[tierIdx]),
    soon: f.soon,
  }));
}

export default function PricingTable({ showCta = true }: { showCta?: boolean }) {
  return (
    <div className="space-y-4">
      {/* Free-core reassurance */}
      <div className="flex items-start gap-2 rounded-xl border-[1.5px] border-emerald-200 bg-emerald-50 px-4 py-3">
        <Sun className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <p className="text-sm text-emerald-900">{t("price.freecore")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PACKAGES.map((p, i) => {
          const Icon = ICON[i] ?? Sprout;
          const bullets = bulletsFor(i);
          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border-[1.5px] p-5 ${
                p.highlight ? "border-emerald-400 bg-emerald-50/40 shadow-sm" : "border-slate-300 bg-white"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  {t(`price.tag.${p.id}` as I18nKey)}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                  {!p.highlight && <p className="text-xs text-slate-500">{t(`price.tag.${p.id}` as I18nKey)}</p>}
                </div>
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">{p.price}</span>
                <span className="text-sm text-slate-500">{p.period}</span>
              </div>

              {showCta && (
                <Link
                  href="/signup"
                  className={`mt-4 block min-h-11 rounded-xl px-4 py-2.5 text-center text-sm font-bold ${
                    p.highlight
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border-[1.5px] border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p.id === "free" ? t("price.cta.free") : t("price.cta.select")}
                </Link>
              )}

              <ul className="mt-4 space-y-2">
                {bullets.map((b) => (
                  <li key={b.label} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span className="text-slate-700">
                      {b.label}
                      {b.detail && <span className="text-slate-500"> — {b.detail}</span>}
                      {b.soon && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          {t("price.soon")}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">{t("price.footnote")}</p>
    </div>
  );
}
