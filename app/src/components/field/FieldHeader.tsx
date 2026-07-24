"use client";

// MOCK-app-field-header — the approved mockup's field-detail bar (the `.apphead` of the FIELD
// screen):
//
//   [‹]  Xudat fındıq                      [Sahə balı 58]        [actions →]
//        8.2 ha · fındıq · Xudat, Xaçmaz
//
// Everything here degrades. Unknown crop / unknown location simply drop out of the subtitle line
// (no "—", no empty separators), and the score pill is rendered ONLY when the API returns a real
// number: a placeholder score would be worse than no score at all, because the farmer would act
// on it.
//
// The caller (the field page) holds a FieldDetail, which carries id/name/area_ha but NOT the crop
// or the district — those live in field_metadata. So both are optional props AND best-effort
// self-fetched when the caller cannot supply them.
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
import StatusChip from "@/components/StatusChip";
import { cropLabelOf } from "@/lib/insights";
import type { Tone } from "@/lib/indexStatus";
import type { FieldMetadata } from "@/lib/types";

// Only the slice of GET /api/fields/{id}/wellness this bar needs. Every member is optional: an
// older/degraded payload ("available": false with score null) must not throw here.
interface WellnessLite {
  score?: number | null;
  tone?: string | null;
  headline?: string | null;
  computed_on?: string | null;
}

interface Score {
  score: number;
  tone: Tone;
  headline: string | null;
  computedOn: string | null;
}

interface Props {
  fieldId: string;
  name: string;
  /** Hectares from FieldDetail.area_ha. Anything non-finite/<=0 is dropped from the subtitle. */
  areaHa?: number | null;
  /** Raw crop_type value (e.g. "hazelnut"); falls back to field_metadata when omitted. */
  cropType?: string | null;
  /** Ready-made place string; falls back to field_metadata region/economic_region. */
  location?: string | null;
  /** Back control. Defaults to browser-back, then /fields when there is no history to pop. */
  onBack?: () => void;
  /** Right-hand slot of the bar (mockup: the "Redaktə" button). */
  actions?: ReactNode;
  className?: string;
}

// --- tiny module-level request cache -------------------------------------------------------
// Writes happen ONLY inside effects, i.e. only in the browser, so this map can never be shared
// between users on the server. Its job is to stop a remount (tab switch, v1/v2 swap, back/forward)
// from re-asking for the same two read-only resources.
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

function peek<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at > CACHE_MS) return null;
  return (hit.value as T | null) ?? null;
}

function cachedGet<T>(key: string, run: () => Promise<T | null>): Promise<T | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at <= CACHE_MS) return Promise.resolve((hit.value as T | null) ?? null);
  const busy = inflight.get(key);
  if (busy) return busy as unknown as Promise<T | null>;
  const p = run()
    // Both resources are garnish: a 404/403/offline must never break the header.
    .catch(() => null)
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      inflight.delete(key);
      return value;
    });
  inflight.set(key, p);
  return p;
}

// The first wellness read of the day COMPUTES the score (~8 queries server-side) and stores it.
// WellnessCard on the İcmal tab asks for exactly the same resource on mount, so the header waits a
// beat and usually reads the row that request just stored, instead of racing a second computation.
// The pill arriving a second late costs nothing.
const SCORE_DELAY_MS = 1200;

function scoreKey(fieldId: string): string {
  return `wellness:${fieldId}`;
}
function metaKey(fieldId: string): string {
  return `meta:${fieldId}`;
}

// Trust the server's tone; fall back to the same cut-offs as services/app/ai/wellness.py.
function toneOf(raw: unknown, score: number): Tone {
  if (raw === "good" || raw === "warn" || raw === "bad") return raw;
  return score >= 70 ? "good" : score >= 45 ? "warn" : "bad";
}

function areaLabel(areaHa?: number | null): string | null {
  const n = typeof areaHa === "number" ? areaHa : Number(areaHa);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n.toFixed(2)} ha`;
}

// "Xudat, Quba-Xaçmaz" — but never "Xaçmaz, Quba-Xaçmaz".
function locationLabel(region?: string | null, economic?: string | null): string | null {
  const r = (region || "").trim();
  const e = (economic || "").trim();
  if (r && e && !e.toLowerCase().includes(r.toLowerCase())) return `${r}, ${e}`;
  return r || e || null;
}

export default function FieldHeader({
  fieldId,
  name,
  areaHa,
  cropType,
  location,
  onBack,
  actions,
  className = "",
}: Props) {
  const router = useRouter();
  const [score, setScore] = useState<Score | null>(null);
  const [meta, setMeta] = useState<FieldMetadata | null>(null);

  // Caller-supplied crop/location win; we only pay for the metadata read when something is missing.
  const needMeta = !cropType || !location;

  useEffect(() => {
    let alive = true;
    // A warm cache (navigating between fields) paints the pill immediately; a cold one waits.
    const warm = peek<Score>(scoreKey(fieldId));
    setScore(warm);
    if (warm) return () => { alive = false; };
    const timer = setTimeout(() => {
      void cachedGet<Score>(scoreKey(fieldId), async () => {
        const w = await api.get<WellnessLite | null>(`/api/fields/${fieldId}/wellness`);
        const raw = typeof w?.score === "number" ? w.score : null;
        if (raw === null || !Number.isFinite(raw)) return null;
        return {
          score: Math.round(raw),
          tone: toneOf(w?.tone, raw),
          headline: w?.headline ?? null,
          computedOn: w?.computed_on ?? null,
        };
      }).then((v) => {
        if (alive) setScore(v);
      });
    }, SCORE_DELAY_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [fieldId]);

  useEffect(() => {
    if (!needMeta) {
      setMeta(null);
      return;
    }
    let alive = true;
    setMeta(peek<FieldMetadata>(metaKey(fieldId)));
    void cachedGet<FieldMetadata>(metaKey(fieldId), () =>
      // The endpoint answers `null` for a field whose metadata was never filled in.
      api.get<FieldMetadata | null>(`/api/fields/${fieldId}/metadata`),
    ).then((v) => {
      if (alive) setMeta(v);
    });
    return () => {
      alive = false;
    };
  }, [fieldId, needMeta]);

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/fields");
  }

  const crop = (cropType || meta?.crop_type || "").trim();
  const loc = (location || "").trim() || locationLabel(meta?.region, meta?.economic_region);
  const bits = [areaLabel(areaHa), crop ? cropLabelOf(crop) : null, loc].filter(
    (x): x is string => Boolean(x),
  );

  const tip = score
    ? [score.headline, score.computedOn ? `Hesablanma: ${score.computedOn}` : null]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    // Full-bleed on mobile (both hosts — the page container and the v2 sheet — use px-4), inset on
    // desktop so it lines up with the content column.
    <header
      className={`-mx-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-paper/70 px-4 py-3 backdrop-blur md:mx-0 md:px-0 ${className}`}
    >
      <button
        type="button"
        onClick={handleBack}
        aria-label="Geri qayıt"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-panel text-ink-soft transition-colors hover:border-line-2 hover:text-ink"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* No flex-1 here: the mockup keeps the score pill next to the name and pushes only the
          actions to the far right. min-w-0 lets a long name truncate instead of overflowing. */}
      <div className="min-w-0">
        <h1 className="truncate font-display text-[19px] font-bold leading-tight text-ink sm:text-xl">
          {name}
        </h1>
        {bits.length > 0 && (
          <p className="mt-0.5 truncate text-[13px] text-ink-soft">{bits.join(" · ")}</p>
        )}
      </div>

      {score && (
        <span className="shrink-0" title={tip || undefined}>
          <StatusChip tone={score.tone} label={`Sahə balı ${score.score}`} />
        </span>
      )}

      {actions && <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
