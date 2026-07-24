"use client";

// MOCK-app-listpanel — the 336px field-list column of the approved redesign
// (mockup: .listp / .lph / .search / .lscroll / .fcard / .scoredot). AppShell mounts it between
// the icon rail and the page stage, on wide screens only and only on the routes where a field
// list is contextually useful ("/", "/fields", "/fields/{id}").
//
// Cheap by construction:
//   * TWO requests per org — /api/fields/geo (name + area + data_status in one call) and
//     /api/orgs/{id}/wellness (the STORED 0-100 score per field, never computed on read);
//   * the component stays mounted while the farmer moves between "/", "/fields" and
//     "/fields/{id}", so navigation does not refetch (a 60s staleness check catches a field that
//     was added or deleted meanwhile);
//   * every failure degrades silently — this panel is secondary chrome and must never put an
//     error banner in front of the page the farmer actually opened.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Loader2,
  MapPin,
  OctagonAlert,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Tone } from "@/lib/indexStatus";
import type { Farm, Field, Org } from "@/lib/types";

// Refetch at most once a minute, and only when the route changes (never on a timer).
const STALE_MS = 60_000;

interface Row {
  id: string;
  name: string;
  area_ha: number | null;
  data_status: string | null;
}

// Subset of GET /api/orgs/{id}/wellness we actually paint.
interface ScoreRow {
  field_id: string;
  score: number;
  tone: Tone | null;
  headline: string | null;
  stale?: boolean;
}

// mockup .scoredot fills with var(--green)/var(--amber)/var(--red). White text on those exact
// hues is below 4.5:1, so the dot uses the D1 accessible status trio instead — same three
// colours to the eye, legible in sunlight.
const DOT: Record<Tone, string> = { good: "#15803D", warn: "#B45309", bad: "#B91C1C" };
const DOT_NONE = "#8B8478"; // var(--brand-muted) — mockup's "—" dot

const PILL: Record<Tone, { cls: string; Icon: LucideIcon; word: string }> = {
  good: { cls: "bg-good-tint text-good", Icon: Check, word: "Sağlam" },
  warn: { cls: "bg-warn-tint text-warn", Icon: AlertTriangle, word: "Diqqət" },
  bad: { cls: "bg-bad-tint text-bad", Icon: OctagonAlert, word: "Zəif" },
};

const FALLBACK_LINE: Record<Tone, string> = {
  good: "Vəziyyət sabitdir",
  warn: "Yoxlamaq tövsiyə olunur",
  bad: "Diqqət tələb edir",
};

// Same cut-offs as wellness.py (_GOOD_MIN / _WARN_MIN) — only used if an old row lacks a tone.
function toneOf(s: ScoreRow): Tone {
  if (s.tone === "good" || s.tone === "warn" || s.tone === "bad") return s.tone;
  return s.score >= 70 ? "good" : s.score >= 45 ? "warn" : "bad";
}

// Middleware rewrites the /en /tr /de prefix away but the browser URL — and usePathname() — still
// carries it (same convention as AppRail/BottomNav).
function stripLocale(path: string): string {
  const m = path.match(/^\/(en|tr|de)(\/.*)?$/);
  return m ? m[2] || "/" : path;
}

export function activeFieldId(pathname: string): string | null {
  const m = stripLocale(pathname || "/").match(/^\/fields\/([^/?#]+)/);
  return m ? m[1] : null;
}

function areaLabel(area: number | null): string {
  return typeof area === "number" && Number.isFinite(area) ? `${area.toFixed(1)} ha` : "—";
}

function StatusLine({ row, score }: { row: Row; score?: ScoreRow }) {
  if (score) {
    const tone = toneOf(score);
    const p = PILL[tone];
    const Icon = p.Icon;
    return (
      <>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${p.cls}`}
        >
          <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
          {p.word}
        </span>
        <span className="truncate">{score.headline || FALLBACK_LINE[tone]}</span>
      </>
    );
  }

  const preparing = row.data_status === "queued" || row.data_status === "processing";
  const failed = row.data_status === "failed";
  return (
    <>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-paper-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft">
        {preparing && <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />}
        {preparing ? "Hazırlanır" : failed ? "Alınmadı" : "Analiz yoxdur"}
      </span>
      <span className="truncate">
        {preparing
          ? "Peyk məlumatı gəlir"
          : failed
            ? "Peyk məlumatı alınmadı"
            : "Hələ qiymətləndirilməyib"}
      </span>
    </>
  );
}

export default function FieldListPanel() {
  const { user } = useAuth();
  const pathname = usePathname() || "/";
  const activeId = activeFieldId(pathname);

  const [rows, setRows] = useState<Row[] | null>(null);
  const [orgName, setOrgName] = useState("");
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [q, setQ] = useState("");

  const loadedAt = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const selRef = useRef<HTMLAnchorElement | null>(null);

  // The panel outlives navigation between "/", "/fields" and "/fields/{id}", so an in-flight load
  // must NOT be cancelled when the route changes — cancelling it there would drop the response and
  // then the staleness guard below would refuse to retry for a minute, leaving skeletons on screen.
  // Only unmounting stops it. Declared first so it runs before the loader effect.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    if (loadedAt.current > 0 && now - loadedAt.current < STALE_MS) return;
    loadedAt.current = now;

    (async () => {
      try {
        const orgs = await api.get<Org[]>("/api/orgs");
        if (!alive.current) return;
        if (!orgs || orgs.length === 0) {
          setRows([]);
          return;
        }
        const org = orgs[0];
        setOrgName(org.name || "");

        // One call: name + area + data_status for every field of the org that has geometry.
        let list: Row[] = [];
        try {
          const g = await api.get<{ fields: Row[] }>(`/api/fields/geo?org_id=${org.id}`);
          list = (g?.fields ?? []).map((f) => ({
            id: f.id,
            name: f.name,
            area_ha: typeof f.area_ha === "number" ? f.area_ha : null,
            data_status: f.data_status ?? null,
          }));
        } catch {
          list = [];
        }
        // /geo skips a field whose geometry is null — fan out over the farms so such a field (or
        // an outage on /geo) still appears, exactly like the /fields page builds its list.
        if (list.length === 0) {
          try {
            const farms = await api.get<Farm[]>(`/api/farms?org_id=${org.id}`);
            const lists = await Promise.all(
              (farms ?? []).map((f) =>
                api.get<Field[]>(`/api/fields?farm_id=${f.id}`).catch(() => [] as Field[]),
              ),
            );
            list = lists.flat().map((f) => ({
              id: f.id,
              name: f.name,
              area_ha: typeof f.area_ha === "number" ? f.area_ha : null,
              data_status: null,
            }));
          } catch {
            /* keep the empty list — the panel shows its empty state */
          }
        }
        if (!alive.current) return;
        setRows(list);

        if (list.length > 0) {
          try {
            const w = await api.get<{ fields: ScoreRow[] }>(`/api/orgs/${org.id}/wellness`);
            if (!alive.current) return;
            const map: Record<string, ScoreRow> = {};
            for (const s of w?.fields ?? []) {
              if (s && s.field_id && typeof s.score === "number") map[s.field_id] = s;
            }
            setScores(map);
          } catch {
            /* scores are a garnish — cards render with a neutral dot */
          }
        }
      } catch {
        if (!alive.current) return;
        loadedAt.current = 0; // allow a retry on the next navigation
        setRows((prev) => prev ?? []);
      }
    })();
  }, [user, pathname]);

  // Worst first ("ən pis birinci"): bad → warn → good → not yet scored, original order inside a
  // group. The farmer's attention belongs at the top of a 336px column.
  const ordered = useMemo(() => {
    const rank: Record<Tone, number> = { bad: 0, warn: 1, good: 2 };
    return (rows ?? [])
      .map((r, i) => ({ r, i }))
      .sort((a, b) => {
        const sa = scores[a.r.id];
        const sb = scores[b.r.id];
        const ra = sa ? rank[toneOf(sa)] : 3;
        const rb = sb ? rank[toneOf(sb)] : 3;
        if (ra !== rb) return ra - rb;
        if (sa && sb && sa.score !== sb.score) return sa.score - sb.score;
        return a.i - b.i;
      })
      .map((x) => x.r);
  }, [rows, scores]);

  const term = q.trim().toLocaleLowerCase("az");
  const shown = term
    ? ordered.filter((r) => (r.name || "").toLocaleLowerCase("az").includes(term))
    : ordered;

  // Reveal the open field inside the panel's own scroller — never scrolls the document.
  useEffect(() => {
    const el = selRef.current;
    const box = scrollRef.current;
    if (!el || !box) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = Math.max(0, top - 8);
    else if (bottom > box.scrollTop + box.clientHeight) {
      box.scrollTop = bottom - box.clientHeight + 8;
    }
  }, [activeId, shown.length]);

  const total = rows?.length ?? 0;
  const subtitle =
    rows === null
      ? "Yüklənir…"
      : term
        ? `${shown.length} / ${total} sahə`
        : `${orgName ? `${orgName} · ` : ""}${total} sahə`;

  return (
    // z-30 (like the rail) keeps the panel above page content that paints itself `fixed inset-0`
    // — the map-first field view does exactly that.
    <nav
      aria-label="Sahə siyahısı"
      className="sticky top-[76px] z-30 hidden max-h-[calc(100vh_-_92px)] w-[336px] shrink-0 flex-col overflow-hidden rounded-xl2 border border-line bg-panel shadow-soft xl:flex"
    >
      <div className="px-[18px] pb-2.5 pt-[18px]">
        <h2 className="font-display text-xl font-bold text-ink">Sahələr</h2>
        <p className="mt-[3px] text-[13px] text-ink-soft">{subtitle}</p>
      </div>

      <div className="relative mx-[18px] mb-1.5 mt-2">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          aria-hidden="true"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQ("");
          }}
          placeholder="Sahə axtar…"
          aria-label="Sahə axtar"
          className="h-10 w-full rounded-[10px] border-[1.5px] border-line bg-panel pl-9 pr-3 text-[13.5px] text-ink placeholder:text-ink-soft focus:border-grass"
        />
      </div>

      {/* min-h-0 is load-bearing: without it a flex child keeps its automatic content minimum and
          the list would overflow the panel's max-height instead of scrolling inside it. `relative`
          makes offsetTop of a card relative to THIS box (see the reveal effect above). */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-1.5">
        {rows === null ? (
          <div role="status" aria-label="Yüklənir" className="space-y-2.5 pt-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                aria-hidden="true"
                className="h-[74px] animate-pulse rounded-[14px] bg-paper-2"
              />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="px-2 py-6 text-center">
            <MapPin className="mx-auto h-7 w-7 text-grass" aria-hidden="true" />
            <p className="mt-2 text-[13px] text-ink-soft">Hələ sahəniz yoxdur.</p>
            <Link
              href="/onboarding"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-grass px-3.5 py-2 text-[13px] font-bold text-white hover:bg-grass-deep"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Sahə əlavə et
            </Link>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-ink-soft">Uyğun sahə tapılmadı.</p>
        ) : (
          shown.map((r) => {
            const s = scores[r.id];
            const selected = activeId === r.id;
            return (
              <Link
                key={r.id}
                href={`/fields/${r.id}`}
                ref={selected ? selRef : undefined}
                aria-current={selected ? "page" : undefined}
                className={`mb-[9px] block rounded-[14px] border-[1.5px] p-3 transition-colors motion-reduce:transition-none ${
                  selected
                    ? "border-grass bg-mint-soft"
                    : "border-line hover:border-mint hover:bg-mint-soft"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-[12.5px] font-bold tabular-nums text-white"
                    style={{ background: s ? DOT[toneOf(s)] : DOT_NONE }}
                  >
                    <span className="sr-only">Sağlamlıq balı: </span>
                    {s ? s.score : "—"}
                  </span>
                  <span className="min-w-0 truncate text-[15px] font-semibold text-ink">
                    {r.name}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-ink-soft">
                    {areaLabel(r.area_ha)}
                  </span>
                </div>
                <div className="mt-[7px] flex items-center gap-2 text-[12.5px] text-ink-soft">
                  <StatusLine row={r} score={s} />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </nav>
  );
}
