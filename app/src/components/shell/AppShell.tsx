"use client";

// The app shell — a full-height left sidebar plus the page stage, for signed-in users on desktop.
// Deliberately conservative:
//   * mobile (< md) is untouched — BottomNav already covers it, so children render unchanged and no
//     padding, inset or bleed of any kind is introduced below md;
//   * signed-out visitors and the marketing/public routes get NO shell at all;
//   * while auth is still resolving nothing is rendered either, so the sidebar never flashes.
//
// The SIDEBAR itself is `position: fixed` (see components/shell/AppRail.tsx for why that is both
// necessary and safe from inside layout.tsx's <main>). This file's job is the other half: keeping
// the content clear of it, at the same offset the top bar uses.
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useIsAppHost } from "@/lib/host";
import AppRail, { useSidebarCollapsed } from "@/components/shell/AppRail";
import FieldListPanel from "@/components/shell/FieldListPanel";
import { stripLocale } from "@/lib/stripLocale";

// Marketing / public surfaces. "/" is intentionally NOT here: signed-out visitors already get the
// bare tree (the landing page), while for a signed-in user "/" is the app home ("Bu gün") — which
// is the sidebar's own first destination, so the shell must survive navigating to it.
//
// THE LONG-FORM PROSE ROUTES (/guide, /guide/[slug], /how-it-works, /privacy, /terms) ARE NOT HERE,
// AND THAT IS CORRECT — but only because middleware does the job first. With NEXT_PUBLIC_PANEL_HOST
// set (it is, in production), middleware.ts redirects every one of them from app.agradex.com to the
// marketing apex BEFORE any of this renders, and on the apex AppShell early-returns on !appHost. So
// a signed-in farmer never sees a guide page inside the shell, and adding them here would be dead
// code that also — because isPublicPath() gates the SIDEBAR, not just the stage — would look like a
// deliberate decision to strip navigation from them.
//
// The one shape where they DO land in the shell is local dev with PANEL_HOST empty: there every
// host is the app host, the redirect block is skipped, and /guide renders left-aligned in the 1040
// DOC_STAGE instead of the apex's centred reading container. That is a dev-only difference on
// pages nobody edits for layout, so it is documented rather than papered over. If the split is ever
// removed, this paragraph is the thing to revisit.
const PUBLIC_PATHS = ["/login", "/signup", "/pricing", "/solutions", "/s", "/invite", "/demo"];

export function isPublicPath(pathname: string): boolean {
  const p = stripLocale(pathname || "/");
  return PUBLIC_PATHS.some((base) => p === base || p.startsWith(`${base}/`));
}

// The slim FIELD CONTEXT column (FieldListPanel) — an open field, and nothing else.
//
// It used to also render on "/", where it was a browsable copy of the field list. It no longer is:
// the home page is now the dashboard, with its own field selector above its own map, and a third
// column beside it is neither the reference shape nor worth 244px of the stage. On "/fields" it was
// already excluded — that page IS the list.
export function showsFieldPanel(pathname: string): boolean {
  const p = stripLocale(pathname || "/");
  return p.startsWith("/fields/") && p !== "/fields";
}

// ── THE FULL-BLEED SHELL ────────────────────────────────────────────────────────────────────────
//
// AppShell lives inside `<main class="mx-auto max-w-6xl px-4">` → at most 1152px outer / 1120px of
// content, with empty gutters on a wide screen. It escapes with ONE fluid bleed that tracks the
// window:
//
//   margin-inline: calc(50% - 50vw)
//
// Percentage margins resolve against the containing block's inline size, so 50% of main's content
// box minus half the viewport makes this box exactly 100vw wide wherever it sits inside the centred
// container — no measurement, no JS, no hydration flash.
//
// NEVER rewrite this as `left:50%; width:100vw; transform:translateX(-50%)`. That form of the same
// trick makes the element the containing block for every `position:fixed` DESCENDANT — which now
// includes THE SIDEBAR ITSELF, so the failure would be immediate and total rather than subtle. For
// the same reason nothing in this subtree may ever gain `filter`, `backdrop-filter`, `contain`,
// `perspective` or `will-change`.
//
// THE EVIDENCE (cited by grep string, never by line number — these live in files other waves edit):
//   * AppRail's own `fixed inset-y-0 left-0 z-40` — the sidebar. Under a transformed ancestor it
//     would inset itself into the content column and cover the page instead of flanking it.
//   * the admin modal (grep `fixed inset-0 z-50` in app/admin/page.tsx) — IN this subtree, since
//     /admin is not public. Under a transform it would cover the stage rather than the window.
//   * the field-page undo bar (grep `fixed inset-x-0 bottom-` in app/fields/[id]/page.tsx) — NOT
//     inset-0, but in this subtree and still broken by a transform: `mx-auto` on a fixed element
//     centres it in its containing block.
//   * NOT descendants, deliberately: FieldMapCard's ?map=full overlay and the layer bottom sheet
//     both createPortal into document.body (grep `createPortal` in field/FieldMapCard.tsx and
//     field/layers/LayerPicker.tsx). DemoTour's `fixed inset-0` only mounts on /demo, which is in
//     PUBLIC_PATHS, where this component early-returns before the bleed exists.
//
// NEVER add `overflow-hidden` here either: it would turn the wrapper into a scroll container and
// break `position: sticky` on FieldListPanel, which sticks to the VIEWPORT. It is also unnecessary
// — but the reason is a DEPENDENCY ON A FILE THIS MODULE DOES NOT OWN, so state it loudly: `100vw`
// counts the scrollbar while documentElement.clientWidth does not, so this box overhangs by S/2 per
// side (S ≈ 15-17px with classic scrollbars, 0 with overlay scrollbars). The ONLY thing clipping
// that overhang is
//
//     app/src/app/globals.css → `html, body { max-width: 100vw; overflow-x: hidden }`
//
// (grep "overflow-x: hidden" in globals.css). DELETING IT GIVES EVERY CLASSIC-SCROLLBAR DESKTOP A
// PERMANENT HORIZONTAL SCROLLBAR on every app route. Because the track carries its own inner
// padding from md up, only empty padding is ever clipped.
//
// WHY THE GATE MOVED FROM xl TO md. It used to be xl because the bleed was only ever a way to
// escape main's 1152px cap, which does not bind below that; the objection to a md gate was that it
// "strips main's own 16px padding and pushes every tablet against the window edge". That objection
// is answered rather than ignored: SHELL_TRACK now carries `md:px-5`, so the content keeps a gutter
// — and the gate has to be md now, because the sidebar is flush to the window edge from md up and
// content that stopped at main's 1152px box would leave a visible seam beside it. Below md nothing
// changes: no bleed, no track padding, no inset.
//
// IMPORTED BY components/Nav.tsx — this pair is a two-file contract, not decoration. Nav applies
// both plus the same sidebar inset, gated on the same conditions this component early-returns on,
// so the header and the sidebar share one edge. The percentage resolves against the PARENT's
// content box, which is why the same classes work in both places: here the parent is main, in Nav
// the full-width <header>. Either way `50% - 50vw` lands the box's left edge at -S/2 and makes it
// exactly 100vw. Changing one of these constants changes both surfaces.
export const SHELL_BLEED = "md:mx-[calc(50%_-_50vw)]";

// The cap exists for EYE TRAVEL, not taste. Our chrome is fixed-width at both ends, so every extra
// pixel of window goes to one object — the stage — until the farmer has to sweep from the sidebar on
// the far left to FieldWorkbench's status rail on the far right. On a 34" ultrawide that is a head
// turn, not a glance. 2200 clears the whole real fleet (1440, 1512, 1728, 1920, 2048 all fall under
// it, so for every laptop and 1080p monitor the shell IS the window and the cap never fires); it
// bites only at 2560 and above, where `mx-auto` then centres the track in the space left BESIDE the
// sidebar — which is why the inset lives on the outer box and not on this one.
export const SHELL_TRACK = "mx-auto w-full max-w-[2200px] md:px-5 2xl:px-6";

// THE SIDEBAR INSET — the one number three files have to agree on. AppRail draws `w-[72px] 2xl:w-64`
// (or `w-[72px]` collapsed); these two literals are the exact complements, and the 2xl step must
// stay 2xl in BOTH files: FieldListPanel arrives at xl, and paying for a wider sidebar on the same
// breakpoint drove the field stage to 740px and cost the workbench the 1280–1299 band. The reasoning
// is written out in full beside SIDEBAR_EXPANDED in AppRail.
//
// Applied to the BLEED box rather than the track so that above 2456px the track still centres in the
// room left over, instead of fighting the sidebar for it.
//
// WHOLE class literals — Tailwind's scanner cannot see a padding built at runtime.
export const SIDEBAR_INSET_OPEN = "md:pl-[72px] 2xl:pl-64";
export const SIDEBAR_INSET_COLLAPSED = "md:pl-[72px]";

// Bounded reading column for document routes. LEFT-aligned, never mx-auto: the sidebar is the left
// anchor, and a settings column drifting to the middle of a 1920 screen detaches from the navigation
// and reintroduces exactly the eye travel this whole structure exists to remove (macOS System
// Settings, VS Code and Figma all keep content adjacent to the sidebar). The empty space on its
// right is the honest cost and the normal desktop shape.
const DOC_STAGE = "w-full max-w-[1040px]";

// The TRACK is full-bleed on every app route — navigation chrome that slid 100px sideways when you
// opened a field would be a defect — so the per-route decision lives on the STAGE instead.
//
// DEFAULT IS BOUNDED, deliberately. A one-column page cannot be fixed from out here: /more,
// /account and /notifications are row lists, and stretching a row list to 1800px produces the
// 2400px-wide-card failure in files this module does not own. Only surfaces whose primary object is
// a map or a dense table are listed.
//
// "/" IS ON THE LIST: TodayHome MEASURES its stage (grep `useStageWidth` in
// components/home/TodayHome.tsx) and switches to a map-primary instrument layout above 760px, with
// column steps at 1000 and 1280. Bounded at 1040 the top tier was structurally unreachable. It caps
// its own stacked/card branches from the inside; the map row wants the window.
//
// NOT ADDED, after reading them: /onboarding and /farms/{id}/fields/new. Both render
// FieldOnboarding → DrawMap and both wrap it in `mx-auto max-w-2xl` of their own, so a wider stage
// buys the map ZERO extra pixels — `mx-auto` just re-centres the same 672px column in a bigger box.
// Widening them means first lifting the max-w-2xl in those two page files.
//
// "/fields" stays bounded and it is a no-op either way: that page self-caps its list at max-w-3xl.
// The `startsWith("/fields/")` arm already covers every field detail route.
export function isWideStage(pathname: string): boolean {
  const p = stripLocale(pathname || "/");
  return p === "/" || p === "/admin" || (p.startsWith("/fields/") && p !== "/fields");
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const appHost = useIsAppHost();
  const pathname = usePathname() || "/";
  const collapsed = useSidebarCollapsed();

  // Hooks above, branching below — never the other way round.
  // `!appHost` keeps app chrome off the apex marketing host (agradex.com): there "/" renders the
  // landing (page.tsx), so the shell must not wrap it. Only app.agradex.com gets the sidebar.
  //
  // This early return is also what makes the bleed below provably safe: everything past it is the
  // app host, signed in, on a non-public route. The marketing surface keeps its measured reading
  // width with no new flag and no new condition.
  if (loading || !user || !appHost || isPublicPath(pathname)) return <>{children}</>;

  const withPanel = showsFieldPanel(pathname);
  const wide = isWideStage(pathname);
  const inset = collapsed ? SIDEBAR_INSET_COLLAPSED : SIDEBAR_INSET_OPEN;

  return (
    <div className={`${SHELL_BLEED} ${inset}`}>
      {/* Outside the track on purpose: the sidebar is position:fixed, so it takes no space in any
          row and putting it in one only invites a reader to think it does. The inset above is what
          actually reserves its column. */}
      <AppRail />
      <div className={SHELL_TRACK}>
        {/* The row exists only for the xl field-context column; everywhere else it is one child, so
            the flex context starts at xl rather than md. */}
        <div className="xl:flex xl:items-start xl:gap-5">
          {withPanel && <FieldListPanel />}
          {/* min-w-0 is load-bearing: without it a wide table or map child keeps its automatic
              content minimum and forces the whole flex row past the window edge.

              MEASUREMENT: both stage-measuring pages (fields/[id] via FieldWorkbench, and "/" via
              TodayHome) put their stageRef on their own root, so what they read is the width they
              were GIVEN — this element's inner width on a wide route, DOC_STAGE's 1040 on a bounded
              one. Both of those routes are wide, so neither is measuring through the wrapper today.
              If a bounded route ever starts measuring, it will correctly read 1040 and pick its
              narrow branch; what it must never do is measure the window and then be handed 1040 —
              that mismatch is exactly the bug that boxed the home page. */}
          <div className="min-w-0 xl:flex-1">
            {wide ? children : <div className={DOC_STAGE}>{children}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
