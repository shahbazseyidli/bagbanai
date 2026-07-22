"use client";

// D5.2 — "Səsləndir": read text aloud with the browser's built-in Web Speech API (zero dependency,
// no server, works offline). High-value accessibility for low-literacy / older farmers who prefer
// listening. Prefers an Azerbaijani voice, falls back to Turkish (near phonetics) → Russian → default.
// Renders nothing when the browser has no speech synthesis.
import { useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";

export default function SpeakButton({
  text,
  label = "Səsləndir",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(ok);
    if (ok) window.speechSynthesis.getVoices(); // warm the async voice list
    return () => {
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    };
  }, []);

  function pickVoice(): SpeechSynthesisVoice | undefined {
    const vs = window.speechSynthesis.getVoices();
    return (
      vs.find((v) => /^az/i.test(v.lang)) ||
      vs.find((v) => /^tr/i.test(v.lang)) ||
      vs.find((v) => /^ru/i.test(v.lang)) ||
      undefined
    );
  }

  function toggle() {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang || "az-AZ";
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    uttRef.current = u;
    setSpeaking(true);
    synth.speak(u);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={speaking ? "Səsləndirməni dayandır" : label}
      aria-pressed={speaking}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-medium text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 ${className}`}
    >
      {speaking ? <Square className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
      {speaking ? "Dayandır" : label}
    </button>
  );
}
