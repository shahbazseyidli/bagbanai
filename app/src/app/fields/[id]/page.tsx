"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t, type I18nKey } from "@/lib/i18n";
import { ErrorNote, Spinner } from "@/components/ui";
import OverviewTab from "@/components/field/OverviewTab";
import AiTab from "@/components/field/AiTab";
import MetadataTab from "@/components/field/MetadataTab";
import ScoutingTab from "@/components/field/ScoutingTab";
import TasksTab from "@/components/field/TasksTab";
import OperationsTab from "@/components/field/OperationsTab";
import YieldsTab from "@/components/field/YieldsTab";
import type { FieldDetail } from "@/lib/types";

type TabKey = "overview" | "ai" | "metadata" | "scouting" | "tasks" | "operations" | "yields";

const TABS: { key: TabKey; labelKey: I18nKey }[] = [
  { key: "overview", labelKey: "field.tab.overview" },
  { key: "ai", labelKey: "field.tab.ai" },
  { key: "metadata", labelKey: "field.tab.metadata" },
  { key: "scouting", labelKey: "field.tab.scouting" },
  { key: "tasks", labelKey: "field.tab.tasks" },
  { key: "operations", labelKey: "field.tab.operations" },
  { key: "yields", labelKey: "field.tab.yields" },
];

export default function FieldDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [field, setField] = useState<FieldDetail | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("overview");
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!field) return;
    setDeleting(true);
    try {
      await api.del(`/api/fields/${field.id}`);
      router.push(field.farm_id ? `/farms/${field.farm_id}` : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setDeleting(false);
      setConfirmDel(false);
    }
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    (async () => {
      try {
        setField(await api.get<FieldDetail>(`/api/fields/${params.id}`));
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.error"));
      }
    })();
  }, [params.id]);

  if (loading || !user) return <Spinner />;
  if (error) return <ErrorNote message={error} />;
  if (!field) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{field.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {field.area_ha?.toFixed(2)} {t("field.ha")}
            {field.mgrs_tiles && field.mgrs_tiles.length > 0 && (
              <span> · {t("field.mgrs")}: {field.mgrs_tiles.join(", ")}</span>
            )}
          </p>
        </div>
        {confirmDel ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <span className="text-sm text-red-700">Sahə və bütün datası silinsin?</span>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Silinir…" : "Bəli, sil"}
            </button>
            <button
              onClick={() => setConfirmDel(false)}
              disabled={deleting}
              className="rounded px-2 py-1 text-sm text-slate-600 hover:text-slate-800"
            >
              Ləğv et
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-red-600 hover:border-red-300 hover:bg-red-50"
          >
            Sahəni sil
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === tb.key
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      <div>
        {tab === "overview" && <OverviewTab field={field} />}
        {tab === "ai" && <AiTab fieldId={field.id} />}
        {tab === "metadata" && <MetadataTab fieldId={field.id} />}
        {tab === "scouting" && <ScoutingTab fieldId={field.id} />}
        {tab === "tasks" && <TasksTab fieldId={field.id} orgId={field.org_id} />}
        {tab === "operations" && <OperationsTab fieldId={field.id} />}
        {tab === "yields" && <YieldsTab fieldId={field.id} />}
      </div>
    </div>
  );
}
