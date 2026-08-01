"use client";

// Sign in. TWO paths, and the second one is not optional to keep:
//
//   * the magic link is the PRIMARY path — type an email, tap the link in it, you are in;
//   * the password form is UNCHANGED and still one tap away. Real accounts exist with a password
//     hash (the owner's among them). Removing this form, or quietly degrading it, would lock those
//     people out of their own farms. Nothing below the "Parolla daxil ol" toggle differs from what
//     shipped before: same POST /api/auth/login, same mapAuthError, same email_not_verified →
//     resend-otp → OtpVerify branch, same afterLogin.
//
// The typed address is ONE state shared by both views, so switching does not make anyone retype it.
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t, type I18nKey } from "@/lib/i18n";
import { ErrorNote } from "@/components/ui";
import OtpVerify from "@/components/OtpVerify";
import MagicLinkForm from "@/components/auth/MagicLinkForm";
import GoogleButton from "@/components/auth/GoogleButton";
import { carryQuiz } from "@/components/auth/carryQuiz";
import type { User } from "@/lib/types";

function mapAuthError(detail: string): string {
  if (detail === "email_taken") return t("auth.err.email_taken");
  if (detail === "invalid_credentials") return t("auth.err.invalid_credentials");
  return detail || t("common.error");
}

// After login go to ?next= (a panel path the middleware bounced through the apex login), else home.
function postLoginDest(): string {
  try {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/")) return next;
  } catch { /* noop */ }
  return "/";
}

/** Reason the Google round-trip failed, handed over in ?err= because a 302 has no body to explain
 *  itself in. Unknown codes fall back to the generic error rather than printing a raw token. */
function googleError(): string {
  try {
    const code = new URLSearchParams(window.location.search).get("err");
    if (!code) return "";
    const known = ["cancelled", "state", "exchange", "network", "unverified", "disabled"];
    return t(known.includes(code) ? (`auth.google.err.${code}` as I18nKey) : "common.error");
  } catch {
    return "";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Seeded from ?err= so a failed Google round-trip explains itself on arrival.
  const [error, setError] = useState(googleError);
  const [busy, setBusy] = useState(false);
  const [withPassword, setWithPassword] = useState(false); // false = the magic-link view
  const [otpEmail, setOtpEmail] = useState<string | null>(null); // set → account needs verification

  // Both password-path successes (direct and OTP) go through here, so an OTP-verified login carries
  // the quiz exactly like a direct one. The magic link has its own copy of this in /auth/link.
  async function afterLogin(user: User) {
    setUser(user);
    await carryQuiz();
    router.push(postLoginDest());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await api.post<User>("/api/auth/login", { email, password });
      await afterLogin(user);
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "";
      if (detail === "email_not_verified") {
        // Send a fresh code and switch to the verification step.
        try { await api.post("/api/auth/resend-otp", { email }); } catch { /* ignore */ }
        setOtpEmail(email);
      } else {
        setError(mapAuthError(detail));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="mb-4 text-xl font-bold text-slate-900">
          {otpEmail ? t("app.login.emailVerifyTitle") : t("auth.loginTitle")}
        </h1>
        {otpEmail ? (
          // onVerified is typed `(u: User) => void`, so the handler must not return the promise.
          <OtpVerify email={otpEmail} onVerified={(u) => { void afterLogin(u); }} />
        ) : withPassword ? (
        <>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">{t("auth.email")}</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t("auth.password")}</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <ErrorNote message={error} />
          <button className="btn-primary w-full" type="submit" disabled={busy}>
            {busy ? t("common.loading") : t("auth.loginCta")}
          </button>
        </form>
        <button
          type="button"
          onClick={() => { setWithPassword(false); setError(""); }}
          className="mt-3 block min-h-[var(--tap)] w-full text-center text-sm text-emerald-700 hover:underline"
        >
          {t("auth.magic.useMagic")}
        </button>
        </>
        ) : (
        <>
        <MagicLinkForm mode="login" email={email} onEmailChange={setEmail} />
        {/* The way back for every account that has a password hash. */}
        <button
          type="button"
          onClick={() => { setWithPassword(true); setError(""); }}
          className="mt-3 block min-h-[var(--tap)] w-full text-center text-sm text-emerald-700 hover:underline"
        >
          {t("auth.magic.usePassword")}
        </button>
        </>
        )}
        {/* Under both views, because it is a third way in rather than an alternative to one of
            them. Renders nothing when the server has no Google credentials. */}
        <GoogleButton next={postLoginDest()} />
        <Link href="/signup" className="mt-4 block text-center text-sm text-emerald-700 hover:underline">
          {t("auth.toSignup")}
        </Link>
      </div>
    </div>
  );
}
