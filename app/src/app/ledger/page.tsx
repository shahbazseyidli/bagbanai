"use client";

// Təsərrüfat dəftəri — per-field P&L-lite (HYBRID_PLAN W6). Expenses (operations) vs revenue (yields)
// per field + org totals. Inline AZ copy (T18 extracts later).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote, Spinner } from "@/components/ui";
import type { Org } from "@/lib/types";

interface Row { field_id: string; name: string; area_ha: number; expenses: number; revenue: number; profit: number; profit_per_ha: number | null; }
interface Cat { category: string; amount: number; }
interface Ledger { fields: Row[]; totals: { expenses: number; revenue: number; profit: number }; by_category?: Cat[]; }

const fmt = (n: number) => `${Math.round(n).toLocaleString("az")} ₼`;

export default function LedgerPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [data, setData] = useState<Ledger | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }
    if (!user) return;
    api.get<Org[]>("/api/orgs").then((l) => { setOrgs(l); if (l[0]) setOrgId(l[0].id); }).catch((e) => setError(azError(e)));
  }, [user, loading, router]);

  useEffect(() => {
    if (!orgId) return;
    setData(null);
    api.get<Ledger>(`/api/orgs/${orgId}/ledger`).then(setData).catch((e) => { setError(azError(e)); });
  }, [orgId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Təsərrüfat dəftəri</h1>
        {orgs.length > 1 && (
          <select className="input max-w-xs" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </div>
      <p className="text-sm text-slate-500">Sahə üzrə xərc, gəlir və mənfəət. Xərclər əməliyyat qeydlərindən, gəlir məhsuldarlıq qeydlərindən götürülür.</p>
      <ErrorNote message={error} />
      {data === null ? <Spinner /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card"><div className="text-xs text-slate-500">Ümumi xərc</div><div className="mt-1 text-2xl font-bold text-red-600">{fmt(data.totals.expenses)}</div></div>
            <div className="card"><div className="text-xs text-slate-500">Ümumi gəlir</div><div className="mt-1 text-2xl font-bold text-emerald-700">{fmt(data.totals.revenue)}</div></div>
            <div className="card border-emerald-300 bg-emerald-50/40"><div className="text-xs text-slate-500">Xalis mənfəət</div><div className="mt-1 text-2xl font-bold text-emerald-700">{fmt(data.totals.profit)}</div></div>
          </div>
          {data.by_category && data.by_category.length > 0 && (
            <div className="card">
              <h2 className="mb-3 text-lg font-semibold text-slate-800">Xərc kateqoriyaları</h2>
              <div className="space-y-2">
                {data.by_category.map((c) => {
                  const pct = data.totals.expenses > 0 ? Math.round((c.amount / data.totals.expenses) * 100) : 0;
                  return (
                    <div key={c.category}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize text-slate-700">{c.category}</span>
                        <span className="tabular-nums text-slate-600">{fmt(c.amount)} · {pct}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-red-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="card overflow-x-auto">
            <h2 className="mb-3 text-lg font-semibold text-slate-800">Sahə üzrə</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 text-left font-semibold">Sahə</th>
                <th className="py-2 text-right font-semibold">Xərc</th>
                <th className="py-2 text-right font-semibold">Gəlir</th>
                <th className="py-2 text-right font-semibold">Mənfəət</th>
                <th className="py-2 text-right font-semibold">/ha</th>
              </tr></thead>
              <tbody>
                {data.fields.map((r) => (
                  <tr key={r.field_id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/fields/${r.field_id}?tab=yields`)}>
                    <td className="py-2.5">{r.name}</td>
                    <td className="py-2.5 text-right tabular-nums text-red-600">{fmt(r.expenses)}</td>
                    <td className="py-2.5 text-right tabular-nums text-emerald-700">{fmt(r.revenue)}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{fmt(r.profit)}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">{r.profit_per_ha != null ? `${Math.round(r.profit_per_ha)} ₼` : "—"}</td>
                  </tr>
                ))}
                {data.fields.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Hələ sahə yoxdur.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
