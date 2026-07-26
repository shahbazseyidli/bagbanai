"use client";

// MetadataNudge — the quiet completeness strip under the field-status card.
//
// The AI hedges when the field passport is thin, and the farmer has no way of knowing which missing
// line is the one holding it back. This strip names it: at most TWO open gaps, ranked by impact
// (see ./completeness.ts), each as one sentence — what to add, what it unlocks, how long it takes —
// with the control to fill it RIGHT HERE. No modal, no form, no wall: the strip is dismissible, it
// blocks nothing, and it deletes itself the moment the data exists.
//
// Honesty rule: it never says the score or the diagnosis is wrong. The score is computed from what
// the satellite actually saw and stands on its own; this data makes the ADVICE sharper. The copy
// (app.field.meta.nudge.subtitle) says exactly that.
//
// Region is special (item 3): an existing field usually has a boundary but no district, while the
// creation wizard reverse-geocodes the drawn polygon. So here we run the same GET /api/geo/site
// lookup on the stored centroid and offer the answer as a ONE-TAP accept, with the full district
// list as the fallback — never a text box.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, MapPin, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { t, tf } from "@/lib/i18n";
import { track } from "@/lib/track";
import { AZ_RAYONS } from "@/lib/regions";
import { IRRIGATION_METHOD_OPTIONS, SOIL_TYPE_OPTIONS } from "@/lib/metadataOptions";
import type { FieldDetail, FieldMetadata, GeoSite } from "@/lib/types";
import ClickDate from "../info/ClickDate";
import ChoiceChips from "../info/ChoiceChips";
import CropGrid from "../info/CropGrid";
import { topMetaGaps, type GapKey, type MetaGap } from "./completeness";

// Dismissal is a snooze, not a delete: the data still matters next month, and a farmer who taps ×
// while walking a field should not lose the prompt forever.
const SNOOZE_DAYS = 14;
const snoozeKey = (fieldId: string) => `bagban_meta_nudge_snooze_${fieldId}`;

function snoozed(fieldId: string): boolean {
  try {
    const raw = localStorage.getItem(snoozeKey(fieldId));
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

// PUT /metadata is a full replace, so every save round-trips the whole object. Mirrors the
// normalization in MetadataTab: "" → null, numeric columns → number|null (Pydantic rejects "").
const NUMERIC_KEYS = ["soil_ph", "seeding_density", "elevation_m", "slope_deg", "aspect_deg", "target_yield"];

function toPayload(meta: FieldMetadata | null, patch: Partial<FieldMetadata>): Record<string, unknown> {
  // meta is null when the field has no passport row at all — PUT upserts, so the patch alone (which
  // in that case carries crop_type, the only required column) is a complete create.
  const payload: Record<string, unknown> = { ...(meta ?? {}), ...patch };
  for (const k of Object.keys(payload)) {
    if (payload[k] === "") payload[k] = null;
  }
  for (const k of NUMERIC_KEYS) {
    const v = payload[k];
    if (v === null || v === undefined || v === "") payload[k] = null;
    else {
      const n = Number(v);
      payload[k] = Number.isNaN(n) ? null : n;
    }
  }
  return payload;
}

/** Normalize a free-text geocoder answer ("Quba rayonu, Azərbaycan") to a canonical rayon. */
function toRayon(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Canonical rayon when the geocoder's text contains one, otherwise its own trimmed text.
  const hit = AZ_RAYONS.find((r) => raw.includes(r));
  return hit ?? raw.trim() ?? null;
}

export default function MetadataNudge({ field }: { field: FieldDetail }) {
  const [meta, setMeta] = useState<FieldMetadata | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(true); // stays hidden until the snooze check has run
  const [open, setOpen] = useState<GapKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedKey, setSavedKey] = useState<GapKey | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setHidden(snoozed(field.id));
  }, [field.id]);

  useEffect(() => {
    let active = true;
    api
      .get<FieldMetadata | null>(`/api/fields/${field.id}/metadata`)
      .then((m) => {
        if (active) setMeta(m ?? null);
      })
      .catch(() => {
        /* a nudge must never break the status page — stay silent instead */
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [field.id]);

  const gaps = useMemo(() => topMetaGaps(meta), [meta]);

  // --- region auto-suggest (only fetched when region is the gap we are actually showing) ---------
  const needsRegion = gaps.some((g) => g.key === "region");
  const [suggest, setSuggest] = useState<GeoSite | null>(null);
  const [suggestState, setSuggestState] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    if (!needsRegion || suggestState !== "idle") return;
    const c = field.centroid?.coordinates;
    if (!c) return;
    const [lon, lat] = c;
    setSuggestState("loading");
    let active = true;
    api
      .get<GeoSite>(`/api/geo/site?lat=${lat}&lon=${lon}`)
      .then((s) => {
        if (active) setSuggest(s);
      })
      .catch(() => {
        /* fall back to the district list */
      })
      .finally(() => {
        if (active) setSuggestState("done");
      });
    return () => {
      active = false;
    };
  }, [needsRegion, suggestState, field.centroid]);

  const save = useCallback(
    async (key: GapKey, patch: Partial<FieldMetadata>) => {
      // PUT requires crop_type, so nothing but the crop itself can be saved until it exists. This
      // used to bail out silently instead — and the strip above it refused to render at all, which
      // meant the one field that most needed the passport (no crop, so no thresholds, no phenology,
      // AI reduced to raw index numbers) was the one field that was never asked.
      if (!meta?.crop_type && !patch.crop_type) return;
      setBusy(true);
      setFailed(false);
      try {
        await api.put(`/api/fields/${field.id}/metadata`, toPayload(meta, patch));
        setMeta({ ...(meta ?? ({} as FieldMetadata)), ...patch });
        setOpen(null);
        setSavedKey(key);
        track("meta_gap_filled", { key });
      } catch {
        setFailed(true);
      } finally {
        setBusy(false);
      }
    },
    [field.id, meta],
  );

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(snoozeKey(field.id), String(Date.now() + SNOOZE_DAYS * 864e5));
    } catch {
      /* noop */
    }
    track("meta_nudge_dismissed");
  }

  // Filling the LAST gap would otherwise make the strip vanish with no acknowledgement, so the
  // confirmation outlives the rows by a few seconds and then takes the strip with it.
  useEffect(() => {
    if (!savedKey) return;
    const id = setTimeout(() => setSavedKey(null), 4000);
    return () => clearTimeout(id);
  }, [savedKey]);

  // The strip exists only while there is something to ask for.
  if (hidden || !loaded) return null;
  if (gaps.length === 0 && !savedKey) return null;

  return (
    <div className="mt-3 rounded-xl border-[1.5px] border-dashed border-line bg-panel/80 p-3">
      {gaps.length > 0 && (
        <>
          <div className="flex items-start gap-2">
            <Sparkles className="mt-[3px] h-3.5 w-3.5 shrink-0 text-grass" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-ink">{t("app.field.meta.nudge.title")}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
                {t("app.field.meta.nudge.subtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t("app.field.meta.nudge.dismiss")}
              className="-mr-1 -mt-1 rounded-lg p-1 text-ink-soft hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <ul className="mt-2.5 space-y-1.5">
            {gaps.map((gap) => (
              <li key={gap.key}>
                <GapRow
                  gap={gap}
                  fieldId={field.id}
                  open={open === gap.key}
                  busy={busy}
                  onToggle={() => {
                    setSavedKey(null);
                    setOpen(open === gap.key ? null : gap.key);
                  }}
                >
                  <GapEditor
                    gap={gap}
                    meta={meta}
                    busy={busy}
                    suggest={suggest}
                    suggestState={suggestState}
                    onSave={save}
                  />
                </GapRow>
              </li>
            ))}
          </ul>
        </>
      )}

      {savedKey && (
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-grass-deep">
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> {t("app.field.meta.nudge.saved")}
        </p>
      )}
      {failed && (
        <p className="mt-2 text-[11.5px] font-semibold text-bad">{t("app.field.meta.nudge.saveError")}</p>
      )}
    </div>
  );
}

/** One gap: the sentence + the time cost, expanding into its own control. */
function GapRow({
  gap,
  fieldId,
  open,
  busy,
  onToggle,
  children,
}: {
  gap: MetaGap;
  fieldId: string;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={open ? "rounded-lg bg-paper/70 p-2" : ""}>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-expanded={open}
        className="flex min-h-9 w-full items-center gap-2 rounded-lg px-1 text-left hover:bg-paper disabled:opacity-50"
      >
        <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink">
          {/* tf() (not t()) because the key is chosen at runtime from META_GAPS. */}
          <b className="font-semibold">{tf(gap.actionKey)}</b>
          <span className="text-ink-soft"> — {tf(gap.unlockKey)}</span>
          <span className="whitespace-nowrap text-ink-soft">
            {" "}
            ({tf("app.field.meta.nudge.seconds", { n: gap.seconds })})
          </span>
        </span>
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="mt-2 space-y-2 px-1">
          {children}
          {/* The inline control covers the common case; the full passport is one tap further, opened
              straight at this row (?tab=metadata&focus=<key>). */}
          <Link
            href={`/fields/${fieldId}?tab=metadata&focus=${gap.key}`}
            className="inline-block text-[11.5px] font-semibold text-grass hover:text-grass-deep"
          >
            {t("app.field.meta.nudge.openForm")}
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * The one control that fills this gap — a date grid, a chip list, or the region accept.
 *
 * A pick saves immediately (no Save button: this is a 10-second interaction) and is mirrored in
 * local `draft` state so the chosen chip stays highlighted while the PUT is in flight. There is
 * deliberately no "Digər"/free-text escape here — the vocabularies cover the normal case, and
 * anything unusual belongs in the full passport, which is linked right below.
 */
function GapEditor({
  gap,
  meta,
  busy,
  suggest,
  suggestState,
  onSave,
}: {
  gap: MetaGap;
  /** null when the field has no passport row yet — only the crop editor can run in that state. */
  meta: FieldMetadata | null;
  busy: boolean;
  suggest: GeoSite | null;
  suggestState: "idle" | "loading" | "done";
  onSave: (key: GapKey, patch: Partial<FieldMetadata>) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (gap.key === "crop_type") {
    return (
      <CropGrid
        cycle={meta?.crop_cycle ?? null}
        value={draft}
        onChange={(v) => {
          setDraft(v);
          if (v) onSave("crop_type", { crop_type: v });
        }}
      />
    );
  }

  if (gap.key === "planting_date") {
    return (
      <ClickDate
        mode={meta?.crop_cycle === "perennial" ? "year" : "date"}
        value={draft}
        onChange={(v) => {
          setDraft(v);
          if (v) onSave("planting_date", { planting_date: v });
        }}
      />
    );
  }

  if (gap.key === "irrigation_method") {
    return (
      <ChoiceChips
        options={IRRIGATION_METHOD_OPTIONS}
        value={draft}
        onChange={(v) => {
          setDraft(v);
          if (v) onSave("irrigation_method", { irrigation_method: v });
        }}
      />
    );
  }

  if (gap.key === "soil_type") {
    return (
      <ChoiceChips
        options={SOIL_TYPE_OPTIONS}
        value={draft}
        onChange={(v) => {
          setDraft(v);
          if (v) onSave("soil_type", { soil_type: v });
        }}
      />
    );
  }

  // region — one-tap accept of the geocoded district, list as the fallback.
  const guess = toRayon(suggest?.region);
  return (
    <div className="space-y-2">
      {suggestState === "loading" && (
        <p className="text-[11.5px] text-ink-soft">{t("app.field.meta.region.searching")}</p>
      )}
      {suggestState === "done" && guess && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave("region", {
              region: guess,
              economic_region: meta.economic_region ?? suggest?.economic_region ?? undefined,
            })
          }
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-grass bg-mint-soft px-3 text-[12.5px] font-semibold text-grass-deep disabled:opacity-50"
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {tf("app.field.meta.region.suggest", { region: guess })}
        </button>
      )}
      {suggestState === "done" && !guess && (
        <p className="text-[11.5px] text-ink-soft">{t("app.field.meta.region.none")}</p>
      )}
      <select
        className="input"
        defaultValue=""
        disabled={busy}
        onChange={(e) => e.target.value && onSave("region", { region: e.target.value })}
      >
        <option value="">{guess ? t("app.field.meta.region.other") : t("app.field.meta.region.select")}</option>
        {AZ_RAYONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}
