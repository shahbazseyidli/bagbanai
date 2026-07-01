"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import FieldCreator from "@/components/FieldCreator";
import { ErrorNote, Field as FormField, Spinner } from "@/components/ui";
import type { Farm, Field, Org } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [step, setStep] = useState(1);
  const [org, setOrg] = useState<Org | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [error, setError] = useState("");

  const [orgName, setOrgName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [farmRegion, setFarmRegion] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <Spinner />;

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const created = await api.post<Org>("/api/orgs", { name: orgName, country: "AZ" });
      setOrg(created);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function createFarm(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setError("");
    setBusy(true);
    try {
      const created = await api.post<Farm>("/api/farms", {
        org_id: org.id,
        name: farmName,
        region: farmRegion || undefined,
      });
      setFarm(created);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  function onFieldCreated(field: Field) {
    router.push(`/fields/${field.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("onb.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("onb.intro")}</p>
      </div>

      <ol className="flex gap-2 text-sm">
        {[t("onb.step1"), t("onb.step2"), t("onb.step3")].map((label, i) => (
          <li
            key={i}
            className={`flex-1 rounded-lg px-3 py-2 text-center ${
              step === i + 1
                ? "bg-emerald-600 text-white"
                : step > i + 1
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      <ErrorNote message={error} />

      {step === 1 && (
        <form onSubmit={createOrg} className="card space-y-3">
          <FormField label={t("dash.orgName")} required>
            <input
              className="input"
              value={orgName}
              required
              onChange={(e) => setOrgName(e.target.value)}
            />
          </FormField>
          <button className="btn-primary" type="submit" disabled={busy}>
            {t("common.next")}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={createFarm} className="card space-y-3">
          <FormField label={t("dash.farmName")} required>
            <input
              className="input"
              value={farmName}
              required
              onChange={(e) => setFarmName(e.target.value)}
            />
          </FormField>
          <FormField label={t("dash.farmRegion")}>
            <input
              className="input"
              value={farmRegion}
              onChange={(e) => setFarmRegion(e.target.value)}
            />
          </FormField>
          <button className="btn-primary" type="submit" disabled={busy}>
            {t("common.next")}
          </button>
        </form>
      )}

      {step === 3 && farm && (
        <div className="card">
          <FieldCreator farmId={farm.id} onCreated={onFieldCreated} />
        </div>
      )}
    </div>
  );
}
