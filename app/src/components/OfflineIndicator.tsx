"use client";

// D5.3 — global connectivity chip. Farmers work in fields with patchy signal; make the offline
// state and any unsent scouting notes VISIBLE and reassuring. Shows: a dark "Oflayn" pill when the
// device is offline (with the pending-queue count), an amber "N göndərilməyib" pill when back online
// but the outbox still has items, and a brief green "Sinxronlaşdı" confirmation after a sync.
// Invisible when online with an empty queue. Builds on lib/offlineQueue (T12).
import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Check } from "lucide-react";
import { getQueue } from "@/lib/offlineQueue";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const refreshQ = () => setPending(getQueue().length);
    setOnline(navigator.onLine);
    refreshQ();

    let prevPending = getQueue().length;
    const tick = () => {
      const n = getQueue().length;
      if (prevPending > 0 && n === 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 4000);
      }
      prevPending = n;
      setPending(n);
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("storage", refreshQ);
    const t = setInterval(tick, 4000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("storage", refreshQ);
      clearInterval(t);
    };
  }, []);

  if (online && pending === 0 && !justSynced) return null;

  const cls = !online
    ? "bg-slate-800 text-white ring-slate-700"
    : justSynced
      ? "bg-emerald-600 text-white ring-emerald-500"
      : "bg-amber-50 text-amber-900 ring-amber-200";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center px-4 md:top-16">
      <div className={`pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-md ring-1 ${cls}`} role="status">
        {!online ? (
          <>
            <WifiOff className="h-4 w-4" aria-hidden="true" />
            Oflayn{pending > 0 ? ` · ${pending} qeyd gözləyir` : ""}
          </>
        ) : justSynced ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" /> Sinxronlaşdı
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> {pending} qeyd göndərilməyib
          </>
        )}
      </div>
    </div>
  );
}
