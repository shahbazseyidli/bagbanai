"use client";

// D3.5 — PWA install card shown at a VALUE moment (satellite data ready), not as a cold banner on
// first load. Captures the browser's beforeinstallprompt, then surfaces a friendly install card the
// farmer can accept in one tap. Renders nothing when: no install prompt is available (already
// installed / unsupported browser / iOS), the app is already running standalone, or it was dismissed.
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const DISMISS_KEY = "bagban_install_dismissed";

export default function InstallPrompt({ show = true }: { show?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch { /* noop */ }
    function onBIP(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const standalone =
    typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches;
  if (!show || dismissed || !deferred || standalone) return null;

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch { /* user cancelled */ }
    setDeferred(null);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
  }
  function close() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-emerald-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <Download className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">Bağban AI-ı telefona quraşdırın</p>
        <p className="text-xs text-slate-600">Tətbiq kimi açılır — offline işləyir, tarlada daha sürətli.</p>
      </div>
      <button
        onClick={install}
        className="min-h-10 shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
      >
        Quraşdır
      </button>
      <button onClick={close} aria-label="Bağla" className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-slate-600">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
