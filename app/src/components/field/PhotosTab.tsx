"use client";

// Foto module (HYBRID_PLAN E10): the farmer snaps a field/crop/tree photo; the backend auto-labels it
// with Claude vision (subject + condition) and the label feeds AI advice. Gallery + upload here; the
// deeper disease diagnosis stays in PhotoDiagnose. Inline AZ copy (T18 extracts later).
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { api, apiAsset, azError } from "@/lib/api";
import { ErrorNote } from "@/components/ui";
import PhotoDiagnose from "./PhotoDiagnose";

interface Photo { id: string; photo_path: string; ai_label?: string | null; ai_condition?: string | null; ai_notes?: string | null; created_at: string; }

const COND_AZ: Record<string, { label: string; cls: string }> = {
  healthy: { label: "Sağlam", cls: "bg-emerald-100 text-emerald-700" },
  stress: { label: "Stress", cls: "bg-amber-100 text-amber-700" },
  pest: { label: "Zərərverici", cls: "bg-red-100 text-red-700" },
  disease: { label: "Xəstəlik", cls: "bg-red-100 text-red-700" },
  nutrient: { label: "Qidalanma", cls: "bg-amber-100 text-amber-700" },
  other: { label: "Digər", cls: "bg-slate-100 text-slate-600" },
};

export default function PhotosTab({ fieldId }: { fieldId: string }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.get<Photo[]>(`/api/fields/${fieldId}/photos`).then(setPhotos).catch((e) => { setError(azError(e)); setPhotos([]); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [fieldId]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setError("");
    try { await api.upload(`/api/fields/${fieldId}/photos`, f); await load(); }
    catch (err) { setError(azError(err)); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div className="space-y-5">
      <ErrorNote message={error} />
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Sahə şəkilləri</h3>
            <p className="text-xs text-slate-500">Şəkil çək — AI özü tanısın və analizə daxil etsin.</p>
          </div>
          <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Şəkil əlavə et
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {(photos || []).map((p) => {
            const cond = p.ai_condition ? COND_AZ[p.ai_condition] || COND_AZ.other : null;
            return (
              <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="relative h-28 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {/* Bytes are served by the authenticated route (B15) — the stored
                      "uploads/x.jpg" path has no route and 404s through nginx. */}
                  <img src={apiAsset(`/api/photos/${p.id}/download`)} alt={p.ai_label || "Sahə şəkli"} className="h-full w-full object-cover" />
                  {cond && <span className={`absolute left-2 bottom-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${cond.cls}`}>{cond.label}</span>}
                </div>
                <div className="p-2">
                  <b className="block truncate text-xs text-slate-900">{p.ai_label || "Şəkil"}</b>
                  <span className="text-[10px] font-semibold text-emerald-700">{p.ai_label ? "AI tanıdı" : "—"}</span>
                </div>
              </div>
            );
          })}
          {photos && photos.length === 0 && <p className="col-span-full text-sm text-slate-500">Hələ şəkil yoxdur.</p>}
        </div>
      </div>

      {/* deeper disease diagnosis */}
      <PhotoDiagnose fieldId={fieldId} />
    </div>
  );
}
