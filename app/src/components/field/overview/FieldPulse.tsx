"use client";

// E14 — the one card a farmer sees first. It merges what used to be two stacked cards: the 0-100
// wellness score (WellnessCard, its own /wellness fetch) and the verdict hero from OverviewTab.
// Stacked they ran to roughly a thousand pixels and said the same thing twice — the score, then the
// sentence explaining the score. Together they are one glance: ring, verdict, why, and the three
// component bars that produced the number.
//
// The score is never shown alone (B8 rule): every component that fed it is listed with its own
// sub-score and weight, and anything the platform could NOT see is named, so the farmer knows what
// the number is blind to.
import { useCallback, useEffect, useState } from "react";
import { EyeOff, RefreshCw } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote, Spinner } from "@/components/ui";
import { t } from "@/lib/i18n";
import { useFormatArea } from "@/lib/units";
import { wellnessHeadline, wellnessLabel, wellnessReason } from "@/lib/wellnessText";
// Tone colours + sub-score cut-offs are shared with the public /demo copy of this card so the two
// can never disagree about what "healthy" looks like.
import { TONE, WELLNESS_ORDER as ORDER, subTone, type Tone } from "@/lib/wellnessTone";
import SpeakButton from "@/components/SpeakButton";
import MetadataNudge from "./MetadataNudge";
import type { FieldDetail } from "@/lib/types";

interface WellnessComponent {
  key: string;
  label: string;
  /** Set when the component was scored from a stand-in signal — it is labelled as that signal. */
  label_code?: string | null;
  score: number;
  weight: number;
  /** Largest-remainder integer share; the displayed percentages always add up to exactly 100. */
  weight_pct?: number | null;
  value?: number | null;
  reason?: string | null;
  detail?: Record<string, unknown> | null;
}

interface Wellness {
  available: boolean;
  score: number | null;
  tone: Tone | null;
  headline: string;
  headline_code?: string | null;
  headline_params?: Record<string, unknown> | null;
  components: Record<string, WellnessComponent>;
  missing?: string[];
  missing_labels?: string[];
  sensor?: string | null;
  computed_on?: string | null;
}

const R = 44;
const CIRC = 2 * Math.PI * R;

export default function FieldPulse({ field }: { field: FieldDetail }) {
  const [data, setData] = useState<Wellness | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fmtArea = useFormatArea();

  const load = useCallback(async (refresh = false) => {
    if (refresh) setBusy(true);
    try {
      setData(await api.get<Wellness>(`/api/fields/${field.id}/wellness${refresh ? "?refresh=1" : ""}`));
      setError("");
    } catch (err) {
      setError(azError(err));
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }, [field.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <div className="card"><Spinner /></div>;

  const tone: Tone = data?.tone ?? "warn";
  const c = TONE[tone];
  const score = data?.score ?? null;
  const headline = data
    ? wellnessHeadline(data.headline_code, data.headline_params, data.headline)
    : "";
  const comps = data?.available
    ? ORDER.map((k) => data.components[k]).filter((x): x is WellnessComponent => Boolean(x))
    : [];
  // The spoken version is the verdict plus the reason of the weakest component — enough to act on
  // without listening to the whole page.
  const reasonOf = (x: WellnessComponent) =>
    wellnessReason(
      x.detail?.reason_code as string | undefined,
      x.detail?.reason_params as Record<string, unknown> | undefined,
      x.detail,
      x.reason,
    );
  const worst = comps.length ? comps.reduce((a, b) => (a.score <= b.score ? a : b)) : null;
  const speech = [headline, worst ? reasonOf(worst) : ""].filter(Boolean).join(". ");

  return (
    <section className={`rounded-2xl border-[1.5px] ${c.edge} ${c.wash} p-4 sm:p-5`}>
      {error && <div className="mb-3"><ErrorNote message={error} /></div>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {score !== null && (
          <div className="relative h-[104px] w-[104px] shrink-0">
            <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90" aria-hidden="true">
              <circle cx="52" cy="52" r={R} fill="none" stroke="rgba(0,0,0,.07)" strokeWidth="10" />
              <circle
                cx="52" cy="52" r={R} fill="none" stroke={c.ring} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - Math.max(0, Math.min(100, score)) / 100)}
              />
            </svg>
            <span className="absolute inset-0 grid place-content-center text-center">
              <b className="block text-[29px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
                {score}
              </b>
              <span className="mt-0.5 block text-[9.5px] font-bold uppercase tracking-wider text-ink-soft">
                {t("app.field.wellnessCard.outOf100")}
              </span>
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className={`font-display text-[clamp(18px,2.2vw,23px)] font-extrabold leading-tight tracking-tight ${c.text}`}>
            {headline || t("app.field.wellnessCard.notEnoughData")}
          </h3>
          {field.area_ha != null && (
            <p className="mt-1 text-[13px] text-ink-soft">
              {fmtArea(field.area_ha)}
              {data?.computed_on ? ` · ${t("app.field.wellnessCard.computedOn")}${data.computed_on}` : ""}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {speech && <SpeakButton text={speech} />}
            <button
              onClick={() => void load(true)}
              disabled={busy}
              aria-label={t("app.field.wellnessCard.recalcAria")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-line bg-panel px-3 text-[13px] font-semibold text-ink-soft hover:border-grass hover:text-grass-deep disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
              {t("app.field.wellnessCard.recalcAria")}
            </button>
          </div>
        </div>
      </div>

      {comps.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-dashed border-line pt-3.5">
          {comps.map((x) => (
            <div key={x.key} className="grid grid-cols-[minmax(96px,132px)_1fr_auto] items-center gap-2.5 text-[12.5px]">
              <span className="font-semibold text-ink-soft">
                {wellnessLabel(x.key, x.label, x.label_code)}
              </span>
              <span className="h-[7px] overflow-hidden rounded-full bg-black/[.06]">
                <span
                  className={`block h-full rounded-full ${TONE[subTone(x.score)].bar}`}
                  style={{ width: `${Math.max(0, Math.min(100, x.score))}%` }}
                />
              </span>
              <span className="whitespace-nowrap text-right tabular-nums text-ink-soft">
                <b className="text-ink">{Math.round(x.score)}</b>
                <span className="text-ink-soft">
                  {t("app.field.wellnessCard.weightSuffix")}
                  {x.weight_pct ?? Math.round(x.weight * 100)}%
                </span>
              </span>
            </div>
          ))}
          {comps.map((x) => {
            const text = reasonOf(x);
            return text ? (
              <p key={`${x.key}-r`} className="text-[12px] leading-snug text-ink-soft">{text}</p>
            ) : null;
          })}
        </div>
      )}

      {(data?.missing?.length ?? data?.missing_labels?.length ?? 0) > 0 && data ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-black/[.03] px-3 py-2 text-[12px] leading-snug text-ink-soft">
          <EyeOff className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {t("app.field.wellnessCard.missingPre")}
            <b>
              {(data.missing?.length
                ? data.missing.map((k, i) => wellnessLabel(k, data.missing_labels?.[i]))
                : data.missing_labels ?? []
              ).join(", ")}
            </b>
            {t("app.field.wellnessCard.missingPost")}
          </span>
        </p>
      ) : null}

      {/* What the platform is blind to because nobody told it yet — ranked, at most two, fillable
          in place, dismissible. Renders nothing once the passport is complete. */}
      <MetadataNudge field={field} />
    </section>
  );
}
