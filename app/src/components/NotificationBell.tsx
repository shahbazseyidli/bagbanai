"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";

interface Notif {
  id: string;
  field_id: string | null;
  type: string;
  severity: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

const SEV_DOT: Record<string, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-emerald-500",
};

function timeAgo(iso: string): string {
  const ms = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return t("app.notificationBell.justNow");
  if (s < 3600) return `${Math.floor(s / 60)} ${t("app.notificationBell.minAgo")}`;
  if (s < 86400) return `${Math.floor(s / 3600)} ${t("app.notificationBell.hourAgo")}`;
  return new Date(iso).toISOString().slice(0, 10);
}

export default function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read).length;

  async function load() {
    try {
      const r = await api.get<{ notifications: Notif[] }>("/api/notifications");
      setItems(r?.notifications ?? []);
    } catch {
      /* ignore transient errors */
    }
  }

  // Load on mount + poll every 60s (matches the pipeline's data-ready / advice-change cadence).
  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setItems((prev) => prev.map((n) => ({ ...n, read: true }))); // optimistic
      try {
        await api.post("/api/notifications/read", {});
      } catch {
        /* best-effort; badge already cleared optimistically */
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={t("app.notificationBell.ariaLabel")}
        // 48px floor (--tap), not p-2's 36. This bell IS the notifications entry point on a phone:
        // the bottom nav deliberately spends its fifth slot on /account because this exists, so it
        // has to clear the same target size as everything in that bar. The icon stays 20px; only
        // the hit area grows.
        className="relative inline-flex h-[var(--tap)] w-[var(--tap)] items-center justify-center rounded-lg text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
      >
        {/* The badge hangs off the ICON, not off the button. The button is a 48px tap target with a
            20px glyph centred in it, so a badge anchored to the button's own corner would float ~14px
            away from the bell and read as an unrelated dot. */}
        <span className="relative inline-flex">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            {t("app.notificationBell.heading")}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">{t("app.notificationBell.empty")}</p>
            ) : (
              items.map((n) => {
                const inner = (
                  <div className="flex gap-2 px-4 py-3 hover:bg-slate-50">
                    <span
                      className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                        SEV_DOT[n.severity] ?? "bg-slate-400"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );
                return n.field_id ? (
                  <Link key={n.id} href={`/fields/${n.field_id}`} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
