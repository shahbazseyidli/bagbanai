"use client";

// The one control both /signup and /login lead with: an email address and a button.
//
// It is the SAME call in both places — POST /api/auth/magic-link is signup and login at once, which
// is the whole point of the simplification. The `mode` prop therefore changes exactly one thing, the
// sentence above the input; it must never change the request, because a caller-visible difference
// between "register" and "sign in" is precisely the account-existence signal the endpoint refuses
// to give an unauthenticated visitor.
//
// The address is a CONTROLLED prop so /login can hand the same string to the password form when the
// farmer switches, instead of making them type it twice.
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ErrorNote } from "@/components/ui";
import { getLocale, t, tf } from "@/lib/i18n";

/**
 * The acknowledgement is deliberately uniform for a known and an unknown address alike; the only
 * thing it varies is whether we were refused as too soon.
 *
 * `retry_after` non-null means NOTHING WAS SENT. Every field is optional here on purpose: this file
 * does not own services/**, and the UI must degrade honestly if the shape arrives thinner than
 * agreed — an absent expires_in falls back to the documented TTL, an absent retry_after reads as
 * "sent", and an HTTP 429 is treated as the same refusal so either backend implementation works.
 */
interface MagicLinkAck {
  ok?: boolean;
  expires_in?: number | null;
  retry_after?: number | null;
}

// Fallback only — the real TTL comes from the response, so the 15 minutes is stated in ONE place
// (the backend) rather than duplicated across 8 dictionaries and a constant here.
const DEFAULT_TTL_SEC = 900;
// A courtesy countdown on the button, NOT the rate limit. The limit is the SQL window in the
// backend; this only stops a farmer hammering a button that cannot do anything yet.
const RESEND_COOLDOWN_SEC = 45;

export default function MagicLinkForm({
  mode,
  email,
  onEmailChange,
}: {
  mode: "signup" | "login";
  email: string;
  onEmailChange: (value: string) => void;
}) {
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState(""); // the address we actually posted, never the live input
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  // Plain numbers with 0 as the empty value, not `number | null`: an invariant spread across two
  // variables is not narrowing, and `?? 0` at the use site is how that trap gets sprung.
  const [cooldown, setCooldown] = useState(0);
  const [expiresMin, setExpiresMin] = useState(Math.round(DEFAULT_TTL_SEC / 60));

  // One timeout per tick, re-armed by the state change itself — no interval to leak and no
  // dependency on a derived boolean.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  // retry_after / 429 — the backend sent NOTHING. So we never move to (nor dress up) the "check
  // your email" screen for it: that screen says a link went to this address, and here none did.
  // auth.magic.tooSoon is worded to point at the link already sitting in their inbox.
  const refuse = (wait: number) => {
    setCooldown(wait > 0 ? Math.ceil(wait) : RESEND_COOLDOWN_SEC);
    setError(t("auth.magic.tooSoon"));
  };

  async function send(isResend: boolean): Promise<void> {
    const addr = email.trim();
    if (!addr || busy || cooldown > 0) return;
    setError("");
    setResent(false);
    setBusy(true);
    try {
      // getLocale(), not the hard-coded "az" the old signup posted. users.locale is what picks the
      // language of the automatic advice and the weekly digest (CLAUDE.md P0.3), so that constant
      // meant every account ever created was stamped Azerbaijani no matter what it was reading.
      const ack = await api.post<MagicLinkAck>("/api/auth/magic-link", { email: addr, locale: getLocale() });
      // Pulled into locals before the typeof checks so the narrowing applies to the thing actually
      // read next — narrowing `ack?.retry_after` and then using `ack.retry_after` is two different
      // references, and that shape is how a "verified by reading" type check gets it wrong.
      const retry = ack?.retry_after;
      const ttlSec = ack?.expires_in;
      if (typeof retry === "number" && retry > 0) {
        refuse(retry);
        return;
      }
      const ttl = typeof ttlSec === "number" && ttlSec > 0 ? ttlSec : DEFAULT_TTL_SEC;
      setExpiresMin(Math.max(1, Math.round(ttl / 60)));
      setCooldown(RESEND_COOLDOWN_SEC);
      setResent(isResend);
      setSentTo(addr);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        // The shipped backend signals BOTH of its windows this way and carries no retry_after, so
        // 429 is not a fallback here — it is the primary refusal path.
        refuse(RESEND_COOLDOWN_SEC);
        return;
      }
      // 503: no mail transport at all. "Try again shortly" is the honest thing to say, and it is
      // not the same sentence as "sending failed" — nothing was even attempted.
      if (err instanceof ApiError && err.detail === "email_not_configured") {
        setError(t("app.err.emailNotConfigured"));
        return;
      }
      setError(t("auth.magic.sendFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await send(false);
  }

  // Editing the address clears the countdown: the limit is per EMAIL server-side, so a different
  // address is not refused and blocking it here would be the UI inventing a rule the backend does
  // not have. Retyping the same one simply gets refused again, which is the honest answer.
  function editEmail(value: string) {
    onEmailChange(value);
    if (error) setError("");
    if (cooldown > 0) setCooldown(0);
  }

  const buttonLabel = busy
    ? t("auth.magic.sending")
    : cooldown > 0
      ? tf("auth.magic.resendWait", { seconds: cooldown })
      : "";

  if (!sent) {
    return (
      <form onSubmit={onSubmit} className="space-y-3">
        <p className="text-sm text-slate-500">
          {t(mode === "signup" ? "auth.magic.signupSub" : "auth.magic.loginSub")}
        </p>
        <div>
          <label className="label" htmlFor="magic-email">{t("auth.email")}</label>
          <input
            id="magic-email"
            className="input"
            type="email"
            required
            autoFocus
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => editEmail(e.target.value)}
          />
        </div>
        <ErrorNote message={error} />
        <button className="btn-primary w-full" type="submit" disabled={busy || cooldown > 0 || !email.trim()}>
          {buttonLabel || t("auth.magic.send")}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-slate-900">{t("auth.magic.sentTitle")}</h2>
      {/* One key with the address interpolated, not a pre/post pair: a split forces {email} into the
          middle of the sentence in all 8 languages, and word order is not ours to fix for them. */}
      <p className="text-sm text-slate-600">{tf("auth.magic.sentBody", { email: sentTo })}</p>
      <p className="text-sm text-slate-500">{tf("auth.magic.sentExpiry", { minutes: expiresMin })}</p>
      <p className="text-xs text-slate-500">{t("auth.magic.notReceived")}</p>
      <ErrorNote message={error} />
      {resent && <p className="text-xs text-emerald-700">{t("auth.magic.resent")}</p>}
      <button
        type="button"
        className="btn-primary w-full"
        disabled={busy || cooldown > 0}
        onClick={() => void send(true)}
      >
        {buttonLabel || t("auth.magic.resend")}
      </button>
      <button
        type="button"
        onClick={() => { setSent(false); setError(""); setResent(false); }}
        className="block min-h-[var(--tap)] w-full text-center text-sm text-emerald-700 hover:underline"
      >
        {t("auth.magic.changeEmail")}
      </button>
    </div>
  );
}
