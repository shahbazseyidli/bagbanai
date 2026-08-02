"use client";

// Contextual peer suggestion (HYBRID_PLAN E7): near the field's AI analysis, suggest other farmers
// growing the same crop / in the same region so the farmer can consult a peer. Renders nothing when
// there are no peers.
//
// This strip is the FIELD-scoped teaser; the full, filterable list of everyone the farmer can write
// to lives on the Messages screen (/chat, GET /api/chat/directory) and "see all" goes there. The
// two read different endpoints on purpose: /peers is scoped to THIS field's crop and region, the
// directory to every field the caller has plus their account region.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t, tp } from "@/lib/i18n";
import { cropName } from "@/lib/wellnessText";

interface Peer { user_id: string; name?: string | null; crop?: string | null; region?: string | null; }

const AV = ["#3c6b45", "#c07a1f", "#2f6ca8", "#7a5bd0"];

export default function PeerSuggest({ fieldId }: { fieldId: string }) {
  const router = useRouter();
  const [peers, setPeers] = useState<Peer[]>([]);

  useEffect(() => {
    api.get<Peer[]>(`/api/chat/peers?field_id=${fieldId}`).then(setPeers).catch(() => {});
  }, [fieldId]);

  if (!peers.length) return null;

  async function talk(p: Peer) {
    try {
      const r = await api.post<{ id: string }>("/api/chat/start", { other_user_id: p.user_id, kind: "peer" });
      router.push(`/chat?c=${r.id}`);
    } catch {
      // A closed account answers 404 user_not_found, and swallowing that made the button do
      // NOTHING — the farmer taps and the page just sits there. Land them on the directory
      // instead, where the same kind of person is listed and reachable.
      router.push("/chat?people=1");
    }
  }

  const crop = peers.find((p) => p.crop)?.crop;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-3">
      <div className="flex">
        {peers.slice(0, 3).map((p, i) => (
          <span key={p.user_id} className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white first:ml-0" style={{ background: AV[i % AV.length] }}>
            {(p.name || "?").slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>
      <p className="flex-1 text-sm text-emerald-900">
        <b>{peers.length} {tp("app.plural.farmers", peers.length)}</b>{crop ? ` (${cropName(crop)})` : ""}{t("app.field.peerSuggest.suggestBody")}
      </p>
      <div className="flex shrink-0 flex-col items-stretch gap-1">
        <button className="btn-primary" onClick={() => void talk(peers[0])}>{t("app.field.peerSuggest.consult")}</button>
        {/* The strip shows at most three avatars and starts a thread with ONE of them; this is the
            way to everyone else, including the labs and agronomists /peers never returns. */}
        <Link href="/chat?people=1" className="text-center text-xs font-medium text-emerald-800 underline">
          {t("app.field.peerSuggest.seeAll")}
        </Link>
      </div>
    </div>
  );
}
