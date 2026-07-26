"use client";

// The 0-100 wellness card, read-only, for the public /demo page.
//
// This is a deliberate presentational duplicate of components/field/overview/FieldPulse: that card
// owns an authenticated /wellness fetch, a "recompute" button and MetadataNudge, which POSTs field
// metadata. Teaching it an "injected data, hide the buttons" mode would put a permanently-false
// branch into the most-read card in the product and leave an anonymous page one careless edit away
// from calling an authenticated endpoint. What is duplicated here is layout; the parts that would
// be a lie if they drifted — the tone colours, the sub-score cut-offs, every sentence renderer —
// come from lib/wellnessTone.ts and lib/wellnessText.ts, exactly as FieldPulse's do.
import { EyeOff } from "lucide-react";
import { t, tf } from "@/lib/i18n";
import { wellnessHeadline, wellnessLabel, wellnessReason } from "@/lib/wellnessText";
import { TONE, WELLNESS_ORDER, subTone, type Tone } from "@/lib/wellnessTone";
import { pkgFull, pkgShort } from "./DemoPlanNote";

export interface DemoComponent {
  key: string;
  label?: string | null;
  label_code?: string | null;
  score: number;
  weight?: number | null;
  weight_pct?: number | null;
  reason?: string | null;
  detail?: Record<string, unknown> | null;
}

export interface DemoWellness {
  score: number;
  tone: Tone | null;
  headline_code?: string | null;
  headline_params?: Record<string, unknown> | null;
  components: Record<string, DemoComponent>;
  missing?: string[] | null;
  computed_on?: string | null;
}

const R = 44;
const CIRC = 2 * Math.PI * R;

export default function DemoPulse({
  wellness,
  gated,
  demoTier,
}: {
  wellness: DemoWellness;
  /** Component keys the demo field's package pays for and the free package does not (routers/demo.py). */
  gated?: string[] | null;
  demoTier?: string | null;
}) {
  const tone: Tone = wellness.tone ?? "warn";
  const c = TONE[tone];
  const score = wellness.score;
  const headline = wellnessHeadline(wellness.headline_code, wellness.headline_params);
  const comps = WELLNESS_ORDER
    .map((k) => wellness.components?.[k])
    .filter((x): x is DemoComponent => Boolean(x));
  const missing = wellness.missing ?? [];
  // The sub-score is still shown and still counts towards the number above it — hiding it would
  // leave a headline whose listed parts no longer add up. It is labelled instead.
  const gatedSet = new Set(gated ?? []);
  const badge = pkgShort(demoTier);
  const badgeTitle = badge ? tf("mkt.demo.plan.badgeAria", { pkg: pkgFull(demoTier) }) : "";

  return (
    <section className={`rounded-2xl border-[1.5px] ${c.edge} ${c.wash} p-4 sm:p-5`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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

        <div className="min-w-0 flex-1">
          <h3 className={`font-display text-[clamp(18px,2.2vw,23px)] font-extrabold leading-tight tracking-tight ${c.text}`}>
            {headline || t("app.field.wellnessCard.notEnoughData")}
          </h3>
          {wellness.computed_on && (
            <p className="mt-1 text-[13px] text-ink-soft">
              {t("app.field.wellnessCard.computedOn")}
              {wellness.computed_on}
            </p>
          )}
        </div>
      </div>

      {comps.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-dashed border-line pt-3.5">
          {comps.map((x) => (
            <div key={x.key} className="grid grid-cols-[minmax(96px,132px)_1fr_auto] items-center gap-2.5 text-[12.5px]">
              <span className="flex flex-wrap items-center gap-1 font-semibold text-ink-soft">
                {wellnessLabel(x.key, x.label, x.label_code)}
                {badge && gatedSet.has(x.key) && (
                  <span
                    title={badgeTitle}
                    className="rounded bg-black/[.05] px-1 py-px text-[9.5px] font-bold uppercase tracking-wide text-ink-soft"
                  >
                    {badge}
                  </span>
                )}
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
                  {x.weight_pct ?? Math.round((x.weight ?? 0) * 100)}%
                </span>
              </span>
            </div>
          ))}
          {comps.map((x) => {
            const text = wellnessReason(
              x.detail?.reason_code as string | undefined,
              x.detail?.reason_params as Record<string, unknown> | undefined,
              x.detail,
              x.reason,
            );
            return text ? (
              <p key={`${x.key}-r`} className="text-[12px] leading-snug text-ink-soft">{text}</p>
            ) : null;
          })}
        </div>
      )}

      {/* The score is never shown alone: what the platform could NOT see is named too. */}
      {missing.length > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-black/[.03] px-3 py-2 text-[12px] leading-snug text-ink-soft">
          <EyeOff className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {t("app.field.wellnessCard.missingPre")}
            <b>{missing.map((k) => wellnessLabel(k)).join(", ")}</b>
            {t("app.field.wellnessCard.missingPost")}
          </span>
        </p>
      )}

      <p className="mt-3 text-[12px] leading-snug text-ink-soft">{t("mkt.demo.pulseCaption")}</p>
    </section>
  );
}
