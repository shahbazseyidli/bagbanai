"use client";

// Photo disease/pest diagnosis (T5). Upload a plant photo → Claude vision → structured, Rule-7-safe
// Azerbaijani diagnosis. Business-tier; a 402 renders the upgrade CTA instead of a raw error.

import { useState } from "react";
import { Camera, Sparkles, AlertTriangle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import UpgradeCta from "@/components/UpgradeCta";

interface Diag {
  problem_type: string;
  confidence: string;
  observations: string;
  likely_causes: string[];
  recommended_actions: string[];
  disclaimer: string;
}

const CONF_CLASS: Record<string, string> = {
  aşağı: "bg-amber-50 text-amber-700",
  orta: "bg-sky-50 text-sky-700",
  yüksək: "bg-emerald-50 text-emerald-700",
};

export default function PhotoDiagnose({ fieldId }: { fieldId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Diag | null>(null);
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
      setResult(await api.upload<Diag>(`/api/fields/${fieldId}/diagnose`, file));
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) setGated(true);
      else if (err instanceof ApiError && err.status === 503) setError("AI hazırda əlçatan deyil.");
      else setError(err instanceof Error ? err.message : "Diaqnoz alınmadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-emerald-600" />
        <h3 className="font-semibold text-slate-800">AI foto diaqnoz</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Paket 3</span>
      </div>
      <p className="text-xs text-slate-500">
        Xəstə yarpaq/bitki şəklini yükləyin — AI ehtimal olunan problemi təyin etsin. Nəticə məsləhət
        xarakterlidir; dəqiq preparat üçün aqronomla məsləhətləşin.
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
          <Sparkles className="h-4 w-4" /> {busy ? "Analiz olunur…" : "Diaqnoz al"}
        </button>
      </div>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="seçilmiş" className="max-h-48 rounded-lg border border-slate-200 object-contain" />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {gated && (
        <UpgradeCta
          title="AI foto diaqnoz Paket 3-də açıqdır"
          subtitle="Xəstəlik/zərərverici şəkillərini AI ilə analiz etmək üçün Paket 3-ə keçin (aylıq 30 diaqnoz)."
          priceLine="Paket 3 — 25 AZN/ay"
          onDismiss={() => setGated(false)}
        />
      )}

      {result && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-800">{result.problem_type}</h4>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONF_CLASS[result.confidence] ?? "bg-slate-100 text-slate-600"}`}>
              əminlik: {result.confidence}
            </span>
          </div>
          {result.observations && <p className="mt-2 text-sm text-slate-700">{result.observations}</p>}

          {result.likely_causes?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ehtimal olunan səbəblər</p>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                {result.likely_causes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {result.recommended_actions?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tövsiyə olunan addımlar</p>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                {result.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {result.disclaimer && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{result.disclaimer}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
