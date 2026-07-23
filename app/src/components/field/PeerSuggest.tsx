"use client";

// Contextual peer suggestion (HYBRID_PLAN E7): near the field's AI analysis, suggest other farmers
// growing the same crop / in the same region so the farmer can consult a peer. Renders nothing when
// there are no peers. Inline AZ copy (T18 extracts later).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

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
    } catch { /* ignore */ }
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
        <b>{peers.length} fermer</b>{crop ? ` (${crop})` : ""} eyni bölgədə oxşar sahə becərir — məsləhətləş.
      </p>
      <button className="btn-primary" onClick={() => talk(peers[0])}>Məsləhətləş</button>
    </div>
  );
}
