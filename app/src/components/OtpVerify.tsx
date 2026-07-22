"use client";

// OTP email verification step (U3). Reused by signup and by login when an account isn't verified.
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ErrorNote } from "@/components/ui";
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
        d === "invalid_otp" ? "Kod yanlışdır." :
        d === "otp_expired" ? "Kodun vaxtı bitib — yenidən göndərin." :
        d === "too_many_attempts" ? "Çox cəhd oldu — bir azdan yenidən yoxlayın." :
        "Təsdiq alınmadı.",
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
      setError("Kod göndərilmədi.");
    }
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <p className="text-sm text-slate-600">
        <b>{email}</b> ünvanına göndərilən 6 rəqəmli təsdiq kodunu daxil edin.
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
      {resent && <p className="text-xs text-emerald-700">Kod yenidən göndərildi.</p>}
      <button className="btn-primary w-full" type="submit" disabled={busy || code.length < 6}>
        {busy ? "Yoxlanılır…" : "Təsdiq et"}
      </button>
      <button type="button" onClick={resend} className="block w-full text-center text-sm text-emerald-700 hover:underline">
        Kodu yenidən göndər
      </button>
    </form>
  );
}
