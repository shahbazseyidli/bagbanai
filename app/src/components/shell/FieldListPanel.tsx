"use client";

// MOCK-app-listpanel — the 336px field-list column of the approved redesign
// (mockup: .listp / .lph / .search / .lscroll / .fcard / .scoredot). AppShell mounts it between
// the icon rail and the page stage, on wide screens only and only on the routes where a field
// list is contextually useful ("/", "/fields", "/fields/{id}").
//
// Aligned to OneSoil's "My Fields" form (docs/ONESOIL_UX_SPEC.md): a header with an owner/role
// subline + a collapse chevron, a season selector line (current year + Σ area), a search + sort
// row, the score-dot field cards, and a "Request a free call" SupportCard pinned to the bottom.
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
  ArrowUpDown,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  OctagonAlert,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { formatArea, useAreaUnit, type AreaUnit } from "@/lib/units";
import { wellnessHeadline } from "@/lib/wellnessText";
import { SupportCard } from "@/components/ui/SupportCard";
import FieldSectionMenu from "@/components/shell/FieldSectionMenu";
import type { Tone } from "@/lib/indexStatus";
import type { Farm, Field, Org, Role } from "@/lib/types";

// Refetch at most once a minute, and only when the route changes (never on a timer).
const STALE_MS = 60_000;

// Collapsed preference — persisted so a farmer who wants the map wider keeps it that way across
// navigations and reloads (mirrors the "bagban_" localStorage convention used elsewhere).
const COLLAPSE_KEY = "bagban_fieldlist_collapsed";

type SortKey = "score" | "name";

// Owner/role subline — labels for the org_role enum (mirrors Role in lib/types). Resolved at render
// time (not module load) so the active locale is honoured, like ScoreBadge's toneWord.
function roleLabelOf(role: Role): string {
  switch (role) {
    case "owner":
      return t("app.shell.fieldListPanel.roleOwner");
    case "admin":
      return t("app.shell.fieldListPanel.roleAdmin");
    case "agronomist":
      return t("app.shell.fieldListPanel.roleAgronomist");
    case "worker":
      return t("app.shell.fieldListPanel.roleWorker");
    case "viewer":
      return t("app.shell.fieldListPanel.roleViewer");
  }
}

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
  headline_code?: string | null;
  headline_params?: Record<string, unknown> | null;
  stale?: boolean;
}

// mockup .scoredot fills with var(--green)/var(--amber)/var(--red). White text on those exact
// hues is below 4.5:1, so the dot uses the D1 accessible status trio instead — same three
// colours to the eye, legible in sunlight.
const DOT: Record<Tone, string> = { good: "#15803D", warn: "#B45309", bad: "#B91C1C" };
const DOT_NONE = "#8B8478"; // var(--brand-muted) — mockup's "—" dot

const PILL: Record<Tone, { cls: string; Icon: LucideIcon }> = {
  good: { cls: "bg-good-tint text-good", Icon: Check },
  warn: { cls: "bg-warn-tint text-warn", Icon: AlertTriangle },
  bad: { cls: "bg-bad-tint text-bad", Icon: OctagonAlert },
};

// Status vocabulary resolved at render time so the active locale wins (a module-level t() would
// freeze the default locale at import).
function pillWord(tone: Tone): string {
  return t(
    tone === "good"
      ? "app.shell.fieldListPanel.pillGood"
      : tone === "warn"
        ? "app.shell.fieldListPanel.pillWarn"
        : "app.shell.fieldListPanel.pillBad",
  );
}

function fallbackLine(tone: Tone): string {
  return t(
    tone === "good"
      ? "app.shell.fieldListPanel.fallbackGood"
      : tone === "warn"
        ? "app.shell.fieldListPanel.fallbackWarn"
        : "app.shell.fieldListPanel.fallbackBad",
  );
}

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

// Module-level, so the farmer's unit is threaded in as an argument rather than read from a hook.
function areaLabel(area: number | null, unit: AreaUnit): string {
  return formatArea(area, unit);
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
          {pillWord(tone)}
        </span>
        <span className="truncate">
          {wellnessHeadline(score.headline_code, score.headline_params, score.headline) || fallbackLine(tone)}
        </span>
      </>
    );
  }

  const preparing = row.data_status === "queued" || row.data_status === "processing";
  const failed = row.data_status === "failed";
  return (
    <>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-paper-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft">
        {preparing && <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />}
        {preparing
          ? t("app.shell.fieldListPanel.statusPreparing")
          : failed
            ? t("app.shell.fieldListPanel.statusFailed")
            : t("app.shell.fieldListPanel.statusNoAnalysis")}
      </span>
      <span className="truncate">
        {preparing
          ? t("app.shell.fieldListPanel.subPreparing")
          : failed
            ? t("app.shell.fieldListPanel.subFailed")
            : t("app.shell.fieldListPanel.subNotAssessed")}
      </span>
    </>
  );
}

export default function FieldListPanel() {
  const { user } = useAuth();
  const pathname = usePathname() || "/";
  const activeId = activeFieldId(pathname);
  // P1.2 — the panel renders every area in the farmer's own unit (ha / dönüm / sot).
  const areaUnit = useAreaUnit();

  const [rows, setRows] = useState<Row[] | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgRole, setOrgRole] = useState<Role | null>(null);
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  // Collapse to a thin strip so the map can take the width. Starts expanded (the SSR default) and
  // adopts the stored preference after mount — reading localStorage during render would both crash
  // on the server and risk a hydration mismatch, so we defer it to an effect like InstallPrompt.
  const [collapsed, setCollapsed] = useState(false);
  // E14 — with a field open the panel belongs to that field: the list folds into a single row and
  // the section menu takes the space. `browsing` reopens the full list without leaving the field.
  const [browsing, setBrowsing] = useState(false);
  useEffect(() => { setBrowsing(false); }, [activeId]);

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
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {
      /* private mode / storage disabled — stay expanded */
    }
  }, []);

  function toggleCollapsed(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      /* ignore — collapse still works for this session */
    }
  }

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
        setOrgRole(org.role ?? null);

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

  // Two sort orders (client-side only, no refetch):
  //   * "score" — worst first ("ən pis birinci"): bad → warn → good → not yet scored, original
  //     order inside a group. The farmer's attention belongs at the top of a 336px column.
  //   * "name" — alphabetical (az collation) for a farmer who navigates by field name.
  const sorted = useMemo(() => {
    const base = rows ?? [];
    if (sort === "name") {
      return base
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "az", { numeric: true }));
    }
    const rank: Record<Tone, number> = { bad: 0, warn: 1, good: 2 };
    return base
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
  }, [rows, scores, sort]);

  const term = q.trim().toLocaleLowerCase("az");
  const shown = term
    ? sorted.filter((r) => (r.name || "").toLocaleLowerCase("az").includes(term))
    : sorted;

  // Reveal the open field inside the panel's own scroller — never scrolls the document.
  useEffect(() => {
    if (collapsed) return;
    const el = selRef.current;
    const box = scrollRef.current;
    if (!el || !box) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = Math.max(0, top - 8);
    else if (bottom > box.scrollTop + box.clientHeight) {
      box.scrollTop = bottom - box.clientHeight + 8;
    }
  }, [activeId, shown.length, collapsed]);

  const total = rows?.length ?? 0;
  // E14 — the open field, when the farmer has not asked to browse the list again.
  const focused = !browsing && activeId ? (rows ?? []).find((r) => r.id === activeId) : undefined;
  const focusedScore = focused ? scores[focused.id] : undefined;
  const season = new Date().getFullYear();
  const areaTotal = useMemo(
    () =>
      (rows ?? []).reduce(
        (sum, r) =>
          sum + (typeof r.area_ha === "number" && Number.isFinite(r.area_ha) ? r.area_ha : 0),
        0,
      ),
    [rows],
  );
  const roleLabel = orgRole ? roleLabelOf(orgRole) : "";
  const ownerLine =
    rows === null && !orgName
      ? t("app.shell.fieldListPanel.loading")
      : orgName
        ? roleLabel
          ? `${orgName} · ${roleLabel}`
          : orgName
        : t("app.shell.fieldListPanel.yourFields");

  // Collapsed: a thin strip that only offers to re-open. The panel simply gets narrower, so the
  // AppShell flex row hands the extra width to the map stage — no AppShell change is needed (the
  // xl:-mx full-bleed step only adds room, it can never force a sideways scroll when we shrink).
  if (collapsed) {
    return (
      <nav
        aria-label={t("app.shell.fieldListPanel.panelAria")}
        className="sticky top-[76px] z-30 hidden max-h-[calc(100vh_-_92px)] w-12 shrink-0 flex-col items-center gap-3 rounded-xl2 border border-line bg-panel py-3 shadow-soft xl:flex"
      >
        <button
          type="button"
          onClick={() => toggleCollapsed(false)}
          aria-label={t("app.shell.fieldListPanel.expandPanel")}
          aria-expanded={false}
          title={t("app.shell.fieldListPanel.expandPanel")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-ink-soft hover:bg-mint-soft hover:text-grass focus:border-grass"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex flex-col items-center gap-1 text-ink-soft" aria-hidden="true">
          <MapPin className="h-4 w-4" />
          <span className="text-[12px] font-bold tabular-nums text-ink">{total}</span>
        </div>
      </nav>
    );
  }

  return (
    // z-30 (like the rail) keeps the panel above page content that paints itself `fixed inset-0`
    // — the map-first field view does exactly that.
    <nav
      aria-label={t("app.shell.fieldListPanel.panelAria")}
      className="sticky top-[76px] z-30 hidden max-h-[calc(100vh_-_92px)] w-[336px] shrink-0 flex-col overflow-hidden rounded-xl2 border border-line bg-panel shadow-soft xl:flex"
    >
      <div className="flex items-start justify-between gap-2 px-[18px] pt-[18px]">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold text-ink">
            {t("app.shell.fieldListPanel.heading")}
          </h2>
          <p className="mt-[3px] truncate text-[13px] text-ink-soft" title={ownerLine}>
            {ownerLine}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggleCollapsed(true)}
          aria-label={t("app.shell.fieldListPanel.collapsePanel")}
          aria-expanded={true}
          title={t("app.shell.fieldListPanel.collapsePanel")}
          className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-ink-soft hover:bg-mint-soft hover:text-grass focus:border-grass"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Season selector row — current season + honest Σ area + field count (OneSoil "Season 2026 ·
          N.NN ha", rendered in the farmer's unit). No new API: the total is just the sum of the areas we already loaded. */}
      <div className="mx-[18px] mb-1 mt-2.5 flex items-center gap-2 rounded-[10px] border border-line bg-paper-2 px-3 py-2">
        <Calendar className="h-4 w-4 shrink-0 text-grass" aria-hidden="true" />
        <span className="text-[13px] font-semibold text-ink">
          {t("app.shell.fieldListPanel.seasonLabel")} {season}
        </span>
        <span className="ml-auto shrink-0 text-[12.5px] tabular-nums text-ink-soft">
          {rows === null
            ? "…"
            : `${total} ${t("app.shell.fieldListPanel.fieldsUnit")} · ${formatArea(areaTotal, areaUnit)}`}
        </span>
      </div>

      {/* E14 — field open: one collapsed row for the field, then its section menu. */}
      {focused && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-[18px] mb-1 mt-2 rounded-[14px] border-[1.5px] border-grass bg-mint-soft p-3">
            <div className="flex items-center gap-2">
              <span
                className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-[12.5px] font-bold tabular-nums text-white"
                style={{ background: focusedScore ? DOT[toneOf(focusedScore)] : DOT_NONE }}
              >
                <span className="sr-only">{t("app.shell.fieldListPanel.healthScoreLabel")}</span>
                {focusedScore ? focusedScore.score : "\u2014"}
              </span>
              <span className="min-w-0 truncate text-[15px] font-semibold text-ink">{focused.name}</span>
              <span className="ml-auto shrink-0 text-xs text-ink-soft">{areaLabel(focused.area_ha, areaUnit)}</span>
            </div>
            <button
              onClick={() => setBrowsing(true)}
              className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-[12px] font-semibold text-ink-soft hover:text-grass"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t("app.shell.fieldListPanel.allFields")} ({total})
            </button>
          </div>
          <FieldSectionMenu fieldId={focused.id} />
        </div>
      )}

      {/* Search + Sort row. */}
      <div className={`mx-[18px] mb-1.5 mt-1.5 flex items-center gap-2 ${focused ? "hidden" : ""}`}>
        <div className="relative min-w-0 flex-1">
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
            placeholder={t("app.shell.fieldListPanel.searchPlaceholder")}
            aria-label={t("app.shell.fieldListPanel.searchAria")}
            className="h-10 w-full rounded-[10px] border-[1.5px] border-line bg-panel pl-9 pr-3 text-[13.5px] text-ink placeholder:text-ink-soft focus:border-grass"
          />
        </div>
        <div className="relative shrink-0">
          <ArrowUpDown
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft"
            aria-hidden="true"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label={t("app.shell.fieldListPanel.sortAria")}
            title={t("app.shell.fieldListPanel.sortAria")}
            className="h-10 appearance-none rounded-[10px] border-[1.5px] border-line bg-panel pl-7 pr-2.5 text-[12.5px] font-medium text-ink focus:border-grass"
          >
            <option value="score">{t("app.shell.fieldListPanel.sortScore")}</option>
            <option value="name">{t("app.shell.fieldListPanel.sortName")}</option>
          </select>
        </div>
      </div>

      {/* min-h-0 is load-bearing: without it a flex child keeps its automatic content minimum and
          the list would overflow the panel's max-height instead of scrolling inside it. `relative`
          makes offsetTop of a card relative to THIS box (see the reveal effect above). */}
      <div
        ref={scrollRef}
        className={`relative min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-1.5 ${focused ? "hidden" : ""}`}
      >
        {rows === null ? (
          <div
            role="status"
            aria-label={t("app.shell.fieldListPanel.loadingAria")}
            className="space-y-2.5 pt-1"
          >
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
            <p className="mt-2 text-[13px] text-ink-soft">
              {t("app.shell.fieldListPanel.emptyNoFields")}
            </p>
            <Link
              href="/onboarding"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-grass px-3.5 py-2 text-[13px] font-bold text-white hover:bg-grass-deep"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> {t("app.shell.fieldListPanel.addField")}
            </Link>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-ink-soft">
            {t("app.shell.fieldListPanel.emptyNoMatch")}
          </p>
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
                    <span className="sr-only">{t("app.shell.fieldListPanel.healthScoreLabel")}</span>
                    {s ? s.score : "—"}
                  </span>
                  <span className="min-w-0 truncate text-[15px] font-semibold text-ink">
                    {r.name}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-ink-soft">
                    {areaLabel(r.area_ha, areaUnit)}
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

      {/* Pinned to the bottom (outside the scroller) so it stays reachable — but discreet. A full
          "request a call" card here dominated the always-visible chrome ("gözə soxma"), so this is
          the quiet one-line variant: a muted "Kömək lazımdır?" mailto link, not a card. */}
      <div className="shrink-0 border-t border-line px-3 py-1.5">
        <SupportCard variant="quiet" className="w-full justify-center" />
      </div>
    </nav>
  );
}
