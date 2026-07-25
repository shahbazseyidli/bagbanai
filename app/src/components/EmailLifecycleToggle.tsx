"use client";

// E2.4 — per-user opt-in for lifecycle/onboarding/digest email (welcome tips, "your data is ready",
// re-engagement, weekly digest). Transactional email (verification, security) always sends. Default on.
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";

export default function EmailLifecycleToggle() {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    api.get<{ enabled: boolean }>("/api/auth/email-lifecycle")
      .then((r) => setOn(!!r?.enabled))
      .catch(() => setOn(null));
  }, []);

  if (on === null) return null;

  async function toggle() {
    const next = !on;
    setOn(next);
    try {
      await api.post("/api/auth/email-lifecycle", { enabled: next });
    } catch {
      setOn(!next);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={on}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 text-left"
    >
      <MailCheck className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
      <span className="flex-1">
        <span className="block text-base font-medium text-slate-900">{t("emailLifecycle.title")}</span>
        <span className="block text-xs text-slate-500">{t("emailLifecycle.body")}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
