"use client";

// A10 — public field card. Rendered for SIGNED-OUT visitors: a farmer sends this link over
// WhatsApp to a buyer, a bank, an agronomist or a neighbour. It calls exactly ONE endpoint,
// /api/public/share/<token>, which is unauthenticated and returns a minimal whitelisted payload.
// Nothing here may import useAuth or any authenticated call — a redirect to /login would break
// the entire point of the feature.
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Leaf, MapPin, Ruler, Satellite, CalendarDays, ArrowRight, Link2Off } from "lucide-react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui";
import { cropLabelOf } from "@/lib/insights";
import type { Polygon } from "@/lib/types";

// MapLibre is heavy — keep it out of the first paint of a link opened on a village 3G phone.
const DisplayMap = dynamic(() => import("@/components/FieldMap").then((m) => m.DisplayMap), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-slate-200" />,
});

type Tone = "good" | "warn" | "bad";

interface ShareCard {
  scope: string;
  field: {
    name: string;
    area_ha: number | null;
    crop_type: string | null;
    geometry: Polygon | null;
    centroid: { type: string; coordinates: [number, number] } | null;
  };
  index: {
    name: string;
    value: number | null;
    date: string | null;
    status: string | null;
    tone: Tone | null;
    text: string | null;
  };
  raster: { tile_url: string | null; date: string | null; colormap: string; rescale: string };
  brand: string;
}

const TONE_UI: Record<Tone, { ring: string; bg: string; text: string; dot: string }> = {
  good: { ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500" },
  warn: { ring: "ring-amber-200", bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500" },
  bad: { ring: "ring-red-200", bg: "bg-red-50", text: "text-red-800", dot: "bg-red-500" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default function PublicSharePage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const [card, setCard] = useState<ShareCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [gone, setGone] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setGone(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const d = await api.get<ShareCard>(`/api/public/share/${encodeURIComponent(token)}`);
      setCard(d);
      setGone(false);
    } catch {
      // Any failure — unknown, revoked or expired token — looks identical by design.
      setCard(null);
      setGone(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <Spinner label="Sahə kartı yüklənir…" />
      </div>
    );
  }

  if (gone || !card) {
    return (
      <div className="mx-auto max-w-xl space-y-5 py-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Link2Off className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Keçid işləmir</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
            Bu paylaşım keçidi mövcud deyil, ləğv edilib və ya vaxtı bitib. Keçidi göndərən şəxsdən
            yenisini istəyin.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white hover:bg-emerald-700"
        >
          Agradex-ə keç <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const tone: Tone = card.index.tone ?? "warn";
  const ui = TONE_UI[tone];
  const cropLabel = card.field.crop_type ? cropLabelOf(card.field.crop_type) : null;

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      {/* Header */}
      <header className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          <Satellite className="h-3.5 w-3.5" aria-hidden="true" /> Peyk ilə sahə kartı
        </p>
        <h1 className="text-2xl font-bold leading-tight text-slate-900">{card.field.name}</h1>
        <div className="flex flex-wrap gap-2">
          {card.field.area_ha != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
              {card.field.area_ha.toFixed(2)} ha
            </span>
          )}
          {cropLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
              <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
              {cropLabel}
            </span>
          )}
          {card.index.date && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {fmtDate(card.index.date)}
            </span>
          )}
        </div>
      </header>

      {/* Verdict */}
      <section className={`rounded-2xl p-4 ring-1 ${ui.bg} ${ui.ring}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span className={`h-2.5 w-2.5 rounded-full ${ui.dot}`} aria-hidden="true" />
              Bitki sağlamlığı (NDVI)
            </p>
            <p className={`mt-1 text-2xl font-bold ${ui.text}`}>
              {card.index.value != null ? card.index.value.toFixed(2) : "—"}
              {card.index.status && (
                <span className="ml-2 align-middle text-base font-semibold">· {card.index.status}</span>
              )}
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-700">
          {card.index.text ?? "Bu sahə üçün hələ peyk ölçüsü yoxdur — yeni səhnə düşəndə görünəcək."}
        </p>
        {card.index.date && (
          <p className="mt-1 text-xs text-slate-500">Ən son peyk səhnəsi: {fmtDate(card.index.date)}</p>
        )}
      </section>

      {/* Map + NDVI overlay */}
      <section className="card space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <MapPin className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Sahənin sərhədi
        </p>
        {card.field.geometry ? (
          <>
            <DisplayMap
              polygon={card.field.geometry}
              rasterUrl={card.raster.tile_url}
              heightClass="h-72"
            />
            {card.raster.tile_url && (
              <div>
                <div
                  className="h-2 w-full rounded-full"
                  style={{ background: "linear-gradient(90deg,#d73027,#fee08b,#1a9850)" }}
                  aria-hidden="true"
                />
                <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-500">
                  <span>Zəif</span>
                  <span>Orta</span>
                  <span>Sağlam</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Rəngli təbəqə {fmtDate(card.raster.date)} tarixli peyk şəklindən hesablanıb.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Sahə sərhədi mövcud deyil.
          </div>
        )}
      </section>

      {/* Branded footer + CTA */}
      <footer className="rounded-2xl border-[1.5px] border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-sm font-bold text-emerald-900">Agradex — peyk ilə əkin monitorinqi</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-emerald-800">
          Öz sahənizin sağlamlığını, nəmliyini və inkişafını pulsuz izləyin.
        </p>
        <Link
          href="/signup"
          className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-bold text-white hover:bg-emerald-700"
        >
          Öz sahəni yoxla <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
        <p className="mt-3 text-[11px] text-emerald-800/70">
          Bu kart yalnız oxunuş üçündür. Məlumat NASA HLS / Sentinel-2 peyk şəkillərindən
          hesablanır və məsləhət xarakteri daşıyır.
        </p>
      </footer>
    </div>
  );
}
