"use client";

// D2.3 — map-first field view. A full-bleed satellite map of the field sits behind the sticky
// header/bottom-nav. On mobile a draggable bottom sheet with 3 snap points (peek/half/full) carries
// the verdict + tabs; on desktop (md+) the SAME element becomes a fixed right sidebar (no drag).
// One element, responsive — so the tab children mount once (no duplicate maps / double fetches).
// Sheet position lives in the URL as ?panel= (shareable + Android back-gesture lowers the sheet,
// because raising the sheet pushes history and lowering replaces it). A camera FAB (D2.6) jumps to
// photo diagnosis. Ships behind ?ui=v2. Drag is plain pointer events + a CSS height transition.
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Camera } from "lucide-react";
import { DisplayMap } from "@/components/FieldMap";
import { api } from "@/lib/api";
import { SENSOR_PARAM } from "@/lib/sensors";
import type { FieldDetail, RasterScenes } from "@/lib/types";

const PEEK = 210; // visible height that still shows the field title + verdict headline
const PANELS = ["peek", "half", "full"] as const;

export default function FieldMapSheet({
  field,
  header,
  tabNav,
  onCamera,
  children,
}: {
  field: FieldDetail;
  header: React.ReactNode;
  tabNav: React.ReactNode;
  onCamera?: () => void;
  children: React.ReactNode;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [rasterUrl, setRasterUrl] = useState<string | null>(null);
  const [vh, setVh] = useState(720);
  const [w, setW] = useState(1024);
  const [height, setHeight] = useState(360);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const isDesktop = w >= 768;
  const snaps = [PEEK, Math.round(vh * 0.52), Math.round(vh * 0.88)];

  // Snap index is URL-driven (?panel=peek|half|full), default half.
  const urlIdx = PANELS.indexOf((sp.get("panel") ?? "") as (typeof PANELS)[number]);
  const snapIdx = urlIdx >= 0 ? urlIdx : 1;

  function setSnap(i: number) {
    if (i === snapIdx) return;
    const next = new URLSearchParams(sp.toString());
    next.set("panel", PANELS[i]);
    // Raising the sheet pushes a history entry so Android back lowers it; lowering just replaces.
    router[i > snapIdx ? "push" : "replace"](`${pathname}?${next.toString()}`, { scroll: false });
  }

  useEffect(() => {
    const set = () => { setVh(window.innerHeight); setW(window.innerWidth); };
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // Latest Sentinel-2 NDVI raster for the background map (falls back to HLS inside the endpoint).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const sc = await api.get<RasterScenes>(
          `/api/fields/${field.id}/scenes?index=NDVI&sensor=${SENSOR_PARAM.S2}`,
        );
        if (active) setRasterUrl(sc?.scenes?.[0]?.tile_url ?? null);
      } catch {
        /* no snapshot yet */
      }
    })();
    return () => { active = false; };
  }, [field.id]);

  // Settle to the current snap height whenever we're not actively dragging (mobile only).
  useEffect(() => {
    if (!dragging) setHeight(snaps[snapIdx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapIdx, vh, dragging]);

  function onDown(e: React.PointerEvent) {
    if (isDesktop) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    startY.current = e.clientY;
    startH.current = height;
  }
  function onMove(e: React.PointerEvent) {
    if (isDesktop || !dragging) return;
    const dy = e.clientY - startY.current;
    const h = Math.min(snaps[2] + 20, Math.max(snaps[0] - 48, startH.current - dy));
    setHeight(h);
  }
  function onUp() {
    if (isDesktop || !dragging) return;
    setDragging(false);
    let best = 0;
    let bd = Infinity;
    snaps.forEach((s, i) => {
      const d = Math.abs(s - height);
      if (d < bd) { bd = d; best = i; }
    });
    setSnap(best);
  }

  return (
    <>
      {/* Full-bleed field map — z-0 behind the sticky header + bottom nav. DisplayMap wraps its map
          div in a height:auto `relative` wrapper, so an explicit viewport height (h-screen) is
          required — `h-full` collapses to ~0 against the auto-height wrapper. */}
      <div className="fixed inset-0 z-0 bg-slate-100">
        <DisplayMap polygon={field.geom} rasterUrl={rasterUrl} heightClass="h-screen" />
      </div>

      {/* Camera FAB (D2.6) — mobile only; hidden when the sheet is fully open. */}
      {!isDesktop && snapIdx !== 2 && (
        <button
          type="button"
          onClick={() => onCamera?.()}
          aria-label="Şəkillə diaqnoz"
          className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg md:hidden"
          style={{ bottom: `calc(${height}px + 84px)` }}
        >
          <Camera className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {/* Sheet (mobile) / right sidebar (desktop) — one responsive element so children mount once. */}
      <section
        className="fixed z-20 mx-auto flex max-w-2xl flex-col overflow-hidden border-[1.5px] border-slate-300 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)]
          inset-x-0 bottom-16 rounded-t-3xl
          md:inset-x-auto md:bottom-0 md:right-0 md:top-16 md:mx-0 md:w-[440px] md:max-w-none md:rounded-none md:border-y-0 md:border-r-0 md:border-l-[1.5px] md:shadow-none"
        style={isDesktop ? undefined : { height, transition: dragging ? "none" : "height .28s cubic-bezier(.32,.72,0,1)" }}
      >
        {/* Grab handle + header — the drag zone on mobile; a plain header on desktop. */}
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="shrink-0 cursor-grab touch-none select-none px-4 pb-1 pt-2 active:cursor-grabbing md:cursor-default md:touch-auto md:pt-4"
        >
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-300 md:hidden" />
          {header}
        </div>

        <div className="shrink-0 px-4 pb-1">{tabNav}</div>

        <div className="flex-1 overflow-y-auto px-4 pb-28 pt-2 md:pb-8">{children}</div>
      </section>
    </>
  );
}
