import Link from "next/link";
import { PACKAGES, FEATURES } from "@/lib/pricing";

// Renders a value cell: ✅/✕ get colour, everything else stays plain text.
function Cell({ v }: { v: string }) {
  if (v === "✕") return <span className="text-slate-300">—</span>;
  const good = v.startsWith("✅") || v.startsWith("🎁");
  return <span className={good ? "text-emerald-700" : "text-slate-700"}>{v}</span>;
}

const COL_BG = ["", "bg-emerald-50/40", ""];

export default function PricingTable({ showCta = true }: { showCta?: boolean }) {
  return (
    <div className="space-y-4">
      {/* Package header cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PACKAGES.map((p) => (
          <div
            key={p.id}
            className={`relative rounded-2xl border p-5 ${
              p.highlight
                ? "border-emerald-400 bg-emerald-50/50 shadow-sm"
                : "border-slate-200 bg-white"
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-2.5 left-5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                {p.tagline}
              </span>
            )}
            <div className="text-2xl">{p.emoji}</div>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{p.name}</h3>
            {!p.highlight && <p className="text-xs text-slate-500">{p.tagline}</p>}
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">{p.price}</span>
              <span className="text-sm text-slate-500">{p.period}</span>
            </div>
            {showCta && (
              <Link
                href="/signup"
                className={`mt-4 block rounded-lg px-4 py-2 text-center text-sm font-semibold ${
                  p.highlight
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p.id === "free" ? "Pulsuz başla" : "Seç"}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Feature comparison */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Funksiya</th>
              {PACKAGES.map((p, i) => (
                <th key={p.id} className={`px-4 py-3 text-center font-semibold text-slate-700 ${COL_BG[i]}`}>
                  {p.emoji} {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FEATURES.map((f) => (
              <tr key={f.label} className="hover:bg-slate-50/50">
                <td className="px-4 py-2.5 text-slate-600">
                  {f.label}
                  {f.soon && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      tezliklə
                    </span>
                  )}
                </td>
                {f.values.map((v, i) => (
                  <td key={i} className={`px-4 py-2.5 text-center ${COL_BG[i]}`}>
                    <Cell v={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        🔜 “tezliklə” funksiyalar Business paketinə mərhələli əlavə olunur. Qiymətlərə ƏDV daxildir.
      </p>
    </div>
  );
}
