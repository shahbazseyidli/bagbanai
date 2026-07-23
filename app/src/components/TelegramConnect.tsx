"use client";

// Telegram alert channel connect card (U4/T22). Renders nothing until the bot is configured
// server-side, so it stays invisible until the owner adds TELEGRAM_BOT_TOKEN.
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { api } from "@/lib/api";
import { track, markDone } from "@/lib/track";

interface TgStatus {
  configured: boolean;
  connected: boolean;
  opt_in: boolean;
  connect_url: string | null;
}

export default function TelegramConnect() {
  const [s, setS] = useState<TgStatus | null>(null);

  async function load() {
    try {
      const st = await api.get<TgStatus>("/api/messaging/telegram");
      setS(st);
      if (st.connected) { markDone("telegram"); track("telegram_connected"); } // D3.6 activation
    } catch {
      setS(null);
    }
  }
  useEffect(() => { void load(); }, []);

  if (!s || !s.configured) return null;

  async function toggle() {
    if (!s) return;
    try {
      await api.post("/api/messaging/telegram/optin", { opt_in: !s.opt_in });
      await load();
    } catch { /* ignore */ }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-sky-600" />
        <h3 className="font-semibold text-slate-800">Telegram bildirişləri</h3>
      </div>
      {s.connected ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-emerald-700">✓ Qoşulub — risk və hava alertləri Telegram-a gəlir.</span>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={s.opt_in} onChange={toggle} className="accent-emerald-600" /> Aktiv
          </label>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-slate-600">Sahə risk və hava xəbərdarlıqlarını birbaşa Telegram-da alın.</p>
          {s.connect_url && (
            <a
              href={s.connect_url}
              target="_blank"
              rel="noreferrer"
              onClick={() => setTimeout(load, 4000)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              <Send className="h-4 w-4" /> Telegram-a qoşul
            </a>
          )}
        </div>
      )}
    </div>
  );
}
