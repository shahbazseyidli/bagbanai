"use client";

// W2 app shell — puts the navigation on the left ("sol tərəfdə menyular") for signed-in users on
// desktop. Deliberately conservative:
//   * mobile (< md) is untouched — BottomNav already covers it, so children render unchanged;
//   * signed-out visitors and the marketing/public routes get NO rail at all;
//   * while auth is still resolving nothing is rendered either, so the rail never flashes.
// It is mounted INSIDE the root layout's centred <main> container, so the rail is a sticky column
// in a flex row (never position:fixed) and can not overlap page content.
//
// MOCK-app-shell-3col — on wide screens the shell becomes the mockup's three columns
// (78px rail · 336px field list · stage). See SHELL_BLEED below for the width bookkeeping.
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useIsAppHost } from "@/lib/host";
import AppRail from "@/components/shell/AppRail";
import FieldListPanel from "@/components/shell/FieldListPanel";
import { stripLocale } from "@/lib/stripLocale";

// Marketing / public surfaces. "/" is intentionally NOT here: signed-out visitors already get the
// bare tree (the landing page), while for a signed-in user "/" is the app home ("Bu gün") — which
// is the rail's own first destination, so the rail must survive navigating to it.
//
// THE LONG-FORM PROSE ROUTES (/guide, /guide/[slug], /how-it-works, /privacy, /terms) ARE NOT HERE,
// AND THAT IS CORRECT — but only because middleware does the job first. With NEXT_PUBLIC_PANEL_HOST
// set (it is, in production), middleware.ts redirects every one of them from app.agradex.com to the
// marketing apex BEFORE any of this renders, and on the apex AppShell early-returns on !appHost. So
// a signed-in farmer never sees a guide page inside the shell, and adding them here would be dead
// code that also — because isPublicPath() gates the RAIL, not just the stage — would look like a
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

// Routes where a list of the farmer's fields is contextually useful: the app home ("Bu gün") and
// an open field. Everywhere else (account, notifications, more, …) the shell stays rail + content.
export function showsFieldList(pathname: string): boolean {
  const p = stripLocale(pathname || "/");
  // NOT the exact "/fields" index — that page already renders the whole list itself (a max-w-3xl
  // column of the same cards), so a second copy of it beside the first is pure duplication. The
  // panel belongs on the home ("/") and on a field's detail ("/fields/{id}"), where a list beside
  // the content is the OneSoil pattern.
  return p === "/" || (p.startsWith("/fields/") && p !== "/fields");
}

// W1 — THE FULL-BLEED SHELL.
//
// AppShell lives inside `<main class="mx-auto max-w-6xl px-4">` → at most 1152px outer / 1120px of
// content. Our chrome is fixed-width (rail 78 + gap 20 + list 336 + gap 20 = 454px), so on a 1440px
// laptop that reading container left the map a ~778px stage with empty gutters on both sides. The
// shell used to escape it in two frozen steps ("xl:-mx-14 2xl:-mx-44" → 1232px, then 1472px); this
// replaces them with ONE fluid bleed that tracks the window.
//
//   margin-inline: calc(50% - 50vw)
//
// Percentage margins resolve against the containing block's inline size, so 50% of main's 1120px
// content box minus half the viewport makes this box exactly 100vw wide wherever it sits inside the
// centred container — no measurement, no JS, no hydration flash.
//
// NEVER rewrite this as `left:50%; width:100vw; transform:translateX(-50%)`. That form of the same
// trick makes the element the containing block for every `position:fixed` DESCENDANT, which would
// silently inset them by the rail instead of letting them cover the window. For the same reason
// nothing in this subtree may ever gain `filter`, `backdrop-filter`, `contain`, `perspective` or
// `will-change` — each creates a containing block too, and no test would notice.
//
// THE EVIDENCE (cited by grep string, never by line number — these live in four files that other
// waves edit, and an earlier version of this list rotted into naming two descendants that were not
// in this subtree at all. Do not let a stale pointer discredit the rule):
//   * the admin modal (grep `fixed inset-0 z-50` in app/admin/page.tsx) — IN this subtree, since
//     /admin is not public, and the one exact `inset-0` match. Under a transform it would cover the
//     stage rather than the window.
//   * the field-page undo bar (grep `fixed inset-x-0 bottom-` in app/fields/[id]/page.tsx) — NOT
//     inset-0, but in this subtree and still broken by a transform: `mx-auto` on a fixed element
//     centres it in its containing block, so it would centre over the stage instead of the window,
//     landing well right of where the farmer expects the undo they just triggered.
//   * NOT descendants, deliberately: FieldMapCard's ?map=full overlay and the layer bottom sheet
//     both createPortal into document.body (grep `createPortal` in field/FieldMapCard.tsx and
//     field/layers/LayerPicker.tsx) — FieldMapCard's own comment says it does that precisely
//     because of this hazard. DemoTour's `fixed inset-0` only mounts on /demo, which is in
//     PUBLIC_PATHS, where this component early-returns before the bleed exists. Portalling is the
//     mitigation, not a counter-example: a new full-window overlay should either portal out or stay
//     clear of a transformed ancestor.
//
// NEVER add `overflow-hidden` here either: it would turn the wrapper into a scroll container and
// break `position: sticky` on AppRail and FieldListPanel, which stick to the VIEWPORT at top-[76px].
// It is also unnecessary — but the reason is a DEPENDENCY ON A FILE THIS MODULE DOES NOT OWN, so
// state it loudly: `100vw` counts the scrollbar while documentElement.clientWidth does not, so this
// box overhangs by S/2 per side (S ≈ 15-17px on Windows/Linux with classic scrollbars, 0 with
// overlay scrollbars). The ONLY thing clipping that overhang is
//
//     app/src/app/globals.css → `html, body { max-width: 100vw; overflow-x: hidden }`
//
// (grep "overflow-x: hidden" in globals.css). Before W1 that rule was belt-and-braces; now the shell
// box is exactly 100vw by construction, so DELETING IT GIVES EVERY CLASSIC-SCROLLBAR DESKTOP A
// PERMANENT HORIZONTAL SCROLLBAR on every app route. Because xl:px-6 gives the track 24px of inner
// padding, only empty padding is ever clipped; the visible gutter lands at 16-24px.
//
// WHY THE xl GATE IS GEOMETRIC, not caution: the container only starts leaving gutters at 1152px.
// Applied at md/lg the margin would be negative, strip main's own 16px padding and push every tablet
// and small laptop against the window edge. Tailwind has no 1152 breakpoint and xl (1280) is the
// first one above it. It is also exactly where FieldListPanel becomes visible (xl:flex), so the
// panel can never appear before the shell has widened to hold it.
//
// AT 1280 NOTHING MOVES: the old -mx-14 gave a 1232px shell with 24px gutters and no inner padding;
// this gives a 1280px shell with 24px of padding → the same 1232px of usable width and the same 24px
// gutter. Above 1280 it grows with the window instead of freezing.
//
// IMPORTED BY components/Nav.tsx — this pair is a two-file contract, not decoration. It was exported
// "so whoever owns Nav.tsx can align the top bar" and then nobody did, which shipped the defect the
// export was meant to prevent: at 1920 the rail started at x≈24 while the logo was still centred in
// a 1152px container at x≈400, on every app route at every width ≥ 1280. Nav now applies both, gated
// on the same conditions this component early-returns on, so the header and the rail share one edge.
//
// The percentage resolves against the PARENT's content box, which is why the same two classes work
// in both places: here the parent is layout.tsx's `<main class="mx-auto max-w-6xl px-4">` (1120px of
// content), in Nav it is the full-width `<header>`. Either way `50% - 50vw` lands the box's left edge
// at -S/2 and makes it exactly 100vw wide. Changing one of these constants changes both surfaces.
export const SHELL_BLEED = "xl:mx-[calc(50%_-_50vw)]";

// The cap exists for EYE TRAVEL, not taste. Our chrome is fixed-width at both ends, so every extra
// pixel of window goes to one object — the stage — until the farmer has to sweep from the field list
// on the far left to FieldWorkbench's 400px status rail on the far right. On a 34" ultrawide that is
// a ~2900px sweep: a head turn, not a glance. 2200 clears the whole real fleet (1440, 1512, 1728,
// 1920, 2048 all fall under it, so for every laptop and 1080p monitor the shell IS the window and
// the cap never fires); it bites only at 2560 and above.
export const SHELL_TRACK = "mx-auto w-full max-w-[2200px] xl:px-6 2xl:px-8";

// Bounded reading column for document routes. 1040 reproduces today's measured stage
// (1120 content − 78 rail − 20 gap = 1022px), so no page keeps a width it did not already have.
// LEFT-aligned, never mx-auto: the rail is the left anchor, and a settings column drifting to the
// middle of a 1920 screen detaches from the navigation and reintroduces exactly the eye travel this
// whole change exists to remove (macOS System Settings, VS Code and Figma all keep content adjacent
// to the sidebar). The empty space on its right is the honest cost and the normal desktop shape.
const DOC_STAGE = "w-full max-w-[1040px]";

// The TRACK is full-bleed on every app route — navigation chrome that slid 100px sideways when you
// opened a field would be a defect — so the per-route decision lives on the STAGE instead.
//
// DEFAULT IS BOUNDED, deliberately. A one-column page cannot be fixed from out here: /more,
// /account and /notifications are row lists, and stretching a row list to 1800px produces the
// 2400px-wide-card failure in files this module does not own. Only surfaces whose primary object is
// a map or a dense table are listed.
//
// "/" IS ON THE LIST, and the sentence that used to sit here — "'/' joins this list the day
// TodayHome grows a real multi-column desktop layout" — was already out of date when it was
// written. TodayHome MEASURES its stage (useStageWidth) and above 760px renders TodayInstrument: a
// map-primary two-column instrument row whose column template steps at 1000 and 1280. Bounded at
// 1040 that top tier was structurally unreachable — the stage could never exceed 1040, so a
// `stageW >= 1280` branch existed that no window size could ever select — and at 1920 the
// instrument got 1040px inside a ~1400px stage, leaving ~360px of dead gutter on the exact screen
// this wave existed to fill. TodayHome caps its own stacked/card branches; the map row wants the
// window.
//
// NOT ADDED, after reading them: /onboarding and /farms/{id}/fields/new. Both render
// FieldOnboarding → DrawMap and both wrap it in `mx-auto max-w-2xl` of their own, so a wider stage
// buys the map ZERO extra pixels — `mx-auto` just re-centres the same 672px column in a bigger box
// and drifts the wizard ~130px further from the rail at 1920. Widening them means first lifting the
// max-w-2xl in those two page files; until then this would be a regression, not a fix.
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

  // Hooks above, branching below — never the other way round.
  // `!appHost` keeps app chrome off the apex marketing host (agradex.com): there "/" renders the
  // landing (page.tsx), so the rail must not wrap it. Only app.agradex.com gets the rail.
  //
  // This early return is also what makes the bleed below provably safe: everything past it is the
  // app host, signed in, on a non-public route. The marketing surface keeps its measured reading
  // width with no new flag and no new condition.
  if (loading || !user || !appHost || isPublicPath(pathname)) return <>{children}</>;

  const withList = showsFieldList(pathname);
  const wide = isWideStage(pathname);

  return (
    <div className={SHELL_BLEED}>
      <div className={SHELL_TRACK}>
        <div className="md:flex md:items-start md:gap-5">
          <AppRail />
          {withList && <FieldListPanel />}
          {/* min-w-0 is load-bearing: without it a wide table or map child keeps its automatic
              content minimum and forces the whole flex row past the window edge.

              MEASUREMENT: both stage-measuring pages (fields/[id] via FieldWorkbench, and "/" via
              TodayHome) put their stageRef on their own root, so what they read is the width they
              were GIVEN — this element's inner width on a wide route, DOC_STAGE's 1040 on a bounded
              one. Both of those routes are wide, so neither is measuring through the wrapper today.
              If a bounded route ever starts measuring, it will correctly read 1040 and pick its
              narrow branch; what it must never do is measure the window and then be handed 1040 —
              that mismatch is exactly the bug that boxed the home page. */}
          <div className="min-w-0 md:flex-1">
            {wide ? children : <div className={DOC_STAGE}>{children}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
