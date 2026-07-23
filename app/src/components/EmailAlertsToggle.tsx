"use client";

// #4 — per-user email-alerts switch (lives in "Daha çox"). Critical/warning alerts are emailed to
// opted-in members (dormant until Resend is configured server-side). Default on.
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";

export default function EmailAlertsToggle() {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    api.get<{ enabled: boolean }>("/api/auth/email-alerts")
      .then((r) => setOn(!!r?.enabled))
      .catch(() => setOn(null));
  }, []);

  if (on === null) return null;

  async function toggle() {
    const next = !on;
    setOn(next);
    try {
      await api.post("/api/auth/email-alerts", { enabled: next });
    } catch {
      setOn(!next); // revert on failure
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
      <Mail className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
      <span className="flex-1">
        <span className="block text-base font-medium text-slate-900">{t("emailAlerts.title")}</span>
        <span className="block text-xs text-slate-500">{t("emailAlerts.body")}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
