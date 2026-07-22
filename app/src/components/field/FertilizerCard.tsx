"use client";

// Fertilizer plan (T11). Removal-based N-P-K per ha + total + stage splits. Business-tier
// (402/gated → upgrade CTA). Rule-7 safe: elemental kg only, points to soil test + agronomist.

import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";
import { api } from "@/lib/api";
import UpgradeCta from "@/components/UpgradeCta";

interface Split { stage: string; share_pct: number; n_kg: number; p_kg: number; k_kg: number }
interface Plan {
  ok?: boolean;
  gated?: boolean;
  reason?: string;
  crop_type?: string;
  target_yield?: number;
  area_ha?: number;
  per_ha?: { n: number; p: number; k: number };
  total?: { n: number; p: number; k: number };
  splits?: Split[];
  disclaimer?: string;
}

export default function FertilizerCard({ fieldId }: { fieldId: string }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await api.get<Plan>(`/api/fields/${fieldId}/fertilizer`);
        if (active) setPlan(p);
      } catch {
        if (active) setPlan(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [fieldId]);

  if (loading || !plan) return null;
  if (plan.gated) {
    return (
      <UpgradeCta
        title="Gübrə planı Paket 3-də açıqdır"
        subtitle="Məhsula uyğun N-P-K normasını və mərhələli gübrələmə cədvəlini görmək üçün Paket 3-ə keçin."
        priceLine="Paket 3 — 25 AZN/ay"
      />
    );
  }
  if (!plan.ok) {
    if (plan.reason === "no_target_yield") {
      return (
        <div className="card text-sm text-slate-600">
          <div className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
            <Sprout className="h-4 w-4 text-emerald-600" /> Gübrə planı
          </div>
          Gübrə planı üçün <b>hədəf məhsuldarlıq</b> (t/ha) daxil edin — yuxarıdakı formada təyin edin.
        </div>
      );
    }
    return null;
  }

  const t = plan.total!;
  const ph = plan.per_ha!;
  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <Sprout className="h-4 w-4 text-emerald-600" />
        <h3 className="font-semibold text-slate-800">Gübrə planı (N-P-K)</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Paket 3</span>
      </div>
      <p className="text-xs text-slate-500">
        Hədəf {plan.target_yield} t/ha · {plan.area_ha} ha · {plan.crop_type}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {([["N", t.n, ph.n], ["P", t.p, ph.p], ["K", t.k, ph.k]] as const).map(([el, tot, per]) => (
          <div key={el} className="rounded-lg border border-slate-200 p-2">
            <div className="text-xs font-medium text-slate-500">{el}</div>
            <div className="font-mono text-lg font-bold text-slate-800">{tot}</div>
            <div className="text-[11px] text-slate-400">kg cəmi · {per}/ha</div>
          </div>
        ))}
      </div>

      {plan.splits && plan.splits.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 pr-2 font-medium">Mərhələ</th>
                <th className="py-1 px-2 text-right font-medium">%</th>
                <th className="py-1 px-2 text-right font-medium">N</th>
                <th className="py-1 px-2 text-right font-medium">P</th>
                <th className="py-1 pl-2 text-right font-medium">K</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {plan.splits.map((s) => (
                <tr key={s.stage} className="border-t border-slate-100">
                  <td className="py-1 pr-2 font-sans text-slate-700">{s.stage}</td>
                  <td className="py-1 px-2 text-right text-slate-500">{s.share_pct}</td>
                  <td className="py-1 px-2 text-right">{s.n_kg}</td>
                  <td className="py-1 px-2 text-right">{s.p_kg}</td>
                  <td className="py-1 pl-2 text-right">{s.k_kg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {plan.disclaimer && <p className="mt-3 text-[11px] text-slate-500">{plan.disclaimer}</p>}
    </div>
  );
}
