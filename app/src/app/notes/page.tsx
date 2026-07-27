"use client";

// Qeydlər — the farm-wide scouting log (OneSoil's Notes tab, teardown §3).
//
// The notes themselves have always existed, but only per field: GET /api/scouting required a
// field_id, so there was no way to ask "what did we write down this week". This screen consumes the
// org-scoped read that answers that, and it is a READ MODEL ONLY — a note is written on a field,
// where the offline outbox lives, so there is no add-form here.
//
// One column, at every width. There is no useStageWidth branch and no md:/xl: variant, because a
// row list is one column at 375px and at 2200px; AppShell already hands non-wide routes the bounded
// DOC_STAGE, so the desktop gains a route and nothing that renders today changes. No bottom padding
// either — layout.tsx's <main> already clears the bottom bar with --nav-clear.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t, tf } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { ErrorNote } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { isResolved } from "@/components/field/scouting/pins";
import NoteRow from "@/components/notes/NoteRow";
import NotesFilters from "@/components/notes/NotesFilters";
import { groupByDay } from "@/components/notes/noteDay";
import type { FieldThumb, OrgScoutingNote, OrgScoutingResponse } from "@/components/notes/noteTypes";
import type { Org } from "@/lib/types";

// The endpoint's own ceiling (its max is 200). Sent explicitly so the number printed in the
// "showing the last N" line is the number that was actually asked for, not a guess about a default.
const LIMIT = 100;

export default function NotesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  // null = still loading, [] = loaded and empty. The honest distinction /fields also keeps: one of
  // them is a skeleton, the other is the empty state, and they must never be confused.
  const [items, setItems] = useState<OrgScoutingNote[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, FieldThumb> | null>(null);
  const [error, setError] = useState("");
  /** The endpoint says whether it truncated. Never inferred from `items.length`. */
  const [hasMore, setHasMore] = useState(false);
  const [fieldFilter, setFieldFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await api.get<Org[]>("/api/orgs");
        if (cancelled) return;
        if (list.length === 0) {
          router.replace("/onboarding");
          return;
        }
        setOrgs(list);
        setOrgId(list[0].id);
      } catch (err) {
        if (cancelled) return;
        setError(azError(err));
        setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, router]);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setItems(null);
    setThumbs(null);
    // The banner must describe the CURRENT read, not the worst read of the session. Left uncleared,
    // one failed org load kept an error over every later successful one.
    setError("");
    setHasMore(false);
    // A chip naming a field of the previous org would silently filter the new org's log to nothing.
    setFieldFilter("");
    setCatFilter("");
    (async () => {
      try {
        // Fired together, never one request per field. The thumbs call carries its own catch: a
        // failure there costs the pictures, never the list.
        const [res, th] = await Promise.all([
          api.get<OrgScoutingResponse>(`/api/scouting?org_id=${orgId}&limit=${LIMIT}`),
          api.get<{ thumbs: FieldThumb[] }>(`/api/orgs/${orgId}/thumbs`).catch(() => null),
        ]);
        if (cancelled) return;
        setItems(res.items ?? []);
        setHasMore(res.has_more === true);
        const map: Record<string, FieldThumb> = {};
        for (const item of th?.thumbs ?? []) {
          if (item && item.field_id && item.url) map[item.field_id] = item;
        }
        setThumbs(map);
      } catch (err) {
        if (cancelled) return;
        setError(azError(err));
        setItems([]);
        // Not left at null: null means "the pictures are still coming", and nothing is coming.
        setThumbs({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const all = useMemo(() => items ?? [], [items]);
  const filtered = useMemo(
    () =>
      all.filter(
        (n) => (!fieldFilter || n.field_id === fieldFilter) && (!catFilter || n.category === catFilter),
      ),
    [all, fieldFilter, catFilter],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  if (loading || items === null) return <ListSkeleton count={4} />;

  // Both counts come out of the payload that is already on screen — never a second request, and
  // never a figure this page made up.
  const openCount = all.filter((n) => !isResolved(n)).length;
  const filtering = !!fieldFilter || !!catFilter;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-teal">{t("app.notes.heading")}</h1>
          {/* Suppressed at the ceiling. `all` is capped at LIMIT by the request, so on a farm with
              more notes than that this line would print "Hamısı: 100" directly above the footer that
              says the list was truncated — two numbers contradicting each other on one screen, and
              the confident one wrong. The same condition drives both. */}
          {all.length > 0 && !hasMore && (
            <p className="mt-0.5 text-sm tabular-nums text-ink-soft">
              {tf("app.field.scouting.counts", { open: openCount, total: all.length })}
            </p>
          )}
        </div>
        {/* Only when there is a choice to make — the same control, and the same label, the home
            screen renders. */}
        {orgs.length > 1 && (
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="input max-w-[220px]"
            aria-label={t("today.org")}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <ErrorNote message={error} />

      {all.length === 0 ? (
        error ? (
          // The read failed, so whether this farm has notes is something we did not learn. The
          // ErrorNote above says what happened; printing "no notes yet" underneath it would be
          // asserting a fact we never read.
          null
        ) : (
          // Teardown §4.9, copied exactly: an icon, ONE sentence saying what notes are for, ONE
          // primary button. The button goes to /fields because a note is always written ON a field —
          // that is where the section with the offline-capable add-form lives — and /fields is the
          // one destination that is correct even for a farmer with no fields yet, since that screen
          // carries its own "add a field" empty state. If a global add-note control ever lands on
          // the map home, this href becomes a one-line change.
          <EmptyState
            icon={ClipboardList}
            title={t("app.notes.emptyTitle")}
            body={t("app.notes.emptyBody")}
            action={{ label: t("app.notes.emptyAction"), href: "/fields" }}
          />
        )
      ) : (
        <div className="space-y-3">
          <NotesFilters
            items={all}
            fieldFilter={fieldFilter}
            catFilter={catFilter}
            onFieldChange={setFieldFilter}
            onCatChange={setCatFilter}
          />

          {filtered.length === 0 ? (
            // A different sentence from the empty state above: notes exist, this combination just
            // has none — and the way out is one tap, never a blank screen.
            <div className="rounded-xl2 border border-line bg-panel px-4 py-6 text-center">
              <p className="text-sm text-ink-soft">{t("app.notes.filterEmpty")}</p>
              <button
                type="button"
                className="btn-secondary mt-3"
                onClick={() => {
                  setFieldFilter("");
                  setCatFilter("");
                }}
              >
                {t("app.notes.filterReset")}
              </button>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.key} className="space-y-2">
                {/* The house eyebrow style (grep "uppercase tracking-wide text-ink-soft"). The
                    casing is safe in Azerbaijani because <html lang> is set from the locale, so
                    the browser uppercases i → İ rather than I. */}
                <h2 className="pt-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                  {g.label}
                </h2>
                <ul className="space-y-2">
                  {g.items.map((n) => (
                    <NoteRow
                      key={n.id}
                      note={n}
                      thumb={thumbs?.[n.field_id]}
                      thumbsLoading={thumbs === null}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}

          {/* The ceiling belongs to the request, so say so rather than letting the list end as if
              that were everything there is. Only when the log actually hit it, and not while a
              filter is narrowing the view — the cut happened server-side, before the filter. */}
          {hasMore && !filtering && (
            <p className="pt-1 text-center text-xs text-ink-soft">{tf("app.notes.capped", { n: LIMIT })}</p>
          )}
        </div>
      )}
    </div>
  );
}
