"use client";

// Change your own password. Until now a live product with real accounts had no way to do this at
// all — someone whose password leaked could only ask us to reset it by hand.
//
// Nothing here touches auth state: POST /api/auth/change-password re-issues the session cookie on
// its own response (the JWT is not derived from the password, so the endpoint rotates it), and
// api.post already sends credentials: "include". Calling refresh()/setUser afterwards would only
// re-fetch a user object that did not change.
//
// The backend's "wrong_password" is deliberately shown ON the current-password field rather than as
// a banner: it names exactly which of the three boxes is wrong, which a banner above the form does
// not. The same goes for the two new-password codes.
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { api, ApiError, azError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { ErrorNote } from "@/components/ui";

// Backend code → the field the message belongs under. Anything not listed stays a banner.
const FIELD_OF: Record<string, "current" | "next"> = {
  wrong_password: "current",
  invalid_password: "current",
  password_too_short: "next",
  password_unchanged: "next",
};

export default function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [ok, setOk] = useState(false);
  const [fieldErr, setFieldErr] = useState<{ current?: string; next?: string }>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBanner("");
    setOk(false);

    // Validate before spending a request — and before sending the current password over the wire
    // for a form the user has obviously not finished.
    if (!current.trim()) {
      setFieldErr({ current: t("app.account.pw.errCurrentRequired") });
      return;
    }
    if (next.length < 8) {
      setFieldErr({ next: t("app.err.passwordTooShort") });
      return;
    }
    if (next === current) {
      setFieldErr({ next: t("app.err.passwordUnchanged") });
      return;
    }
    if (confirm !== next) {
      setFieldErr({ next: t("app.account.pw.errConfirm") });
      return;
    }
    setFieldErr({});

    setBusy(true);
    try {
      await api.post("/api/auth/change-password", {
        current_password: current,
        new_password: next,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setOk(true);
    } catch (err) {
      const where = err instanceof ApiError ? FIELD_OF[err.detail] : undefined;
      if (where === "current") setFieldErr({ current: azError(err) });
      else if (where === "next") setFieldErr({ next: azError(err) });
      else setBanner(azError(err));
    } finally {
      setBusy(false);
    }
  }

  const type = show ? "text" : "password";

  return (
    <div id="password" className="rounded-xl border-[1.5px] border-slate-300 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-emerald-700">
          <Lock className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{t("app.account.pw.title")}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{t("app.account.pw.body")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? t("app.account.pw.hide") : t("app.account.pw.show")}
          className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      <form onSubmit={submit} className="mt-3 space-y-3">
        <div>
          <label className="label" htmlFor="pw-current">{t("app.account.pw.current")}</label>
          <input
            id="pw-current"
            className="input"
            type={type}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          {fieldErr.current && <p className="mt-1 text-xs text-red-600">{fieldErr.current}</p>}
        </div>

        <div>
          <label className="label" htmlFor="pw-new">{t("app.account.pw.new")}</label>
          <input
            id="pw-new"
            className="input"
            type={type}
            autoComplete="new-password"
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">{t("app.account.pw.rule")}</p>
          {fieldErr.next && <p className="mt-1 text-xs text-red-600">{fieldErr.next}</p>}
        </div>

        <div>
          <label className="label" htmlFor="pw-confirm">{t("app.account.pw.confirm")}</label>
          <input
            id="pw-confirm"
            className="input"
            type={type}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {banner && <ErrorNote message={banner} />}
        {ok && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {t("app.account.pw.saved")}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? t("common.saving") : t("app.account.pw.submit")}
        </button>
      </form>
    </div>
  );
}
