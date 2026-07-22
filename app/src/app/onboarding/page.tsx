"use client";

// Onboarding (D0.1 + D0.4): silent tenancy — auto-create the org + farm behind the scenes so a
// smallholder never sees "create organization / create farm" forms, then drop straight into the
// FieldOnboarding wizard (tap-to-detect + crop question) instead of the legacy FieldCreator.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import FieldOnboarding from "@/components/field/FieldOnboarding";
import { ErrorNote, Spinner } from "@/components/ui";
import type { Farm, Field, Org } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const orgs = await api.get<Org[]>("/api/orgs");
        const org = orgs[0] ?? (await api.post<Org>("/api/orgs", { name: "Mənim təsərrüfatım", country: "AZ" }));
        const farms = await api.get<Farm[]>(`/api/farms?org_id=${org.id}`);
        const f = farms[0] ?? (await api.post<Farm>("/api/farms", { org_id: org.id, name: "Əsas ferma" }));
        setFarm(f);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.error"));
      }
    })();
  }, [loading, user, router]);

  function onFieldCreated(field: Field) {
    router.push(`/fields/${field.id}`);
  }

  if (loading || !user) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">İlk sahənizi əlavə edin</h1>
        <p className="mt-1 text-sm text-slate-600">
          Xəritədə sahənizə toxunun — sərhədi avtomatik tapacağıq, sonra peyk sağlamlıq xəritəsini görəcəksiniz.
        </p>
      </div>
      <ErrorNote message={error} />
      {farm ? <FieldOnboarding farmId={farm.id} onCreated={onFieldCreated} /> : <Spinner />}
    </div>
  );
}
