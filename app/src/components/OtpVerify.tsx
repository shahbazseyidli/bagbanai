"use client";

// OTP email verification step (U3). Reused by signup and by login when an account isn't verified.
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ErrorNote } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { User } from "@/lib/types";

export default function OtpVerify({ email, onVerified }: { email: string; onVerified: (u: User) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await api.post<{ ok: boolean; user: User }>("/api/auth/verify-otp", { email, code });
      onVerified(r.user);
    } catch (err) {
      const d = err instanceof ApiError ? err.detail : "";
      setError(
        d === "invalid_otp" ? t("otp.invalid") :
        d === "otp_expired" ? t("otp.expired") :
        d === "too_many_attempts" ? t("otp.tooMany") :
        t("otp.failed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    setResent(false);
    try {
      await api.post("/api/auth/resend-otp", { email });
      setResent(true);
    } catch {
      setError(t("otp.sendFailed"));
    }
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <p className="text-sm text-slate-600">
        {t("otp.promptPre")}<b>{email}</b>{t("otp.promptPost")}
      </p>
      <input
        className="input text-center text-lg tracking-[0.4em]"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="••••••"
        autoFocus
      />
      <ErrorNote message={error} />
      {resent && <p className="text-xs text-emerald-700">{t("otp.resent")}</p>}
      <button className="btn-primary w-full" type="submit" disabled={busy || code.length < 6}>
        {busy ? t("otp.verifying") : t("otp.verify")}
      </button>
      <button type="button" onClick={resend} className="block w-full text-center text-sm text-emerald-700 hover:underline">
        {t("otp.resend")}
      </button>
    </form>
  );
}
