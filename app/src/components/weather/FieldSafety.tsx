"use client";

// Two things the weather screen can say about a field that a forecast cannot: when frost usually
// arrives here, and when it is safe to spray.
//
// BOTH ARE OUR OWN ENDPOINTS AND BOTH ARE ALLOWED TO BE ABSENT:
//   • GET /api/fields/{id}/frost-dates — regional frost climatology (B18). Free for members; only
//     ?refresh=1 needs a write role, and this component never refreshes. Answers {ok:false} until
//     the archive has been computed for the field's zone.
//   • GET /api/fields/{id}/knowledge → field.spray_window.content.best_window (ai/weather.py
//     compute_spray_window). The rest of the passport is still Pro/Business, but the SPRAY BLOCK
//     is free on every tier since 2026-07-31 — routers/knowledge.py returns it inside the gated
//     response for exactly that reason. So `gated` no longer means "no spray": read the block and
//     let its absence, not the flag, decide whether anything renders.
//
// When neither answers, the component renders NOTHING — it never occupies the panel with a heading
// over an empty box.
//
// Every string here is an EXISTING key. The frost block reuses app.field.weatherHistoryTab.* and
// frostSentence(), the spray block app.field.knowledgePassport.*, because a farmer who has read
// those words on the field page must meet the same words here rather than a second translation of
// the same fact.
import { useEffect, useState } from "react";
import { Snowflake, Wind } from "lucide-react";
import { api } from "@/lib/api";
import { t, tf, tp } from "@/lib/i18n";
import { frostSentence } from "@/lib/wellnessText";

/** The members of GET /api/fields/{id}/frost-dates this compact card reads (routers/knowledge and
 *  ai/frost fill the rest; WeatherHistoryTab renders the full version). */
interface FrostDates {
  ok: boolean;
  last_spring_frost?: { p50_mmdd: string | null };
  first_autumn_frost?: { p50_mmdd: string | null };
  frost_free_days?: { p50: number | null };
  sentence_az?: string;
  sentence_code?: string | null;
  sentence_params?: Record<string, unknown> | null;
}

interface Passport {
  gated?: boolean;
  field?: Record<string, { content?: unknown } | undefined>;
}

/** "04-12" → "12 apr" in the active locale, from the dictionary's own short month list. Same
 *  transform WeatherHistoryTab applies, and the same em-dash for anything unparseable. */
function mmdd(v: string | null | undefined): string {
  if (!v || v.length < 5) return "—";
  const m = Number(v.slice(0, 2));
  const d = Number(v.slice(3, 5));
  if (!m || !d || m < 1 || m > 12) return "—";
  const months = tf("app.date.monthsShort").split(",");
  return `${d} ${(months[m - 1] ?? "").trim()}`;
}

/** "2026-07-28T06:00" → "28-07 06:00" — read out of the string, never through a Date. The backend
 *  stores these hours in the field's own clock (Open-Meteo timezone=auto), so parsing them would
 *  reinterpret them in the viewer's zone and move the spray window. */
function fmtHour(ts?: string): string {
  return ts && ts.length >= 16 ? ts.slice(5, 16).replace("T", " ") : "—";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
      <span className="text-ink-soft">{label}</span>
      <span className="font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}

export default function FieldSafety({ fieldId }: { fieldId: string }) {
  const [frost, setFrost] = useState<FrostDates | null>(null);
  const [spray, setSpray] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    let active = true;
    setFrost(null);
    setSpray(null);
    api
      .get<FrostDates>(`/api/fields/${fieldId}/frost-dates`)
      .then((d) => {
        if (active && d?.ok) setFrost(d);
      })
      .catch(() => {
        /* not computed for this zone yet — the block simply does not appear */
      });
    api
      .get<Passport>(`/api/fields/${fieldId}/knowledge`)
      .then((p) => {
        // NOT `|| p?.gated` — the spray block ships inside the gated payload now (see above).
        if (!active) return;
        const c = p?.field?.spray_window?.content as
          | { best_window?: { start?: string; end?: string } | null }
          | undefined;
        const w = c?.best_window;
        // A window needs BOTH ends to be a window. Half of one would print "06:00 – —".
        if (w && typeof w.start === "string" && typeof w.end === "string") {
          setSpray({ start: w.start, end: w.end });
        }
      })
      .catch(() => {
        /* passport gated or empty */
      });
    return () => {
      active = false;
    };
  }, [fieldId]);

  if (!frost && !spray) return null;

  return (
    <div className="space-y-3">
      {frost && (
        <div className="rounded-xl border-[1.5px] border-line bg-panel px-3 py-2.5">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />
            {t("app.field.weatherHistoryTab.frostDatesHeading")}
          </h3>
          <Row
            label={t("app.field.weatherHistoryTab.lastSpringFrost")}
            value={mmdd(frost.last_spring_frost?.p50_mmdd)}
          />
          <Row
            label={t("app.field.weatherHistoryTab.firstAutumnFrost")}
            value={mmdd(frost.first_autumn_frost?.p50_mmdd)}
          />
          {frost.frost_free_days?.p50 != null && (
            <Row
              label={t("app.field.weatherHistoryTab.frostFreeDays")}
              value={`${frost.frost_free_days.p50} ${tp("app.plural.days", frost.frost_free_days.p50)}`}
            />
          )}
          {/* A zone row cached before the code+params twin existed carries only sentence_az;
              frostSentence falls back to it rather than rendering nothing. */}
          {(frost.sentence_code || frost.sentence_az) && (
            <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">
              {frostSentence(frost.sentence_code, frost.sentence_params, frost.sentence_az)}
            </p>
          )}
          {/* Climate average, not a forecast — the distinction this whole screen is built around. */}
          <p className="mt-1 text-[10.5px] text-ink-soft">
            {t("app.field.weatherHistoryTab.climateAverageNote")}
          </p>
        </div>
      )}

      {spray && (
        <div className="rounded-xl border-[1.5px] border-line bg-panel px-3 py-2.5">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            <Wind className="h-3.5 w-3.5" aria-hidden="true" />
            {t("app.field.knowledgePassport.sprayWindow")}
          </h3>
          <p className="text-[12.5px] text-ink">
            {t("app.field.knowledgePassport.bestWindow")}{" "}
            <span className="font-semibold tabular-nums">
              {fmtHour(spray.start)} – {fmtHour(spray.end)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
