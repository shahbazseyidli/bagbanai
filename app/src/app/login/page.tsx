"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { ErrorNote } from "@/components/ui";
import OtpVerify from "@/components/OtpVerify";
import { clearAnswers, loadAnswers } from "@/lib/onboardingQuiz";
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

// E13 — a visitor who took the landing quiz and then signed IN, not up, had their answers stranded:
// only the signup body ever carried them, so they sat in localStorage until the next signup on this
// browser silently inherited them.
//
// Bounded to this visit on purpose: on a shared device the answers may belong to whoever was
// browsing rather than to the account being opened, and an hours-old quiz is the same person while a
// week-old one is a coin flip. An unfinished quiz has no completed_at (only finish() stamps it), so
// the same gate also refuses to apply a half-answered one.
const QUIZ_CARRY_MS = 24 * 60 * 60 * 1000;

async function carryQuiz() {
  const q = loadAnswers();
  if (!q) return;
  const done = q.completed_at ? Date.parse(q.completed_at) : NaN;
  if (Number.isFinite(done) && Date.now() - done < QUIZ_CARRY_MS) {
    try {
      await api.post("/api/auth/onboarding", { onboarding: q });
    } catch { /* a nicety, never a reason to block the login */ }
  }
  clearAnswers(); // fresh or stale, it has had its chance — don't leak it into the next account
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string | null>(null); // set → account needs verification

  // Both success paths (password and OTP) go through here, so an OTP-verified login carries the
  // quiz exactly like a direct one.
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
        ) : (
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
        )}
        <Link href="/signup" className="mt-4 block text-center text-sm text-emerald-700 hover:underline">
          {t("auth.toSignup")}
        </Link>
      </div>
    </div>
  );
}
