"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t, type I18nKey } from "@/lib/i18n";
import { ErrorNote, Spinner } from "@/components/ui";
import OverviewTab from "@/components/field/OverviewTab";
import SatelliteTab from "@/components/field/SatelliteTab";
import FieldMapSheet from "@/components/field/FieldMapSheet";
import { useUiV2 } from "@/lib/uiFlag";
import AiTab from "@/components/field/AiTab";
import MetadataTab from "@/components/field/MetadataTab";
import FertilizerCard from "@/components/field/FertilizerCard";
import PhotoDiagnose from "@/components/field/PhotoDiagnose";
import SoilLabUpload from "@/components/field/SoilLabUpload";
import ScoutingTab from "@/components/field/ScoutingTab";
import TasksTab from "@/components/field/TasksTab";
import OperationsTab from "@/components/field/OperationsTab";
import YieldsTab from "@/components/field/YieldsTab";
import type { FieldDetail } from "@/lib/types";

type TabKey =
  | "overview" | "sentinel2" | "nasa" | "ai" | "metadata"
  | "scouting" | "tasks" | "operations" | "yields";

const TABS: { key: TabKey; labelKey: I18nKey }[] = [
  { key: "overview", labelKey: "field.tab.overview" },
  { key: "sentinel2", labelKey: "field.tab.sentinel2" },
  { key: "nasa", labelKey: "field.tab.nasa" },
  { key: "ai", labelKey: "field.tab.ai" },
  { key: "metadata", labelKey: "field.tab.metadata" },
  { key: "scouting", labelKey: "field.tab.scouting" },
  { key: "tasks", labelKey: "field.tab.tasks" },
  { key: "operations", labelKey: "field.tab.operations" },
  { key: "yields", labelKey: "field.tab.yields" },
];

// D2.3 — collapse the 9 flat tabs into 3 farmer intents. Primary choice is one of 3; each group
// reveals its own tabs as a secondary chip row.
type Group = "vaziyyet" | "isler" | "melumat";
const GROUPS: { key: Group; label: string; tabs: TabKey[] }[] = [
  { key: "vaziyyet", label: "Vəziyyət", tabs: ["overview", "sentinel2", "nasa"] },
  { key: "isler", label: "İşlər", tabs: ["ai", "scouting", "tasks", "operations", "yields"] },
  { key: "melumat", label: "Məlumat", tabs: ["metadata"] },
];
const GROUP_OF: Record<TabKey, Group> = {
  overview: "vaziyyet", sentinel2: "vaziyyet", nasa: "vaziyyet",
  ai: "isler", scouting: "isler", tasks: "isler", operations: "isler", yields: "isler",
  metadata: "melumat",
};

export default function FieldDetailPage() {
  // useSearchParams (tab state) requires a Suspense boundary under the app router.
  return (
    <Suspense fallback={<Spinner />}>
      <FieldDetailInner />
    </Suspense>
  );
}

function FieldDetailInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const v2 = useUiV2(); // D2.3 map-first presentation behind ?ui=v2

  const [field, setField] = useState<FieldDetail | null>(null);
  const [error, setError] = useState("");
  // Tab lives in the URL (?tab=) so notifications/Telegram can deep-link and the back button steps
  // through tabs instead of leaving the field (D0.3).
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlTab = searchParams.get("tab");
  const tab: TabKey = TABS.some((tb) => tb.key === urlTab) ? (urlTab as TabKey) : "overview";
  function setTab(key: TabKey) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", key);
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [undoDeleted, setUndoDeleted] = useState(false);

  function openEdit() {
    if (field) setEditName(field.name);
    setConfirmDel(false);
    setEditing(true);
  }

  async function onSaveName() {
    if (!field) return;
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await api.put(`/api/fields/${field.id}`, { name });
      setField({ ...field, name });
      setEditing(false);
    } catch (err) {
      setError(azError(err));
    } finally {
      setSaving(false);
    }
  }

  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function onDelete() {
    if (!field) return;
    setDeleting(true);
    try {
      await api.del(`/api/fields/${field.id}`);
      // Soft-deleted (D2.7): show a 6s undo bar before leaving; restore if the farmer taps undo.
      setDeleting(false);
      setEditing(false);
      setUndoDeleted(true);
      undoTimer.current = setTimeout(() => router.push("/"), 6000);
    } catch (err) {
      setError(azError(err));
      setDeleting(false);
      setConfirmDel(false);
    }
  }

  async function onUndoDelete() {
    if (!field) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    try {
      await api.post(`/api/fields/${field.id}/restore`);
      setUndoDeleted(false);
    } catch (err) {
      setError(azError(err));
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
        setError(azError(err));
      }
    })();
  }, [params.id]);

  if (loading || !user) return <Spinner />;
  if (error) return <ErrorNote message={error} />;
  if (!field) return <Spinner />;

  // Field detail is presented two ways from the SAME state/handlers: the classic stacked layout,
  // and (behind ?ui=v2) the D2.3 map-first sheet. Build each piece once, then compose per branch.
  const undoBar = undoDeleted ? (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-white shadow-lg">
      <span className="text-sm">“{field.name}” silindi.</span>
      <button
        onClick={onUndoDelete}
        className="min-h-11 rounded-lg bg-white/20 px-4 py-1.5 text-sm font-bold hover:bg-white/30"
      >
        Geri qaytar
      </button>
    </div>
  ) : null;

  const titleRow = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{field.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {field.area_ha?.toFixed(2)} {t("field.ha")}
        </p>
      </div>
      {!editing && (
        <button
          onClick={openEdit}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Settings className="h-4 w-4" /> Redaktə
        </button>
      )}
    </div>
  );

  // Field settings/edit panel — rename + delete live here (delete no longer in the header).
  const editPanel = (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Sahə ayarları</h3>
        <button onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:text-slate-700">
          Bağla
        </button>
      </div>

      <div className="mt-3">
        <label className="text-xs font-medium text-slate-500">Sahənin adı</label>
        <div className="mt-1 flex gap-2">
          <input
            className="input flex-1"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <button
            onClick={onSaveName}
            disabled={saving || !editName.trim() || editName.trim() === field.name}
            className="btn-primary shrink-0 disabled:opacity-50"
          >
            {saving ? "Saxlanır…" : "Saxla"}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Məhsul növü, torpaq və s. dəyişikliklər üçün “Sahə haqqında məlumat” tabına keçin.
        </p>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        {confirmDel ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <span className="text-sm text-red-700">Sahə silinsin? Silindikdən sonra qısa müddət ərzində geri qaytara bilərsiniz.</span>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Silinir…" : "Bəli, sil"}
            </button>
            <button onClick={() => setConfirmDel(false)} disabled={deleting} className="rounded px-2 py-1 text-sm text-slate-600 hover:text-slate-800">
              Ləğv et
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Sahəni sil
          </button>
        )}
      </div>
    </div>
  );

  const activeGroup = GROUP_OF[tab];
  const groupTabs = GROUPS.find((g) => g.key === activeGroup)!.tabs;
  const tabNav = (
    <div className="space-y-2">
      {/* Primary: 3 farmer intents */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setTab(g.tabs[0])}
            aria-current={activeGroup === g.key}
            className={`min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
              activeGroup === g.key ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {/* Secondary: this group's tabs (hidden when the group has just one) */}
      {groupTabs.length > 1 && (
        <div className="flex flex-nowrap gap-1 overflow-x-auto border-b border-slate-200">
          {groupTabs.map((tk) => {
            const tb = TABS.find((x) => x.key === tk)!;
            return (
              <button
                key={tk}
                onClick={() => setTab(tk)}
                className={`-mb-px min-h-11 shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
                  tab === tk
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-600 hover:text-slate-800"
                }`}
              >
                {t(tb.labelKey)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const tabContent = (
    <div>
      {tab === "overview" && <OverviewTab field={field} onNavigate={(x) => setTab(x)} compact={v2} />}
      {tab === "sentinel2" && <SatelliteTab field={field} sensor="S2" />}
      {tab === "nasa" && <SatelliteTab field={field} sensor="HLS" />}
      {tab === "ai" && (
        <div className="space-y-6">
          <AiTab fieldId={field.id} />
          <PhotoDiagnose fieldId={field.id} />
          <SoilLabUpload fieldId={field.id} />
          <FertilizerCard fieldId={field.id} />
        </div>
      )}
      {tab === "metadata" && <MetadataTab fieldId={field.id} />}
      {tab === "scouting" && <ScoutingTab fieldId={field.id} />}
      {tab === "tasks" && <TasksTab fieldId={field.id} orgId={field.org_id} />}
      {tab === "operations" && <OperationsTab fieldId={field.id} />}
      {tab === "yields" && <YieldsTab fieldId={field.id} />}
    </div>
  );

  if (v2) {
    return (
      <>
        {undoBar}
        <FieldMapSheet
          field={field}
          onCamera={() => {
            // Camera FAB: open the AI (photo-diagnose) tab AND expand the sheet to full in one nav.
            const sp = new URLSearchParams(searchParams.toString());
            sp.set("tab", "ai");
            sp.set("panel", "full");
            router.push(`${pathname}?${sp.toString()}`, { scroll: false });
          }}
          header={
            <>
              {titleRow}
              {editing && <div className="mt-3">{editPanel}</div>}
            </>
          }
          tabNav={tabNav}
        >
          {tabContent}
        </FieldMapSheet>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {undoBar}
      {titleRow}
      {editing && editPanel}
      {tabNav}
      {tabContent}
    </div>
  );
}
