"use client";

// Provider directory / catalog (HYBRID_PLAN §E W5). Farmers browse labs / consultants / suppliers,
// filter by kind, and start a conversation. Inline AZ copy (T18 extracts later).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Users, Package, Star, Search } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote } from "@/components/ui";
import { ListSkeleton } from "@/components/Skeleton";

interface Provider {
  id: string; user_id: string; kind: string; company: string; bio?: string | null;
  specializations: string[]; country?: string | null; region?: string | null;
  rating?: number | null; order_count: number;
}

const KINDS: { key: string; label: string; Icon: typeof Package }[] = [
  { key: "", label: "Hamısı", Icon: Search },
  { key: "lab", label: "Laboratoriya", Icon: FlaskConical },
  { key: "consultant", label: "Konsultant", Icon: Users },
  { key: "supplier", label: "Təchizatçı", Icon: Package },
];
const KIND_LABEL: Record<string, string> = { lab: "Laboratoriya", consultant: "Konsultant", supplier: "Təchizatçı" };
const KIND_COLOR: Record<string, string> = { lab: "#2f6ca8", consultant: "#7a5bd0", supplier: "#c07a1f" };

export default function CatalogPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [kind, setKind] = useState("");
  const [list, setList] = useState<Provider[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }
    if (!user) return;
    let active = true;
    setList(null);
    (async () => {
      try {
        const q = kind ? `?kind=${kind}` : "";
        const r = await api.get<Provider[]>(`/api/providers${q}`);
        if (active) setList(r);
      } catch (err) { if (active) { setError(azError(err)); setList([]); } }
    })();
    return () => { active = false; };
  }, [kind, user, loading, router]);

  async function contact(p: Provider) {
    try {
      const r = await api.post<{ id: string }>("/api/chat/start", { other_user_id: p.user_id, kind: "provider" });
      router.push(`/chat?c=${r.id}`);
    } catch (err) { setError(azError(err)); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Kataloq</h1>
      <p className="text-sm text-slate-500">Laboratoriya, konsultant və təchizatçıları tapın, birbaşa yazın.</p>
      <div className="flex flex-wrap gap-2">
        {KINDS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setKind(key)}
            className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium ${
              kind === key ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600"}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </button>
        ))}
      </div>
      <ErrorNote message={error} />
      {list === null ? <ListSkeleton count={4} /> : list.length === 0 ? (
        <div className="card text-center text-slate-600">Bu kateqoriyada hələ provayder yoxdur.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((p) => (
            <div key={p.id} className="card flex gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: KIND_COLOR[p.kind] || "#2f6b45" }}>
                {(p.company || "?").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-slate-900">{p.company}</h3>
                  {p.rating != null && <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500"><Star className="h-3.5 w-3.5 fill-current" />{p.rating.toFixed(1)}</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{KIND_LABEL[p.kind] || p.kind}</span>
                  {(p.specializations || []).slice(0, 3).map((s) => (
                    <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{s}</span>
                  ))}
                  {p.region && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{p.region}</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn-primary" onClick={() => contact(p)}>Müraciət et</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
