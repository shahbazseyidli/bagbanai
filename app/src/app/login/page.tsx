"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { ErrorNote } from "@/components/ui";
import type { User } from "@/lib/types";

function mapAuthError(detail: string): string {
  if (detail === "email_taken") return t("auth.err.email_taken");
  if (detail === "invalid_credentials") return t("auth.err.invalid_credentials");
  return detail || t("common.error");
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await api.post<User>("/api/auth/login", { email, password });
      setUser(user);
      router.push("/");
    } catch (err) {
      setError(mapAuthError(err instanceof ApiError ? err.detail : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="mb-4 text-xl font-bold text-slate-900">{t("auth.loginTitle")}</h1>
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
        <Link href="/signup" className="mt-4 block text-center text-sm text-emerald-700 hover:underline">
          {t("auth.toSignup")}
        </Link>
      </div>
    </div>
  );
}
