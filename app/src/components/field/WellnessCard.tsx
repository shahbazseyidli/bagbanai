"use client";

// B8 — Sahə sağlamlıq balı (0-100). The number is never shown alone: every component that fed it is
// listed with its own sub-score and reason, and every input the platform COULD NOT see is named
// explicitly, so the farmer knows what the score is blind to. Inline AZ copy (T18 extracts later).
import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw, EyeOff } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote, Placeholder, Spinner } from "@/components/ui";

type Tone = "good" | "warn" | "bad";

interface WellnessComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
  value?: number | null;
  sensor?: string | null;
  reason?: string | null;
}

interface Wellness {
  available: boolean;
  field_id: string;
  score: number | null;
  tone: Tone | null;
  headline: string;
  sensor?: string | null;
  components: Record<string, WellnessComponent>;
  missing: string[];
  missing_labels: string[];
  worst?: string | null;
  computed_on?: string | null;
}

const TONE: Record<Tone, { text: string; bg: string; border: string; bar: string }> = {
  good: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-500" },
  warn: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", bar: "bg-amber-500" },
  bad: { text: "text-red-700", bg: "bg-red-50", border: "border-red-200", bar: "bg-red-500" },
};

// Stable display order — matches the weighting order in services/app/ai/wellness.py.
const ORDER = ["ndvi", "water", "pest", "gdd"];

function subTone(score: number): Tone {
  if (score >= 70) return "good";
  if (score >= 45) return "warn";
  return "bad";
}

export default function WellnessCard({ fieldId }: { fieldId: string }) {
  const [data, setData] = useState<Wellness | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setBusy(true);
      setError("");
      try {
        setData(await api.get<Wellness>(`/api/fields/${fieldId}/wellness${refresh ? "?refresh=1" : ""}`));
      } catch (err) {
        setError(azError(err));
      } finally {
        setLoading(false);
        setBusy(false);
      }
    },
    [fieldId],
  );

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="card">
        <Spinner label="Sağlamlıq balı hesablanır…" />
      </div>
    );
  }

  const tone: Tone = data?.tone ?? "warn";
  const c = TONE[tone];
  const items = data
    ? ORDER.map((k) => data.components[k]).filter((x): x is WellnessComponent => Boolean(x))
    : [];

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <Activity className="h-4 w-4 text-emerald-700" /> Sahə sağlamlıq balı
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Peyk, su balansı, zərərverici riski və istilik toplanmasından hesablanır.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={busy}
          aria-label="Balı yenidən hesabla"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
        </button>
      </div>

      <ErrorNote message={error} />

      {!data || !data.available || data.score === null ? (
        <Placeholder>
          {data?.headline ??
            "Hələ kifayət qədər məlumat yoxdur — peyk və hava məlumatı toplandıqca bal hesablanacaq."}
        </Placeholder>
      ) : (
        <>
          <div className={`flex items-center gap-4 rounded-xl border ${c.border} ${c.bg} p-4`}>
            <div className="flex flex-col items-center">
              <span className={`text-5xl font-bold leading-none tabular-nums ${c.text}`}>{data.score}</span>
              <span className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">100 baldan</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${c.text}`}>{data.headline}</p>
              <div className="mt-2 h-2 rounded-full bg-white/70">
                <div className={`h-2 rounded-full ${c.bar}`} style={{ width: `${data.score}%` }} />
              </div>
              {data.computed_on && (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Hesablanma tarixi: {data.computed_on}
                  {data.sensor ? ` · peyk: ${data.sensor}` : ""}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {items.map((it) => {
              const t = TONE[subTone(it.score)];
              return (
                <div key={it.key}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-700">{it.label}</span>
                    <span className={`shrink-0 tabular-nums font-semibold ${t.text}`}>
                      {Math.round(it.score)}
                      <span className="text-xs font-normal text-slate-400">/100 · çəki {Math.round(it.weight * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className={`h-1.5 rounded-full ${t.bar}`} style={{ width: `${Math.max(0, Math.min(100, it.score))}%` }} />
                  </div>
                  {it.reason && <p className="mt-1 text-xs leading-snug text-slate-500">{it.reason}</p>}
                </div>
              );
            })}
          </div>

          {(data.missing_labels?.length ?? 0) > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                Bu bal <b>{data.missing_labels.join(", ")}</b> məlumatını görmür — həmin göstərici üçün data yoxdur, ona görə
                bala daxil edilməyib (sıfır kimi sayılmır). Qalan göstəricilərin çəkisi yenidən bölüşdürülüb.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
