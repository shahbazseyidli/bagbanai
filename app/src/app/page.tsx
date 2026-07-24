"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { ErrorNote, Placeholder, Spinner } from "@/components/ui";
import TelegramConnect from "@/components/TelegramConnect";
import { ListSkeleton } from "@/components/Skeleton";
import { useUiV2 } from "@/lib/uiFlag";
import TodayHome from "@/components/home/TodayHome";
import PublicLanding from "@/components/landing/PublicLanding";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import type { Farm, Field, Org } from "@/lib/types";

export default function HomePage() {
  // useUiV2 reads ?ui= via useSearchParams, which needs a Suspense boundary under the app router.
  return (
    <Suspense fallback={<Spinner />}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const { user, loading } = useAuth();
  const v2 = useUiV2();
  if (loading) return <Spinner />;
  if (!user) return <Landing />;
  return v2 ? <TodayHome /> : <Dashboard />;
}

// W2 — PublicLanding is now the complete redesigned marketing page (hero → live map → roles →
// stats → modules → comparison → testimonials → FAQ → CTA + footer), so this is a thin delegate.
function Landing() {
  return <PublicLanding />;
}

function Dashboard() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [error, setError] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fieldsByFarm, setFieldsByFarm] = useState<Record<string, Field[]>>({});

  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [showFarmForm, setShowFarmForm] = useState(false);
  const [farmName, setFarmName] = useState("");
  const [farmRegion, setFarmRegion] = useState("");
  const [sub, setSub] = useState<{
    label: string;
    usage: { fields: { used: number; limit: number }; advice: { used: number; limit: number } };
  } | null>(null);

  useEffect(() => {
    if (!selectedOrg) return;
    (async () => {
      try {
        setSub(await api.get(`/api/orgs/${selectedOrg}/subscription`));
      } catch {
        setSub(null);
      }
    })();
  }, [selectedOrg]);

  const loadFarms = useCallback(async (orgId: string) => {
    try {
      const list = await api.get<Farm[]>(`/api/farms?org_id=${orgId}`);
      setFarms(list);
      const map: Record<string, Field[]> = {};
      await Promise.all(
        list.map(async (f) => {
          try {
            map[f.id] = await api.get<Field[]>(`/api/fields?farm_id=${f.id}`);
          } catch {
            map[f.id] = [];
          }
        }),
      );
      setFieldsByFarm(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.get<Org[]>("/api/orgs");
        setOrgs(list);
        if (list.length === 0) {
          router.replace("/onboarding");
          return;
        }
        setSelectedOrg(list[0].id);
        await loadFarms(list[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.error"));
        setOrgs([]);
      }
    })();
  }, [router, loadFarms]);

  async function onSelectOrg(id: string) {
    setSelectedOrg(id);
    setFarms([]);
    setFieldsByFarm({});
    await loadFarms(id);
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    try {
      const org = await api.post<Org>("/api/orgs", { name: orgName, country: "AZ" });
      setOrgs((prev) => [...(prev ?? []), org]);
      setOrgName("");
      setShowOrgForm(false);
      await onSelectOrg(org.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function createFarm(e: React.FormEvent) {
    e.preventDefault();
    try {
      const farm = await api.post<Farm>("/api/farms", {
        org_id: selectedOrg,
        name: farmName,
        region: farmRegion || undefined,
      });
      setFarms((prev) => [...prev, farm]);
      setFieldsByFarm((prev) => ({ ...prev, [farm.id]: [] }));
      setFarmName("");
      setFarmRegion("");
      setShowFarmForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  if (orgs === null) return <ListSkeleton count={3} />;

  const current = orgs.find((o) => o.id === selectedOrg);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("dash.title")}</h1>
        <Link
          href="/pricing"
          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          title="Paketlərə bax / yüksəlt"
        >
          Paket: {sub?.label ?? "Pulsuz"}
          {sub && sub.label === "Pulsuz" ? " · Yüksəlt →" : ""}
        </Link>
      </div>

      {/* Subscription usage snapshot (user-facing) */}
      {sub && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-2 text-xs text-slate-600">
          <span>
            Sahələr: <b className="text-slate-800">{sub.usage.fields.used}</b>
            {sub.usage.fields.limit < 1000 ? ` / ${sub.usage.fields.limit}` : ""}
          </span>
          <span>
            Bu ay AI məsləhət: <b className="text-slate-800">{sub.usage.advice.used}</b> / {sub.usage.advice.limit}
          </span>
          <Link href="/pricing" className="ml-auto text-emerald-700 hover:underline">
            Paketi dəyiş →
          </Link>
        </div>
      )}

      <OnboardingChecklist />

      <TelegramConnect />

      <ErrorNote message={error} />

      {/* Org selector — hidden for single-org smallholders (D0.4); org management moves to
          "Daha çox" in D2/D4. */}
      {orgs.length > 1 && (
      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label className="label">{t("dash.selectOrg")}</label>
            <select
              className="input"
              value={selectedOrg}
              onChange={(e) => onSelectOrg(e.target.value)}
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-secondary" onClick={() => setShowOrgForm((v) => !v)}>
            <Plus className="h-4 w-4" /> {t("dash.newOrg")}
          </button>
        </div>
        {current && (
          <p className="mt-2 text-sm text-slate-500">
            {t("dash.role")}: {current.role}
          </p>
        )}
        {showOrgForm && (
          <form onSubmit={createOrg} className="mt-3 flex gap-2">
            <input
              className="input"
              placeholder={t("dash.orgName")}
              value={orgName}
              required
              onChange={(e) => setOrgName(e.target.value)}
            />
            <button className="btn-primary" type="submit">
              {t("common.create")}
            </button>
          </form>
        )}
      </div>
      )}

      {/* Farms + fields */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">{t("dash.farms")}</h2>
        <button className="btn-secondary" onClick={() => setShowFarmForm((v) => !v)}>
          <Plus className="h-4 w-4" /> {t("dash.newFarm")}
        </button>
      </div>

      {showFarmForm && (
        <form onSubmit={createFarm} className="card flex flex-wrap gap-2">
          <input
            className="input flex-1"
            placeholder={t("dash.farmName")}
            value={farmName}
            required
            onChange={(e) => setFarmName(e.target.value)}
          />
          <input
            className="input flex-1"
            placeholder={t("dash.farmRegion")}
            value={farmRegion}
            onChange={(e) => setFarmRegion(e.target.value)}
          />
          <button className="btn-primary" type="submit">
            {t("common.create")}
          </button>
        </form>
      )}

      {farms.length === 0 ? (
        <Placeholder>{t("dash.noFarms")}</Placeholder>
      ) : (
        <div className="space-y-4">
          {farms.map((farm) => (
            <div key={farm.id} className="card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{farm.name}</h3>
                  {farm.region && <p className="text-sm text-slate-500">{farm.region}</p>}
                </div>
                <Link href={`/farms/${farm.id}/fields/new`} className="btn-secondary">
                  <Plus className="h-4 w-4" /> {t("dash.newField")}
                </Link>
              </div>
              {(fieldsByFarm[farm.id]?.length ?? 0) === 0 ? (
                <Placeholder>{t("dash.noFields")}</Placeholder>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {fieldsByFarm[farm.id].map((field) => (
                    <li key={field.id}>
                      <Link
                        href={`/fields/${field.id}`}
                        className="flex items-center justify-between py-2 hover:text-emerald-700"
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                          {field.name}
                        </span>
                        <span className="text-sm text-slate-500">
                          {field.area_ha?.toFixed(2)} {t("field.ha")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
