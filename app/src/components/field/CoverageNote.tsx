"use client";

// "Why hasn't my field updated?" — answered, in one line.
//
// THE PROBLEM. public.scenes records what SUCCEEDED. So a field with no new image for three weeks
// looks exactly like a field the satellite stopped flying over: an absence, with nothing to read
// from it. The farmer's own conclusion, over and over in the research corpus, is that the app is
// broken. The real answer — "it flew over on the 8th, 13th and 18th and every one was cloud" — was
// in the pipeline's stderr and nowhere else. Migration 0060 keeps it (scene_attempts), and this
// renders it.
//
// A PASS IS NOT A PICTURE. `next_pass` says when Sentinel-2 will be overhead. Cloud decides on the
// day whether that produces anything. The wording keeps the two apart — "növbəti keçid" (next
// pass), never "next image" — because promising a picture and not delivering one is a worse
// failure than the silence it replaces.
//
// SILENT WHEN IT HAS NOTHING. A field processed before 0060 shipped has an empty attempts list,
// and a brand-new field has no history to extrapolate a pass from. Both render nothing at all
// rather than an empty state explaining its own emptiness.
import { useEffect, useState } from "react";
import { CloudOff, Satellite } from "lucide-react";
import { api } from "@/lib/api";
import { t, tf, tp } from "@/lib/i18n";

interface AttemptDay {
  date: string;
  outcome: string;
  cloud_pct: number | null;
}

interface Coverage {
  last_scene: string | null;
  next_pass: string | null;
  days_since_last: number | null;
  attempts: AttemptDay[];
  lookback_days: number;
}

function fmt(iso: string): string {
  // MM-DD, the same shape the scene date strip directly above this uses (SatelliteTab renders
  // `s.date.slice(5)`). Deliberately NOT toLocaleDateString: that formats in the BROWSER's locale,
  // while the app's language comes from the URL prefix — so a farmer reading /ru/fields on an
  // Azerbaijani phone would get "31 iyul" inside a Russian sentence. Digits belong to no language
  // and match the control next to them.
  return iso.slice(5);
}

export default function CoverageNote({ fieldId }: { fieldId: string }) {
  const [cov, setCov] = useState<Coverage | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<Coverage>(`/api/fields/${fieldId}/coverage`)
      .then((c) => {
        if (active) setCov(c);
      })
      .catch(() => {
        // Best-effort: this is an explanation, not a feature. A field on a server that predates
        // the endpoint simply shows nothing.
      });
    return () => {
      active = false;
    };
  }, [fieldId]);

  if (!cov) return null;

  // Passes that flew and produced no usable pixels. This is the number that turns an absence into
  // an explanation, so if it is zero there is nothing worth saying beyond the next pass date.
  const missed = cov.attempts.filter((a) => a.outcome !== "written");
  if (!cov.next_pass && missed.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {cov.next_pass && (
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <Satellite className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
            {tf("app.field.coverage.nextPass", { date: fmt(cov.next_pass) })}
          </span>
        )}
        {cov.days_since_last !== null && (
          <span className="text-slate-500">
            {tf("app.field.coverage.sinceLast", {
              n: cov.days_since_last,
              // tp() returns the NOUN FORM only — the numeral is never glued to it, because
              // Azerbaijani keeps the singular after a count while Russian and Polish need three
              // different forms. See the plural rule in i18n.ts.
              unit: tp("app.plural.days", cov.days_since_last),
            })}
          </span>
        )}
      </div>

      {missed.length > 0 && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
          <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {tf("app.field.coverage.missed", {
              n: missed.length,
              unit: tp("app.plural.passes", missed.length),
              dates: missed.slice(0, 4).map((a) => fmt(a.date)).join(", "),
            })}
          </span>
        </p>
      )}

      <p className="mt-1 text-[11px] text-slate-400">{t("app.field.coverage.disclaimer")}</p>
    </div>
  );
}
