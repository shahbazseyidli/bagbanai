"use client";

// The per-user notification matrix: 5 alert categories × 4 delivery channels.
//
// Why a grid and not five toggles: "turn off notifications" is the wrong question. A farmer who is
// tired of frost pings at 3 a.m. still wants the pest window, and someone who reads everything in
// the app still wants the Wednesday email. Rows are the kinds of alert the platform actually
// produces (they map 1:1 to services/app/notify_prefs.CATEGORIES — the server sends the order), and
// each cell is one honest promise about where that kind lands.
//
// Opt-out model: a cell is ON unless it was switched off, so the recommended state stores nothing
// and "reset" is literally PUT {"prefs": {}}. The PUT sends the whole matrix and returns the same
// shape as the GET, so one response reconciles the entire card.
import { useCallback, useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { api } from "@/lib/api";
import { t, tf } from "@/lib/i18n";
import { EMAIL_LIFECYCLE_EVENT } from "@/components/EmailLifecycleToggle";
import PushSetting from "@/components/PushSetting";

type Matrix = Record<string, Record<string, boolean>>;

type NotifyPrefsResponse = {
  prefs?: Matrix;
  categories?: string[];
  channels?: string[];
  digest_enabled?: boolean;
  telegram?: { configured?: boolean; linked?: boolean };
};

// Fallbacks for the (impossible, but cheap to survive) case of a response missing its shape.
const FALLBACK_CATEGORIES = ["vegetation", "weather", "pest", "advice", "system"];
const FALLBACK_CHANNELS = ["inapp", "push", "digest", "telegram"];

// Column label + the long hint under the matrix. `t()` only takes a literal I18nKey, so the four
// channels are spelled out here rather than built from the server's channel id.
function columnLabel(ch: string): string {
  if (ch === "inapp") return t("notifyMatrix.colInapp");
  if (ch === "push") return t("notifyMatrix.colPush");
  if (ch === "digest") return t("notifyMatrix.colDigest");
  if (ch === "telegram") return t("notifyMatrix.colTelegram");
  return ch;
}

function columnHint(ch: string): string {
  if (ch === "inapp") return t("notifyMatrix.colInappHint");
  if (ch === "push") return t("notifyMatrix.colPushHint");
  if (ch === "digest") return t("notifyMatrix.colDigestHint");
  if (ch === "telegram") return t("notifyMatrix.colTelegramHint");
  return "";
}

export default function NotifyMatrix() {
  const [state, setState] = useState<NotifyPrefsResponse | null>(null);
  const [error, setError] = useState(false);
  // Reported by the PushSetting card below — the notify-prefs payload cannot say whether the server
  // holds VAPID keys or whether THIS device is subscribed, and both change what the push column
  // actually promises. `null` means "not known yet": do not dim on unknown, or the column flickers
  // grey on every load.
  const [push, setPush] = useState<{ configured: boolean; active: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<NotifyPrefsResponse>("/api/auth/notify-prefs")
      .then((r) => {
        if (alive) setState(r ?? null);
      })
      .catch(() => {
        // Signed out or offline — hide the card rather than show switches that cannot be saved.
        if (alive) setState(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  // The master "no lifecycle email at all" switch lives two cards above this one. Without listening
  // for it, the "digest is off entirely" note would stay stale until a reload — i.e. the card would
  // be wrong in exactly the moment the farmer is looking at it.
  const onLifecycleChange = useCallback(() => {
    api
      .get<{ enabled: boolean }>("/api/auth/email-lifecycle")
      .then((r) => setState((s) => (s ? { ...s, digest_enabled: !!r?.enabled } : s)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    window.addEventListener(EMAIL_LIFECYCLE_EVENT, onLifecycleChange);
    return () => window.removeEventListener(EMAIL_LIFECYCLE_EVENT, onLifecycleChange);
  }, [onLifecycleChange]);

  if (!state) return null;

  // The server owns the category/channel order; the fallbacks only keep the card from rendering
  // empty if a response ever arrives without them.
  const categories: string[] = state.categories && state.categories.length > 0
    ? state.categories : FALLBACK_CATEGORIES;
  const channels: string[] = state.channels && state.channels.length > 0
    ? state.channels : FALLBACK_CHANNELS;
  const prefs: Matrix = state?.prefs ?? {};
  const digestEnabled = state?.digest_enabled !== false;
  const tgConfigured = state?.telegram?.configured === true;
  const tgLinked = state?.telegram?.linked === true;
  // Two different reasons this column decides nothing right now: the server has no VAPID keys, or
  // it has them and this device never subscribed. Both dim it; the note underneath says which.
  const pushMuted = push?.configured === false || push?.active === false;

  const isOn = (cat: string, ch: string) => prefs?.[cat]?.[ch] !== false;

  async function save(next: Matrix) {
    const prev = state;
    setState((s) => (s ? { ...s, prefs: next } : s));
    setError(false);
    try {
      const r = await api.put<NotifyPrefsResponse>("/api/auth/notify-prefs", { prefs: next });
      if (r) setState(r);
    } catch {
      setState(prev); // the switch must never lie about what the server stores
      setError(true);
    }
  }

  function toggle(cat: string, ch: string) {
    const next: Matrix = {};
    for (const c of categories) {
      next[c] = {};
      for (const k of channels) next[c][k] = isOn(c, k);
    }
    next[cat][ch] = !isOn(cat, ch);
    void save(next);
  }

  function reset() {
    void save({});
  }

  return (
    <div className="rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-slate-900">{t("notifyMatrix.title")}</p>
          <p className="mt-0.5 text-xs text-slate-500">{t("notifyMatrix.body")}</p>
        </div>
      </div>

      {/* Column headers. Four cells at 44px plus three 4px gaps = 188px, leaving the category label
          ~155px at 375px — enough that only the two longest names wrap to a second line. 44px is the
          tap-target floor from D1: add a fifth channel and the layout needs rethinking, not shrinking. */}
      <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-2">
        <span />
        <div className="flex gap-1">
          {channels.map((ch) => (
            <span
              key={ch}
              className={`w-11 text-center text-[10px] leading-tight ${
                (ch === "digest" && !digestEnabled)
                || (ch === "telegram" && !tgConfigured)
                || (ch === "push" && pushMuted)
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              {columnLabel(ch)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-1 divide-y divide-slate-100">
        {categories.map((cat) => {
          const catName = tf(`notifyCat.${cat}`);
          const allOff = channels.every((ch) => !isOn(cat, ch));
          return (
            <div key={cat} className="py-2">
              <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{catName}</p>
                  <p className="text-xs text-slate-500">{tf(`notifyCat.${cat}Example`)}</p>
                </div>
                <div className="flex gap-1">
                  {channels.map((ch) => {
                    const on = isOn(cat, ch);
                    const dormant = (ch === "telegram" && !tgConfigured)
                      || (ch === "push" && pushMuted);
                    const muted = dormant || (ch === "digest" && !digestEnabled);
                    return (
                      <button
                        key={ch}
                        type="button"
                        role="switch"
                        aria-checked={on}
                        // Dormant, NOT disabled — for Telegram and for push alike. The note under
                        // each column promises that a choice made now takes effect the moment the
                        // channel is switched on, and both promises are kept: the PUT stores the
                        // cell, and telegram.send_alert / routers.push.deliver_org honour it.
                        // Disabling the cells would make that a lie and leave half the matrix
                        // untouchable for as long as TELEGRAM_BOT_TOKEN and VAPID_PUBLIC_KEY are
                        // empty, which is today. The dimming carries "not yet live" on its own.
                        aria-label={tf("notifyMatrix.cellAria", { cat: catName, ch: columnLabel(ch) })}
                        onClick={() => toggle(cat, ch)}
                        className={`grid min-h-11 min-w-11 place-items-center rounded-lg border-[1.5px] transition-colors ${
                          on ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                        } ${muted ? "opacity-60" : ""}`}
                      >
                        {on && <Check className="h-4 w-4 text-white" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {allOff && (
                <p className="mt-1 text-xs text-amber-700">
                  {tf("notifyMatrix.allOff", { cat: catName })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
        {channels.map((ch) => (
          <li key={ch} className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{columnLabel(ch)}</span> — {columnHint(ch)}
          </li>
        ))}
      </ul>

      {!digestEnabled && (
        <p className="mt-2 text-xs text-amber-700">{t("notifyMatrix.digestOff")}</p>
      )}
      {/* Dormant, not hidden: the choice is stored now and goes live the day the bot is connected. */}
      {!tgConfigured && (
        <p className="mt-2 text-xs text-slate-500">{t("notifyMatrix.telegramUnavailable")}</p>
      )}
      {tgConfigured && !tgLinked && (
        <p className="mt-2 text-xs text-slate-500">{t("notifyMatrix.telegramNotLinked")}</p>
      )}
      {push?.configured === false && (
        <p className="mt-2 text-xs text-slate-500">{t("notifyMatrix.pushUnavailable")}</p>
      )}
      {push?.configured === true && push.active === false && (
        <p className="mt-2 text-xs text-slate-500">{t("notifyMatrix.pushNotOnDevice")}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{t("notifyMatrix.saveError")}</p>}

      {/* The switch that turns a device on sits INSIDE this card, directly under the column that
          promises it. Telegram gets its own card elsewhere because linking a chat is a separate
          errand; granting push permission is not — it is the other half of this grid, and splitting
          the two would leave a farmer tapping a dimmed "Telefon" column with nothing nearby saying
          what to do about it. */}
      <PushSetting onChange={setPush} />

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500">{t("notifyMatrix.resetHint")}</p>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 rounded-lg border-[1.5px] border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-500"
        >
          {t("notifyMatrix.reset")}
        </button>
      </div>
    </div>
  );
}
