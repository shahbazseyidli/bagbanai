"use client";

// Lab soil-analysis OCR (T24). Upload a soil-report photo/scan → Claude vision extracts pH, humus,
// N/P/K, texture, EC, CaCO3 → stored and promoted to the field's soil passport (lab > SoilGrids).
// Business-tier; a 402 renders the upgrade CTA instead of a raw error.
import { useState } from "react";
import { FlaskConical, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import UpgradeCta from "@/components/UpgradeCta";

interface SoilLab {
  ph: number | null;
  organic_matter_pct: number | null;
  nitrogen: string | null;
  phosphorus: string | null;
  potassium: string | null;
  texture: string | null;
  ec: number | null;
  caco3_pct: number | null;
  notes: string | null;
  confidence: string;
}

const ROWS: { k: keyof SoilLab; label: string }[] = [
  { k: "ph", label: "pH" },
  { k: "organic_matter_pct", label: "Üzvi maddə %" },
  { k: "nitrogen", label: "Azot (N)" },
  { k: "phosphorus", label: "Fosfor (P₂O₅)" },
  { k: "potassium", label: "Kalium (K₂O)" },
  { k: "texture", label: "Mexaniki tərkib" },
  { k: "ec", label: "Duzluluq (EC)" },
  { k: "caco3_pct", label: "Karbonat CaCO₃ %" },
];

function has(v: SoilLab[keyof SoilLab]): boolean {
  return v != null && v !== "";
}

export default function SoilLabUpload({ fieldId }: { fieldId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SoilLab | null>(null);
  const [error, setError] = useState("");
  const [gated, setGated] = useState(false);

  function pick(f: File | null) {
    setFile(f);
    setResult(null);
    setError("");
    setGated(false);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    setGated(false);
    try {
      setResult(await api.upload<SoilLab>(`/api/fields/${fieldId}/soil-lab`, file));
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) setGated(true);
      else if (err instanceof ApiError && err.status === 503) setError("AI hazırda əlçatan deyil.");
      else setError(err instanceof Error ? err.message : "Analiz oxunmadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-emerald-600" />
        <h3 className="font-semibold text-slate-800">Laboratoriya torpaq analizi (OCR)</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Paket 3</span>
      </div>
      <p className="text-xs text-slate-500">
        Torpaq laboratoriya hesabatının şəklini yükləyin — AI göstəriciləri (pH, humus, N/P/K, tərkib)
        oxuyub sahə pasportuna əlavə etsin. Lab nəticəsi peyk/SoilGrids qiymətindən üstün tutulur.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className="input max-w-xs"
        />
        <button
          type="button"
          onClick={run}
          disabled={!file || busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" /> {busy ? "Oxunur…" : "Analizi oxu"}
        </button>
      </div>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="seçilmiş" className="max-h-48 rounded-lg border border-slate-200 object-contain" />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {gated && (
        <UpgradeCta
          title="Lab analizi OCR Paket 3-də açıqdır"
          subtitle="Torpaq laboratoriya hesabatlarını AI ilə rəqəmsallaşdırmaq üçün Paket 3-ə keçin."
          priceLine="Paket 3 — 25 AZN/ay"
          onDismiss={() => setGated(false)}
        />
      )}

      {result && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-800">Oxunan göstəricilər</h4>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              əminlik: {result.confidence}
            </span>
          </div>
          {ROWS.some((r) => has(result[r.k])) ? (
            <dl className="mt-2 grid grid-cols-2 gap-x-4">
              {ROWS.filter((r) => has(result[r.k])).map((r) => (
                <div key={r.k} className="flex justify-between gap-2 border-b border-slate-100 py-1 text-sm">
                  <dt className="text-slate-500">{r.label}</dt>
                  <dd className="font-medium text-slate-800">{String(result[r.k])}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Şəkildən dəyər oxuna bilmədi — daha aydın foto sınayın.</p>
          )}
          {result.notes && <p className="mt-2 text-xs text-slate-600">{result.notes}</p>}
        </div>
      )}
    </div>
  );
}
