"use client";

// Gübrə (fertilizer) module (HYBRID_PLAN E8): the farmer keeps a fertilization schedule per field and
// gets an AI/rule suggestion folding in NDVI + the latest soil analysis. Sits alongside the existing
// T13 FertilizerCard calculator. Inline AZ copy (T18 extracts later).
import { useEffect, useState } from "react";
import { Sparkles, Plus, Check, Trash2 } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote } from "@/components/ui";
import FertilizerCard from "./FertilizerCard";

interface Plan { id: string; product: string; category?: string | null; zone?: string | null; dose?: string | null; planned_on?: string | null; status: string; source: string; }
interface Suggestion { product: string; zone?: string; dose?: string; note?: string; source?: string; category?: string }

export default function FertilizerTab({ fieldId }: { fieldId: string }) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState("");
  const [sug, setSug] = useState<{ text: string; suggestions: Suggestion[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ product: "", zone: "", dose: "", planned_on: "" });

  const load = () => api.get<Plan[]>(`/api/fields/${fieldId}/fertilizer`).then(setPlans).catch((e) => { setError(azError(e)); setPlans([]); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [fieldId]);

  async function suggest() {
    setBusy(true); setError("");
    try { setSug(await api.get(`/api/fields/${fieldId}/fertilizer/suggest`)); }
    catch (e) { setError(azError(e)); } finally { setBusy(false); }
  }

  async function addPlan(p: { product: string; zone?: string; dose?: string; planned_on?: string; source?: string; category?: string }) {
    try { await api.post(`/api/fields/${fieldId}/fertilizer`, p); await load(); }
    catch (e) { setError(azError(e)); }
  }

  async function mark(id: string) { try { await api.put(`/api/fertilizer/${id}/status`, { status: "done" }); await load(); } catch (e) { setError(azError(e)); } }
  async function del(id: string) { try { await api.del(`/api/fertilizer/${id}`); await load(); } catch (e) { setError(azError(e)); } }

  return (
    <div className="space-y-5">
      <ErrorNote message={error} />

      {/* AI suggestion */}
      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><Sparkles className="h-4 w-4 text-emerald-600" /> AI gübrə təklifi</h3>
          <button className="btn-secondary" onClick={suggest} disabled={busy}>{busy ? "…" : "Təklif al"}</button>
        </div>
        {sug ? (
          <>
            <p className="text-sm text-slate-700">{sug.text}</p>
            <div className="mt-3 space-y-2">
              {sug.suggestions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5">
                  <div className="min-w-0 flex-1"><b className="text-sm">{s.product}</b><div className="text-xs text-slate-600">{[s.zone, s.dose].filter(Boolean).join(" · ")}{s.note ? ` — ${s.note}` : ""}</div></div>
                  <button className="btn-primary" onClick={() => addPlan({ product: s.product, zone: s.zone, dose: s.dose, category: s.category, source: "ai" })}>Qrafikə əlavə et</button>
                </div>
              ))}
            </div>
          </>
        ) : <p className="text-sm text-slate-500">NDVI trendi + torpaq analizinə görə zona-üzrə doza təklifi almaq üçün düyməyə basın.</p>}
      </div>

      {/* schedule */}
      <div className="card">
        <h3 className="mb-3 text-base font-bold text-slate-900">Gübrələmə qrafiki</h3>
        <div className="space-y-2">
          {(plans || []).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5">
              <button onClick={() => mark(p.id)} className={`flex h-5 w-5 items-center justify-center rounded border-[1.5px] ${p.status === "done" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>{p.status === "done" && <Check className="h-3 w-3" />}</button>
              <div className="min-w-0 flex-1">
                <b className={`text-sm ${p.status === "done" ? "text-slate-400 line-through" : ""}`}>{p.product}</b>
                {p.source === "ai" && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">AI</span>}
                <div className="text-xs text-slate-500">{[p.zone, p.dose].filter(Boolean).join(" · ")}</div>
              </div>
              <span className="text-xs text-slate-400">{p.planned_on || ""}</span>
              <button onClick={() => del(p.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {plans && plans.length === 0 && <p className="text-sm text-slate-500">Hələ gübrələmə əlavə edilməyib.</p>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input className="input" placeholder="Məhsul (Azot 46%)" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
          <input className="input" placeholder="Zona" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
          <input className="input" placeholder="Doza" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} />
          <input className="input" type="date" value={form.planned_on} onChange={(e) => setForm({ ...form, planned_on: e.target.value })} />
        </div>
        <button className="btn-secondary mt-2" disabled={!form.product} onClick={() => { addPlan({ product: form.product, zone: form.zone || undefined, dose: form.dose || undefined, planned_on: form.planned_on || undefined }); setForm({ product: "", zone: "", dose: "", planned_on: "" }); }}><Plus className="h-4 w-4" /> Əlavə et</button>
      </div>

      {/* existing T13 calculator */}
      <FertilizerCard fieldId={fieldId} />
    </div>
  );
}
