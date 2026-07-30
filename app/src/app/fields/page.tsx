"use client";

// Sahələr — a plain list. The multi-field map that used to be the hero was removed (E15): on this
// screen it answered a question nobody was asking, since every row already carries the field's name,
// area and wellness score, and the field's own page has a map anyway. What is left is what the
// screen is for: see your fields, add one, open one, share one, act on several at once.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, Plus } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t, tf, tp, type I18nKey } from "@/lib/i18n";
import { useFormatArea } from "@/lib/units";
import { wellnessAgeLabel, wellnessHeadline } from "@/lib/wellnessText";
import { useAuth } from "@/lib/auth";
import { ErrorNote } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { SupportCard } from "@/components/ui/SupportCard";
import { ListSkeleton } from "@/components/Skeleton";
import BulkActions from "@/components/BulkActions";
import ShareButton from "@/components/field/ShareButton";
import type { Tone } from "@/lib/indexStatus";
import type { Farm, Field, Org } from "@/lib/types";

// A3 — the 0-100 wellness score as a compact row chip. Read model only: ONE org-wide request
// (/api/orgs/{id}/wellness) returns the latest STORED score per field, so the list never pays for a
// computation. A field with no stored score renders no chip at all — never a placeholder number.
interface FieldScore {
  field_id: string;
  score: number;
  tone: Tone | null;
  headline: string | null;
  headline_code?: string | null;
  headline_params?: Record<string, unknown> | null;
  computed_on: string | null;
  /** age_days > _STALE_DAYS (analytics.py) — the daily sweep genuinely missed this field. */
  stale: boolean;
  /** false when the stored row was not computed today. Optional: an API build older than the flag
   *  omits it, and wellnessAgeLabel treats that silence as "say nothing", not as "stale". */
  today?: boolean;
  age_days?: number | null;
}

const CHIP: Record<Tone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  bad: "border-red-200 bg-red-50 text-red-700",
};

// Trust the server's tone, but derive it from the same cut-offs (wellness.py _GOOD_MIN/_WARN_MIN)
// if an old row ever arrives without one.
function bandOf(s: FieldScore): Tone {
  if (s.tone === "good" || s.tone === "warn" || s.tone === "bad") return s.tone;
  return s.score >= 70 ? "good" : s.score >= 45 ? "warn" : "bad";
}

// The date under a score that was not computed today. VISIBLE, not the title attribute the age used
// to hide in: this row is a phone-first list, and a tooltip on a touch screen discloses nothing.
// This is the chip the production mismatch was seen on — it read 89 while the field's own page read
// 70, because this list serves the last STORED row and only the field page recomputes. The daily
// sweep (deploy/refresh-wellness.sh) is what keeps the two together; the stamp is what makes the gap
// legible on the mornings it does not.
function ScoreChip({ s }: { s: FieldScore }) {
  const band = bandOf(s);
  const age = wellnessAgeLabel(s.today, s.age_days, s.computed_on);
  const tip = [
    wellnessHeadline(s.headline_code, s.headline_params, s.headline),
    s.computed_on ? `${t("app.fieldsList.computedOnLabel")}${s.computed_on}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const chip = (
    <span
      title={tip || undefined}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-sm font-bold tabular-nums ${CHIP[band]} ${
        s.stale ? "opacity-70" : ""
      }`}
    >
      <span className="sr-only">{t("app.fieldsList.srScoreLabel")}</span>
      {s.score}
      <span className="text-[10px] font-normal opacity-70">/100</span>
    </span>
  );
  // A score computed today renders EXACTLY what it did before — the stamp adds a line only when
  // there is something to disclose, so the common row keeps its height.
  if (!age) return chip;
  return (
    <span className="inline-flex shrink-0 flex-col items-end gap-0.5">
      {chip}
      <span className="text-[10px] font-medium leading-none text-slate-500">
        <span className="sr-only">{t("app.wl.age.sr")} </span>
        {age}
      </span>
    </span>
  );
}

// The latest NDVI raster of a field, rendered by TiTiler as one finished PNG (the COGs are clipped
// and masked to the boundary, so the picture IS the field). One org-wide request, like the scores.
interface Thumb {
  field_id: string;
  url: string;
  date: string;
  sensor: string;
}

// Package consumption for the header bar. ha_cap is null unless an admin set one, in which case
// the bar counts fields instead — there is no hectare limit to invent from the tier.
interface Usage {
  tier: string;
  fields_used: number;
  fields_max: number;
  ha_used: number;
  ha_cap: number | null;
}

// Typed as Record<string, I18nKey> and not by tier name: `tier` arrives as a plain string from the
// API, so an unrecognised value must still land on a real key rather than on `undefined`.
const PLAN: Record<string, I18nKey> = {
  free: "app.plan.free",
  pro: "app.plan.pro",
  business: "app.plan.business",
};

function FieldThumb({ thumb, loading }: { thumb?: Thumb; loading: boolean }) {
  const [broken, setBroken] = useState(false);
  // Still fetching: a neutral square keeps the row heights and the text baseline from jumping.
  if (loading)
    return <div className="h-11 w-11 shrink-0 rounded-lg bg-slate-100 sm:h-12 sm:w-12" aria-hidden="true" />;
  // No raster yet (or TiTiler could not render it) → NOTHING. A grey square with an icon would be a
  // picture of data this field does not have.
  if (!thumb?.url || broken) return null;
  return (
    <img
      src={thumb.url}
      // Decorative: the name is right beside it, and a screen reader cannot read a colour ramp.
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      title={tf("app.fieldsList.thumbTitle", { date: thumb.date?.slice(0, 10) ?? "" })}
      onError={() => setBroken(true)}
      // No Tailwind utility for image-rendering; these PNGs are ~30x25px on purpose and must stay
      // crisp squares when the browser upscales them.
      style={{ imageRendering: "pixelated" }}
      className="h-11 w-11 shrink-0 rounded-lg border border-line bg-slate-100 object-contain sm:h-12 sm:w-12"
    />
  );
}

// Informational, not a wall: it says how much of the package is used and turns amber at the limit,
// but it never claims the farmer cannot add a field — that decision belongs to the server gate.
function UsageBar({ u, fmtArea }: { u: Usage; fmtArea: (ha: number | null | undefined) => string }) {
  const byArea = u.ha_cap != null && u.ha_cap > 0;
  const used = byArea ? u.ha_used : u.fields_used;
  const max = byArea ? (u.ha_cap as number) : u.fields_max;
  // business is max_fields 100000 — a "0 / 100000" track is noise, so say "limitsiz" and draw none.
  const unlimited = !byArea && u.fields_max >= 1000;
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const atLimit = !unlimited && used >= max;
  const reading = unlimited
    ? t("app.fieldsList.usage.unlimited")
    : byArea
      ? `${fmtArea(u.ha_used)} / ${fmtArea(u.ha_cap)}`
      : `${u.fields_used} / ${u.fields_max} ${tp("app.plural.fields", u.fields_max)}`;
  return (
    <div className="mt-1.5 w-40 sm:w-48">
      <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
        <span className="text-ink-soft">{t(PLAN[u.tier] ?? "app.plan.free")}</span>
        <span className={`tabular-nums ${atLimit ? "font-bold text-amber-700" : "text-ink-soft"}`}>
          {reading}
        </span>
      </div>
      {!unlimited && (
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label={t("app.fieldsList.usage.aria")}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full ${atLimit ? "bg-amber-500" : "bg-grass"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {atLimit && (
        <Link
          href="/pricing"
          className="mt-1 inline-block text-[11.5px] font-semibold text-amber-700 underline"
        >
          {t("app.fieldsList.usage.full")} · {t("upgrade.viewPlans")}
        </Link>
      )}
    </div>
  );
}

export default function FieldsListPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [fields, setFields] = useState<Field[] | null>(null);
  const [error, setError] = useState("");
  // B14 — multi-select drives the bulk task/operation bar.
  const [orgId, setOrgId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  // A3 — field_id → latest stored wellness score (may stay empty; the chips are optional garnish).
  const [scores, setScores] = useState<Record<string, FieldScore>>({});
  // field_id → latest NDVI raster. `null` means "still loading" and an empty/partial map means
  // "definitively no raster", which is why the failure path also writes an object: the two states
  // render differently (placeholder square vs nothing at all).
  const [thumbs, setThumbs] = useState<Record<string, Thumb> | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  // P1.2 — every area on this screen is rendered in the farmer's own unit (ha / dönüm / sot).
  const fmtArea = useFormatArea();
  // Map hero — the org's field geometries (name + area + data_status + geom in one call). Best-effort:
  // if it fails the list still stands on its own.

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    (async () => {
      try {
        const orgs = await api.get<Org[]>("/api/orgs");
        if (orgs.length === 0) {
          router.replace("/onboarding");
          return;
        }
        setOrgId(orgs[0].id);
        const farms = await api.get<Farm[]>(`/api/farms?org_id=${orgs[0].id}`);
        const lists = await Promise.all(
          farms.map((f) => api.get<Field[]>(`/api/fields?farm_id=${f.id}`).catch(() => [])),
        );
        const flat = lists.flat();
        setFields(flat);
        if (flat.length > 0) {
          // Three org-wide reads fired together (never one request per field), each best-effort:
          // a failure costs a chip, a picture or the bar, never the list itself. Usage is fetched
          // only when the org has fields — the empty state shows the demo link, not a 0/1 bar.
          const [w, th, us] = await Promise.all([
            api.get<{ fields: FieldScore[] }>(`/api/orgs/${orgs[0].id}/wellness`).catch(() => null),
            api.get<{ thumbs: Thumb[] }>(`/api/orgs/${orgs[0].id}/thumbs`).catch(() => null),
            api.get<Usage>(`/api/orgs/${orgs[0].id}/usage`).catch(() => null),
          ]);
          const map: Record<string, FieldScore> = {};
          for (const s of w?.fields ?? []) {
            if (s && s.field_id && typeof s.score === "number") map[s.field_id] = s;
          }
          setScores(map);
          const tmap: Record<string, Thumb> = {};
          for (const item of th?.thumbs ?? []) {
            if (item && item.field_id && item.url) tmap[item.field_id] = item;
          }
          setThumbs(tmap);
          if (us) setUsage(us);
        }
      } catch (err) {
        setError(azError(err));
        setFields([]);
      }
    })();
  }, [loading, user, router]);

  if (loading || fields === null) return <ListSkeleton count={4} />;

  const totalHa = fields.reduce((sum, f) => sum + (f.area_ha ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-teal">{t("app.fieldsList.heading")}</h1>
          {fields.length > 0 && (
            <p className="mt-0.5 text-sm text-ink-soft">
              {fields.length} {tp("app.plural.fields", fields.length)} · {fmtArea(totalHa)}
            </p>
          )}
          {fields.length > 0 && usage && <UsageBar u={usage} fmtArea={fmtArea} />}
        </div>
        <Link href="/onboarding" className="btn-primary">
          <Plus className="h-4 w-4" /> {t("app.fieldsList.addField")}
        </Link>
      </div>
      <ErrorNote message={error} />

      {fields.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={t("app.fieldsList.emptyTitle")}
          body={t("app.fieldsList.emptyBody")}
          action={{ label: t("app.fieldsList.addField"), href: "/onboarding", icon: Plus }}
        >
          {/* Secondary on purpose — a link, not a second primary button, so it never competes with
              "Sahə əlavə et". Seeing a finished field is the cheapest way to understand the product
              before drawing your own. */}
          <div className="mb-4">
            <Link href="/demo" className="text-sm font-bold text-grass underline">
              {t("app.fieldsList.demoLink")}
            </Link>
            <p className="mt-1 text-sm text-slate-600">{t("app.fieldsList.demoHint")}</p>
          </div>
          <SupportCard />
        </EmptyState>
      ) : (
        <div className="max-w-3xl">
          <div className="space-y-3">
            <ul className="space-y-2">
              {fields.map((f) => {
                const s = scores[f.id];
                return (
                  <li key={f.id} className="flex items-center gap-2">
                    <label className="flex h-11 w-11 shrink-0 items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-emerald-600"
                        checked={selected.includes(f.id)}
                        aria-label={`${f.name}${t("app.fieldsList.selectFieldAria")}`}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked ? [...prev, f.id] : prev.filter((x) => x !== f.id),
                          )
                        }
                      />
                    </label>
                    <Link
                      href={`/fields/${f.id}`}
                      className="flex min-h-14 flex-1 items-center justify-between gap-3 rounded-xl2 border border-line bg-white px-4 py-3 transition hover:border-grass hover:shadow-soft"
                    >
                      {/* Inside the card, before the name: the standard avatar-list order
                          (image → title → meta → chip → chevron). It sits after the checkbox so
                          the 44px selection target stays at the row's edge, and tapping the
                          picture opens the field — which is what a picture of a field should do. */}
                      <FieldThumb thumb={thumbs?.[f.id]} loading={thumbs === null} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-ink">{f.name}</p>
                        <p className="text-sm text-ink-soft">
                          {fmtArea(f.area_ha)}
                        </p>
                      </div>
                      {s && <ScoreChip s={s} />}
                      <ChevronLeft
                        className="h-5 w-5 shrink-0 rotate-180 text-slate-400"
                        aria-hidden="true"
                      />
                    </Link>
                    {/* Sibling of the row link, never nested inside it — an <a> may not contain a
                        button. ShareButton fetches nothing until it is opened. */}
                    <div className="shrink-0">
                      <ShareButton fieldId={f.id} compactOnMobile />
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* OneSoil-style "request a free call" support card, pinned under the list. */}
            <SupportCard variant="quiet" />
          </div>
        </div>
      )}

      {orgId && selected.length > 0 && (
        <BulkActions orgId={orgId} fieldIds={selected} onDone={() => setSelected([])} />
      )}
    </div>
  );
}
