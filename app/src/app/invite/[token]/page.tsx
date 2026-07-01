"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { ErrorNote, Spinner } from "@/components/ui";
import type { Org } from "@/lib/types";

// Accepts an org invite. The backend's accept_path may point here
// (/invite/[token]); it calls POST /api/orgs/invites/{token}/accept.
export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [error, setError] = useState("");
  const [org, setOrg] = useState<Org | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  async function accept() {
    setError("");
    setBusy(true);
    try {
      const result = await api.post<Org>(`/api/orgs/invites/${params.token}/accept`);
      setOrg(result);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return <Spinner />;

  return (
    <div className="mx-auto max-w-sm">
      <div className="card space-y-3 text-center">
        <h1 className="text-xl font-bold text-slate-900">{t("team.invite")}</h1>
        {org ? (
          <>
            <p className="text-sm text-emerald-700">{org.name} ✓</p>
            <button className="btn-primary w-full" onClick={() => router.push("/")}>
              {t("nav.dashboard")}
            </button>
          </>
        ) : (
          <>
            <ErrorNote message={error} />
            <button className="btn-primary w-full" onClick={accept} disabled={busy}>
              {busy ? t("common.loading") : t("common.finish")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
