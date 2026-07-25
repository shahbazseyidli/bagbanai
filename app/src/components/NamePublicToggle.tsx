"use client";

// New-B — farmer name visibility. When off, other users see a stable "user_xxxx" alias instead of the
// real name (chat, peer suggestions, community). Farmers only; self-hides for other roles. Default on.
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";

export default function NamePublicToggle() {
  const [state, setState] = useState<{ on: boolean; role: string } | null>(null);

  useEffect(() => {
    api.get<{ enabled: boolean; role: string }>("/api/auth/name-public")
      .then((r) => setState({ on: !!r?.enabled, role: r?.role || "farmer" }))
      .catch(() => setState(null));
  }, []);

  if (!state || state.role !== "farmer") return null;
  const on = state.on;

  async function toggle() {
    const next = !on;
    setState((s) => (s ? { ...s, on: next } : s));
    try {
      await api.post("/api/auth/name-public", { enabled: next });
    } catch {
      setState((s) => (s ? { ...s, on: !next } : s));
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
      <UserRound className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
      <span className="flex-1">
        <span className="block text-base font-medium text-slate-900">{t("namePublic.title")}</span>
        <span className="block text-xs text-slate-500">{t("namePublic.body")}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
