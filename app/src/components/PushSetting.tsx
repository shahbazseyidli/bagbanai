"use client";

// H-push — the switch that actually subscribes a DEVICE, as opposed to the matrix above it, which
// only decides which categories a subscribed device is allowed to interrupt someone with.
//
// The card renders one honest state at a time and never shows a button that cannot do anything:
// a browser without push says so, an iPhone that has not installed the PWA gets the Add-to-Home
// instruction rather than a dead "turn on", a blocked permission explains where to un-block it, and
// a server without VAPID keys says the channel is not switched on yet. Every one of those was
// otherwise going to be the same greyed-out button with no explanation.
import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing } from "lucide-react";
import { t, tf } from "@/lib/i18n";
import { disablePush, enablePush, readPushState, sendTestPush, type PushState } from "@/lib/push";

type Props = {
  // Reports "is the channel live at all, and is this device on it" to a parent. NotifyMatrix needs
  // both to know whether its push column decides anything, and the notify-prefs payload cannot
  // carry them — this card is the only thing that has asked.
  onChange?: (s: { configured: boolean; active: boolean }) => void;
};

type Note = "" | "error" | "testSent" | "testFailed";

export default function PushSetting({ onChange }: Props) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>("");

  // Held in a ref so a parent passing an inline arrow does not re-run the effect on every render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const refresh = useCallback(async () => {
    const s = await readPushState();
    setState(s);
    onChangeRef.current?.({ configured: s.configured, active: s.subscribed });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onEnable() {
    setBusy(true);
    setNote("");
    const reason = await enablePush();
    await refresh();
    setBusy(false);
    // "blocked", "dormant" and "ios_needs_install" are each already spelled out, in their own
    // words, by the state the refresh just produced. Only a genuine failure needs a line of its
    // own — adding one to the others would print two explanations of the same thing.
    if (reason === "error") setNote("error");
  }

  async function onDisable() {
    setBusy(true);
    setNote("");
    const ok = await disablePush();
    await refresh();
    setBusy(false);
    if (!ok) setNote("error");
  }

  async function onTest() {
    setBusy(true);
    setNote("");
    const ok = await sendTestPush(t("push.testTitle"), t("push.testBody"));
    setBusy(false);
    setNote(ok ? "testSent" : "testFailed");
  }

  // Loading — render nothing, like its sibling cards, rather than a skeleton that flashes.
  if (!state) return null;

  const primaryBtn =
    "min-h-11 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60";
  const secondaryBtn =
    "min-h-11 rounded-lg border-[1.5px] border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-500 disabled:opacity-60";

  function statusLine(): string {
    if (!state) return "";
    if (!state.configured) return t("push.dormant");
    if (state.reason === "ios_needs_install") return t("push.iosInstall");
    if (state.reason === "unsupported") return t("push.unsupported");
    if (state.reason === "blocked") return t("push.blocked");
    if (state.subscribed) return t("push.activeOn");
    return "";
  }

  const line = statusLine();
  // A button is offered only where tapping it can change something.
  const canAct = state.configured && state.supported && state.reason === "ok";

  return (
    <div className="mt-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-slate-900">{t("push.title")}</p>
          <p className="mt-0.5 text-xs text-slate-500">{t("push.body")}</p>
        </div>
      </div>

      {line && <p className="mt-2 text-xs text-slate-600">{line}</p>}
      {canAct && state.subscribed && state.devices > 0 && (
        <p className="mt-1 text-xs text-slate-500">{tf("push.devices", { n: state.devices })}</p>
      )}

      {canAct && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {state.subscribed ? (
            <>
              <button type="button" onClick={onDisable} disabled={busy} className={secondaryBtn}>
                {busy ? t("push.working") : t("push.disable")}
              </button>
              <button type="button" onClick={onTest} disabled={busy} className={secondaryBtn}>
                {busy ? t("push.working") : t("push.test")}
              </button>
            </>
          ) : (
            <button type="button" onClick={onEnable} disabled={busy} className={primaryBtn}>
              {busy ? t("push.working") : t("push.enable")}
            </button>
          )}
        </div>
      )}

      {note === "error" && <p className="mt-2 text-xs text-red-600">{t("push.error")}</p>}
      {note === "testSent" && <p className="mt-2 text-xs text-emerald-700">{t("push.testSent")}</p>}
      {note === "testFailed" && <p className="mt-2 text-xs text-red-600">{t("push.testFailed")}</p>}
    </div>
  );
}
