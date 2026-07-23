"use client";

// Provider profile + catalog editor (HYBRID_PLAN §E). Lab/consultant/supplier edit their public
// profile and (supplier) catalog items. Inline AZ copy.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote, Spinner } from "@/components/ui";
import type { UserRole } from "@/lib/types";

interface Provider { id: string; kind: string; company: string; bio?: string | null; specializations: string[]; country?: string | null; region?: string | null; address?: string | null; coverage?: string | null; phone?: string | null; }
interface Item { id: string; name: string; category?: string | null; unit?: string | null; price?: number | null; currency: string; description?: string | null; }

const SPECS: Record<string, string[]> = {
  supplier: ["Toxum", "Gübrə", "Dərman (pestisid)", "Texnika", "Suvarma avadanlığı", "Xidmət"],
  lab: ["Torpaq analizi", "NPK", "pH", "Su analizi", "Yarpaq analizi"],
  consultant: ["Bağçılıq", "Fındıq", "Taxıl", "Üzümçülük", "Tərəvəz"],
};

export default function ProviderPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [p, setP] = useState<Provider | null>(null);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [newItem, setNewItem] = useState({ name: "", category: "", unit: "", price: "" });

  const kind = (p?.kind || user?.role || "supplier") as UserRole;

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }
    if (!user) return;
    (async () => {
      try {
        const prof = await api.get<Provider | null>("/api/providers/me");
        setP(prof ?? { id: "", kind: user.role || "supplier", company: "", specializations: [] });
        if (prof) setItems(await api.get<Item[]>("/api/providers/me/catalog"));
      } catch (err) { setError(azError(err)); }
      finally { setReady(true); }
    })();
  }, [user, loading, router]);

  function toggleSpec(s: string) {
    setP((cur) => cur ? { ...cur, specializations: cur.specializations.includes(s) ? cur.specializations.filter((x) => x !== s) : [...cur.specializations, s] } : cur);
  }

  async function save() {
    if (!p) return;
    setError(""); setOk("");
    try {
      await api.put("/api/providers/me", { kind: p.kind, company: p.company, bio: p.bio || undefined, specializations: p.specializations, country: p.country || undefined, region: p.region || undefined, address: p.address || undefined, coverage: p.coverage || undefined, phone: p.phone || undefined });
      setItems(await api.get<Item[]>("/api/providers/me/catalog"));
      setOk("Yadda saxlanıldı");
    } catch (err) { setError(azError(err)); }
  }

  async function addItem() {
    if (!newItem.name.trim()) return;
    try {
      const it = await api.post<Item>("/api/providers/me/catalog", { name: newItem.name, category: newItem.category || undefined, unit: newItem.unit || undefined, price: newItem.price ? Number(newItem.price) : undefined });
      setItems((cur) => [it, ...cur]);
      setNewItem({ name: "", category: "", unit: "", price: "" });
    } catch (err) { setError(azError(err)); }
  }

  async function delItem(id: string) {
    try { await api.del(`/api/providers/me/catalog/${id}`); setItems((cur) => cur.filter((x) => x.id !== id)); } catch (err) { setError(azError(err)); }
  }

  if (!ready || !p) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Provayder profili</h1>
      <div className="card space-y-3">
        <div><label className="label">Şirkət / ad</label><input className="input" value={p.company} onChange={(e) => setP({ ...p, company: e.target.value })} /></div>
        <div><label className="label">Haqqında</label><textarea className="input" rows={2} value={p.bio || ""} onChange={(e) => setP({ ...p, bio: e.target.value })} /></div>
        <div><label className="label">İxtisaslaşma</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(SPECS[kind] || []).map((s) => (
              <button key={s} type="button" onClick={() => toggleSpec(s)} className={`rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium ${p.specializations.includes(s) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600"}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Region</label><input className="input" value={p.region || ""} onChange={(e) => setP({ ...p, region: e.target.value })} /></div>
          <div><label className="label">Telefon</label><input className="input" value={p.phone || ""} onChange={(e) => setP({ ...p, phone: e.target.value })} /></div>
        </div>
        <div><label className="label">Ünvan</label><input className="input" value={p.address || ""} onChange={(e) => setP({ ...p, address: e.target.value })} /></div>
        <div><label className="label">Əhatə zonası</label><input className="input" value={p.coverage || ""} onChange={(e) => setP({ ...p, coverage: e.target.value })} /></div>
        <ErrorNote message={error} />
        {ok && <p className="text-sm text-emerald-700">{ok}</p>}
        <button className="btn-primary" onClick={save} disabled={!p.company}>Yadda saxla</button>
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Kataloq</h2>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5">
              <div className="min-w-0 flex-1"><b className="text-sm">{it.name}</b><div className="text-xs text-slate-500">{[it.category, it.unit, it.price != null ? `${it.price} ${it.currency}` : null].filter(Boolean).join(" · ")}</div></div>
              <button onClick={() => delItem(it.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-slate-500">Hələ məhsul yoxdur.</p>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input className="input" placeholder="Ad" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
          <input className="input" placeholder="Kateqoriya" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} />
          <input className="input" placeholder="Vahid" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
          <input className="input" placeholder="Qiymət" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
        </div>
        <button className="btn-secondary mt-2" onClick={addItem}><Plus className="h-4 w-4" /> Məhsul əlavə et</button>
      </div>
    </div>
  );
}
