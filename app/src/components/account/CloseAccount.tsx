"use client";

// Close your own account — the one irreversible thing on this page, so it is never one tap away:
// a quiet link opens a panel that spells out the five consequences, and only typing the account's
// own address back enables the button.
//
// The typed address is compared lower-cased and trimmed, exactly as the server does, so the button
// cannot enable on something the server would then reject.
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { api, ApiError, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { publicUrl } from "@/lib/host";
import { t } from "@/lib/i18n";
import { ErrorNote } from "@/components/ui";

export default function CloseAccount() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [fieldErr, setFieldErr] = useState("");
  const [ownerBlocked, setOwnerBlocked] = useState(false);

  if (!user) return null;

  const email = user.email ?? "";
  const matches = typed.trim().toLowerCase() === email.toLowerCase() && email !== "";

  function cancel() {
    setOpen(false);
    setTyped("");
    setBanner("");
    setFieldErr("");
    setOwnerBlocked(false);
  }

  async function closeAccount() {
    setBanner("");
    setFieldErr("");
    setOwnerBlocked(false);
    setBusy(true);
    try {
      await api.post("/api/auth/account/delete", { email: typed.trim() });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.detail === "transfer_ownership_first") {
        setOwnerBlocked(true);
      } else if (err instanceof ApiError && err.detail === "confirm_email_mismatch") {
        setFieldErr(azError(err));
      } else {
        setBanner(azError(err));
      }
      setBusy(false);
      return;
    }
    // The account is gone. logout() is the one place that knows what "clear client state" means
    // (cookie, cached user, area-unit choice) and /api/auth/logout takes no auth dependency, so it
    // is safe to call with an already-deleted session; swallow anything it still throws rather than
    // stranding the person on a dead page after an irreversible server call.
    try {
      await logout();
    } catch {
      // ignore
    }
    // A hard navigation to the marketing apex, not router.push: on app.agradex.com "/" is the app
    // and would bounce a signed-out visitor to /login, and a full reload guarantees no poller,
    // provider or cached store from the dead session survives.
    window.location.assign(publicUrl("/"));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="text-sm font-medium text-red-600 underline-offset-2 hover:underline"
      >
        {t("app.account.close.link")}
      </button>
    );
  }

  return (
    <div role="region" aria-label={t("app.account.close.title")} className="rounded-xl border-[1.5px] border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{t("app.account.close.title")}</h3>
          <p className="mt-1 text-sm text-slate-700">{t("app.account.close.intro")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>{t("app.account.close.p1")}</li>
            <li>{t("app.account.close.p2")}</li>
            <li>{t("app.account.close.p3")}</li>
            <li>{t("app.account.close.p4")}</li>
            <li>{t("app.account.close.p5")}</li>
          </ul>
          <p className="mt-2 text-sm font-semibold text-red-700">{t("app.account.close.warning")}</p>
        </div>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="close-confirm">{t("app.account.close.confirmLabel")}</label>
        <p className="mb-1">
          <code className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-700">{email}</code>
        </p>
        <input
          id="close-confirm"
          className="input"
          type="email"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="email"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        {fieldErr && <p className="mt-1 text-xs text-red-600">{fieldErr}</p>}
      </div>

      {ownerBlocked && (
        <div className="mt-3 rounded-lg border border-red-300 bg-white p-3 text-sm text-red-700">
          <p>{t("app.account.close.errOwner")}</p>
          <Link href="/team" className="btn-secondary mt-2">{t("app.account.close.ownerCta")}</Link>
        </div>
      )}
      {banner && <div className="mt-3"><ErrorNote message={banner} /></div>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={cancel} disabled={busy}>
          {t("common.cancel")}
        </button>
        <button
          type="button"
          className="btn min-h-11 bg-red-600 text-white hover:bg-red-700"
          onClick={() => void closeAccount()}
          disabled={busy || !matches}
        >
          {busy ? t("app.account.close.closing") : t("app.account.close.confirmCta")}
        </button>
      </div>
    </div>
  );
}
