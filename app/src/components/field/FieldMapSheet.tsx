"use client";

// D2.3 — map-first field view. A full-bleed satellite map of the field sits behind the sticky
// header/bottom-nav; a draggable bottom sheet with 3 snap points (peek / half / full) carries the
// verdict + tabs on top. This is the competitor pattern (map, then card) for the mobile farmer.
// A camera FAB (D2.6) jumps straight to photo diagnosis. Ships behind ?ui=v2. Drag is done with
// plain pointer events + a CSS height transition (no animation dependency).
import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { DisplayMap } from "@/components/FieldMap";
import { api } from "@/lib/api";
import { SENSOR_PARAM } from "@/lib/sensors";
import type { FieldDetail, RasterScenes } from "@/lib/types";

const PEEK = 210; // visible height that still shows the field title + verdict headline

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
  const [rasterUrl, setRasterUrl] = useState<string | null>(null);
  const [vh, setVh] = useState(720);
  const [snapIdx, setSnapIdx] = useState(1); // start at "half"
  const [height, setHeight] = useState(360);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const snaps = [PEEK, Math.round(vh * 0.52), Math.round(vh * 0.88)];

  useEffect(() => {
    const set = () => setVh(window.innerHeight);
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

  // Settle to the current snap height whenever we're not actively dragging.
  useEffect(() => {
    if (!dragging) setHeight(snaps[snapIdx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapIdx, vh, dragging]);

  function onDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    startY.current = e.clientY;
    startH.current = height;
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dy = e.clientY - startY.current;
    const h = Math.min(snaps[2] + 20, Math.max(snaps[0] - 48, startH.current - dy));
    setHeight(h);
  }
  function onUp() {
    if (!dragging) return;
    setDragging(false);
    let best = 0;
    let bd = Infinity;
    snaps.forEach((s, i) => {
      const d = Math.abs(s - height);
      if (d < bd) { bd = d; best = i; }
    });
    setSnapIdx(best);
  }

  function expandCamera() {
    setSnapIdx(2);
    onCamera?.();
  }

  return (
    <>
      {/* Full-bleed field map — sits at z-0 behind the semi-opaque sticky header and the bottom nav. */}
      <div className="fixed inset-0 z-0 bg-slate-100">
        <DisplayMap polygon={field.geom} rasterUrl={rasterUrl} heightClass="h-full" />
      </div>

      {/* Camera FAB (D2.6) — hidden when the sheet is fully open (it would float at the top). */}
      {snapIdx !== 2 && (
        <button
          type="button"
          onClick={expandCamera}
          aria-label="Şəkillə diaqnoz"
          className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg"
          style={{ bottom: `calc(${height}px + 84px)` }}
        >
          <Camera className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {/* Draggable bottom sheet */}
      <section
        className="fixed inset-x-0 bottom-16 z-20 mx-auto flex max-w-2xl flex-col overflow-hidden rounded-t-3xl border-[1.5px] border-slate-300 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:bottom-0"
        style={{ height, transition: dragging ? "none" : "height .28s cubic-bezier(.32,.72,0,1)" }}
      >
        {/* Grab handle + header (the drag zone) */}
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="shrink-0 cursor-grab touch-none select-none px-4 pb-1 pt-2 active:cursor-grabbing"
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
          <div className="mt-2">{header}</div>
        </div>

        <div className="shrink-0 px-4 pb-1">{tabNav}</div>

        <div className="flex-1 overflow-y-auto px-4 pb-28 pt-2">{children}</div>
      </section>
    </>
  );
}
