"use client";

// The phone feed's spraying block — teardown §4.3, the pattern worth stealing wholesale: OneSoil
// shows the LIVE wind arrows, rain bars and traffic light and only then offers "Unlock". You see
// the value before you are asked for the price. Ours is not gated at all, which is the point.
//
// It composes two things that already exist rather than adding a third read model:
//   * <RainNowcast/>  — GET /api/fields/{id}/rain-nowcast (A4). Its own component, its own fetch,
//     and it returns null whenever Open-Meteo is unreachable or the block is empty. It MOVED here
//     from the top of the status section: its verdict is literally "hold off on spraying", so it
//     belongs under the spraying heading and not above the score ring.
//   * best window + weather alerts — GET /api/fields/{id}/knowledge, `field.spray_window` block,
//     written by the weather worker (services/app/ai/weather.py). Exactly the slice
//     KnowledgePassport renders on the analysis side; parsed the same way, including the
//     code+params prose contract (weatherAlert), so the two can never word an alert differently.
//
// The "not yet" line is about the WINDOW only. A rain strip above it and "the spraying window will
// appear once the weather data is ready" below it is not a contradiction: the nowcast is two hours
// of rain, the window is a modelled slot, and the second one really has not been computed yet.
import { useEffect, useState } from "react";
import { AlertTriangle, Wind } from "lucide-react";
import { api } from "@/lib/api";
import { Placeholder } from "@/components/ui";
import { t } from "@/lib/i18n";
import { weatherAlert } from "@/lib/wellnessText";
import RainNowcast from "@/components/field/RainNowcast";

interface Alert {
  type: string;
  severity: string;
  detail: string;
  detail_code?: string | null;
  detail_params?: Record<string, unknown> | null;
}

interface SprayContent {
  best_window?: { start: string; end: string } | null;
  alerts?: Alert[];
}

interface Block {
  content?: unknown;
}

interface Passport {
  field?: Record<string, Block | undefined> | null;
  /**
   * The Knowledge Passport is a Pro/Business feature. On the free tier
   * (routers/knowledge.py returns `{"field": {}, "gated": True}`) there is no spray block, and
   * since billing is deferred and every new org defaults to free, that is EVERY org in production
   * today. Without reading this flag the card cannot tell "research has not produced a window yet"
   * from "this tier is not allowed one" — and it printed the first explanation for the second
   * cause, telling every farmer the window would appear "once weather data is ready" when the
   * weather was never the obstacle.
   */
  gated?: boolean;
}

/** "07-14 05:30" out of an ISO timestamp — the same slice KnowledgePassport prints. */
function fmtHour(ts?: string): string {
  return ts && ts.length >= 16 ? ts.slice(5, 16).replace("T", " ") : ts ?? "";
}

export default function SprayWindowCard({ fieldId }: { fieldId: string }) {
  const [spray, setSpray] = useState<SprayContent | null>(null);
  const [gated, setGated] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setSpray(null);
    setGated(false);
    setLoaded(false);
    api
      .get<Passport>(`/api/fields/${fieldId}/knowledge`)
      .then((p) => {
        if (!active) return;
        const raw = p?.field?.spray_window?.content;
        // A passport with no spray block is the normal state of a young field, not an error.
        setSpray(raw && typeof raw === "object" ? (raw as SprayContent) : null);
        setGated(p?.gated === true);
      })
      .catch(() => {
        // Same rule as the passport itself: research that has not run is silence, never a banner.
        if (active) setSpray(null);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [fieldId]);

  const alerts = spray?.alerts ?? [];
  const best = spray?.best_window ?? null;

  return (
    <div className="space-y-2">
      {/* Self-hiding strip: renders nothing at all when there is no nowcast to show. */}
      <RainNowcast fieldId={fieldId} />

      {alerts.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            {t("app.field.spray.alertsTitle")}
          </p>
          {alerts.map((a, i) => (
            <div
              key={`${a.type}-${i}`}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] ${
                a.severity === "critical"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-amber-300 bg-amber-50 text-amber-800"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{weatherAlert(a.detail_code, a.detail_params, a.detail)}</span>
            </div>
          ))}
        </div>
      )}

      {best && (
        <div className="rounded-xl border border-line bg-panel px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
            <Wind className="h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
            {t("app.field.knowledgePassport.sprayWindow")}
          </p>
          <p className="mt-1 text-[13px] tabular-nums text-ink-soft">
            {t("app.field.knowledgePassport.bestWindow")} {fmtHour(best.start)} – {fmtHour(best.end)}
          </p>
        </div>
      )}

      {/* Only once the read has actually SETTLED and only when the tier was actually allowed to
          answer. Two separate guards for two separate lies:
            * !loaded — a placeholder shown mid-flight claims "not computed" about something we have
              not asked about yet;
            * !gated — on the free tier the passport is withheld, so this sentence would blame the
              weather for a billing rule. Silence is the honest output; the rain strip above is our
              own ungated endpoint and still renders. */}
      {loaded && !gated && !best && alerts.length === 0 && (
        <Placeholder>{t("app.field.spray.empty")}</Placeholder>
      )}
    </div>
  );
}
