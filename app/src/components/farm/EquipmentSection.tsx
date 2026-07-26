"use client";

// Texnika reyestri + servis xatırlatmaları (HYBRID_PLAN W7, B13). Org-scoped, org switcher like
// /ledger. Inline AZ copy (T18 extracts later).
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Plus,
  Trash2,
  Tractor,
  Wrench,
} from "lucide-react";
import { api, azError } from "@/lib/api";
import { t, type I18nKey } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { ErrorNote, Field as FormField, Spinner } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Org } from "@/lib/types";

interface Service {
  id: string;
  equipment_id: string;
  service_type: string;
  interval_days: number | null;
  interval_hours: number | null;
  last_done_on: string | null;
  last_done_hours: number | null;
  next_due_on: string | null;
  days_left: number | null;
  overdue: boolean;
  task_id: string | null;
  cost: number | null;
  notes: string | null;
}

interface Equipment {
  id: string;
  org_id: string;
  name: string;
  kind: string | null;
  make_model: string | null;
  serial_no: string | null;
  purchase_date: string | null;
  hours: number | null;
  status: string;
  notes: string | null;
  created_at: string | null;
  services: Service[];
  next_due_on: string | null;
  overdue_count: number;
}

interface DueItem extends Service {
  equipment_name: string;
  equipment_kind: string | null;
  equipment_status: string;
}

interface DueResp {
  days: number;
  items: DueItem[];
  overdue: number;
  notified: number;
}

const KINDS: { value: string; labelKey: I18nKey }[] = [
  { value: "tractor", labelKey: "app.equipment.kindTractor" },
  { value: "sprayer", labelKey: "app.equipment.kindSprayer" },
  { value: "harvester", labelKey: "app.equipment.kindHarvester" },
  { value: "pump", labelKey: "app.equipment.kindPump" },
  { value: "other", labelKey: "app.equipment.optOther" },
];

const STATUSES: { value: string; labelKey: I18nKey }[] = [
  { value: "active", labelKey: "app.equipment.statusActive" },
  { value: "service", labelKey: "app.equipment.statusService" },
  { value: "retired", labelKey: "app.equipment.statusRetired" },
];

const SERVICE_TYPES: { value: string; labelKey: I18nKey }[] = [
  { value: "oil", labelKey: "app.equipment.svcOil" },
  { value: "filter", labelKey: "app.equipment.svcFilter" },
  { value: "tyres", labelKey: "app.equipment.svcTyres" },
  { value: "inspection", labelKey: "app.equipment.svcInspection" },
  { value: "other", labelKey: "app.equipment.optOther" },
];

const DUE_DAYS = 30;

function label(list: { value: string; labelKey: I18nKey }[], value: string | null): string {
  if (!value) return "—";
  const found = list.find((o) => o.value === value);
  return found ? t(found.labelKey) : value;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}.${m}.${y}` : iso;
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "service"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {label(STATUSES, status)}
    </span>
  );
}

function DuePill({ s }: { s: Service }) {
  if (!s.next_due_on) return <span className="text-xs text-slate-400">{t("app.equipment.noPlan")}</span>;
  if (s.overdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        {t("app.equipment.overdueLabel")} · {Math.abs(s.days_left ?? 0)} {t("app.equipment.days")}
      </span>
    );
  }
  const soon = (s.days_left ?? 999) <= 7;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        soon ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
      {s.days_left} {t("app.equipment.daysLeft")}
    </span>
  );
}

export default function EquipmentSection() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [items, setItems] = useState<Equipment[] | null>(null);
  const [due, setDue] = useState<DueResp | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  // new equipment form
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("tractor");
  const [makeModel, setMakeModel] = useState("");
  const [hours, setHours] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");

  // per-equipment new service form
  const [svcFor, setSvcFor] = useState<string | null>(null);
  const [svcType, setSvcType] = useState("oil");
  const [svcInterval, setSvcInterval] = useState("180");
  const [svcLastDone, setSvcLastDone] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    api
      .get<Org[]>("/api/orgs")
      .then((l) => {
        setOrgs(l);
        if (l[0]) setOrgId(l[0].id);
      })
      .catch((e) => setError(azError(e)));
  }, [user, loading, router]);

  const load = useCallback(async (id: string) => {
    try {
      const [list, dueResp] = await Promise.all([
        api.get<Equipment[]>(`/api/orgs/${id}/equipment`),
        api.get<DueResp>(`/api/orgs/${id}/equipment/due?days=${DUE_DAYS}`),
      ]);
      setItems(list);
      setDue(dueResp);
    } catch (e) {
      setError(azError(e));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (!orgId) return;
    setItems(null);
    setDue(null);
    void load(orgId);
  }, [orgId, load]);

  async function addEquipment(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !name.trim()) return;
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await api.post(`/api/orgs/${orgId}/equipment`, {
        name: name.trim(),
        kind,
        make_model: makeModel.trim() || null,
        hours: hours ? Number(hours) : null,
        status,
        notes: notes.trim() || null,
      });
      setName("");
      setMakeModel("");
      setHours("");
      setNotes("");
      setStatus("active");
      setAddOpen(false);
      await load(orgId);
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeEquipment(id: string) {
    if (!orgId) return;
    if (!window.confirm(t("app.equipment.confirmDelete"))) return;
    setError("");
    setBusy(true);
    try {
      await api.del(`/api/equipment/${id}`);
      await load(orgId);
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function addService(e: React.FormEvent, equipmentId: string) {
    e.preventDefault();
    if (!orgId) return;
    setError("");
    setBusy(true);
    try {
      await api.post(`/api/equipment/${equipmentId}/service`, {
        service_type: svcType,
        interval_days: svcInterval ? Number(svcInterval) : null,
        last_done_on: svcLastDone || null,
      });
      setSvcFor(null);
      setSvcType("oil");
      setSvcInterval("180");
      setSvcLastDone("");
      await load(orgId);
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function markDone(serviceId: string) {
    if (!orgId) return;
    setError("");
    setBusy(true);
    try {
      await api.post(`/api/service/${serviceId}/done`, {});
      setInfo(t("app.equipment.serviceMarkedDone"));
      await load(orgId);
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function materialize() {
    if (!orgId) return;
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const r = await api.post<{ created: number }>(
        `/api/orgs/${orgId}/equipment/materialize-tasks?days=${DUE_DAYS}`,
        {},
      );
      setInfo(
        r.created > 0
          ? `${r.created}${t("app.equipment.tasksCreatedSuffix")}`
          : t("app.equipment.noNewTasks"),
      );
      await load(orgId);
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("app.equipment.title")}</h1>
        {orgs.length > 1 && (
          <select className="input max-w-xs" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="text-sm text-slate-500">{t("app.equipment.subtitle")}</p>

      <ErrorNote message={error} />
      {info && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{info}</span>
        </div>
      )}

      {items === null ? (
        <Spinner />
      ) : (
        <>
          {/* Summary + reminder actions */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card">
              <div className="text-xs text-slate-500">{t("app.equipment.equipmentCount")}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{items.length}</div>
            </div>
            <div className="card">
              <div className="text-xs text-slate-500">{DUE_DAYS}{t("app.equipment.dueWithinSuffix")}</div>
              <div className="mt-1 text-2xl font-bold text-amber-600">{due?.items.length ?? 0}</div>
            </div>
            <div className={`card ${(due?.overdue ?? 0) > 0 ? "border-red-300 bg-red-50/40" : ""}`}>
              <div className="text-xs text-slate-500">{t("app.equipment.overdueLabel")}</div>
              <div className="mt-1 text-2xl font-bold text-red-600">{due?.overdue ?? 0}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary inline-flex min-h-11 items-center gap-2"
              onClick={() => setAddOpen((v) => !v)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("app.equipment.addEquipment")}
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex min-h-11 items-center gap-2"
              onClick={() => void materialize()}
              disabled={busy || !due || due.items.length === 0}
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              {t("app.equipment.createTasks")}
            </button>
          </div>

          {addOpen && (
            <form className="card space-y-3" onSubmit={addEquipment}>
              <h2 className="text-lg font-semibold text-slate-800">{t("app.equipment.newEquipment")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label={t("app.equipment.fieldName")} required>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("app.equipment.namePlaceholder")}
                    required
                  />
                </FormField>
                <FormField label={t("app.equipment.fieldKind")}>
                  <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
                    {KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {t(k.labelKey)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t("app.equipment.fieldModel")}>
                  <input
                    className="input"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    placeholder={t("app.equipment.modelPlaceholder")}
                  />
                </FormField>
                <FormField label={t("app.equipment.fieldHours")}>
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="1"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="0"
                  />
                </FormField>
                <FormField label={t("app.equipment.fieldStatus")}>
                  <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {t(s.labelKey)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t("app.equipment.fieldNote")}>
                  <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </FormField>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary min-h-11" disabled={busy || !name.trim()}>
                  {t("app.equipment.save")}
                </button>
                <button type="button" className="btn-secondary min-h-11" onClick={() => setAddOpen(false)}>
                  {t("app.equipment.cancel")}
                </button>
              </div>
            </form>
          )}

          {items.length === 0 ? (
            <EmptyState
              icon={Tractor}
              title={t("app.equipment.emptyTitle")}
              body={t("app.equipment.emptyBody")}
              action={{ label: t("app.equipment.addEquipment"), onClick: () => setAddOpen(true), icon: Plus }}
            />
          ) : (
            <div className="space-y-3">
              {items.map((eq) => (
                <div
                  key={eq.id}
                  className={`card space-y-3 ${eq.overdue_count > 0 ? "border-red-300" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Tractor className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                      <div>
                        <div className="text-base font-semibold text-slate-900">{eq.name}</div>
                        <div className="mt-0.5 text-sm text-slate-500">
                          {label(KINDS, eq.kind)}
                          {eq.make_model ? ` · ${eq.make_model}` : ""}
                          {eq.hours != null ? ` · ${t("app.equipment.fieldHours")}: ${Math.round(eq.hours)}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={eq.status} />
                      <button
                        type="button"
                        aria-label={t("app.equipment.deleteAria")}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => void removeEquipment(eq.id)}
                        disabled={busy}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Service schedule */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("app.equipment.serviceSchedule")}
                    </div>
                    {eq.services.length === 0 ? (
                      <p className="text-sm text-slate-500">{t("app.equipment.noServiceSchedule")}</p>
                    ) : (
                      <ul className="space-y-2">
                        {eq.services.map((s) => (
                          <li
                            key={s.id}
                            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                              s.overdue ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-800">
                                {label(SERVICE_TYPES, s.service_type)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {t("app.equipment.colNextService")}: {fmtDate(s.next_due_on)}
                                {s.interval_days ? ` · ${t("app.equipment.every")} ${s.interval_days} ${t("app.equipment.days")}` : ""}
                                {s.last_done_on ? ` · ${t("app.equipment.lastDone")}: ${fmtDate(s.last_done_on)}` : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <DuePill s={s} />
                              <button
                                type="button"
                                className="btn-secondary min-h-11 whitespace-nowrap px-3 text-sm"
                                onClick={() => void markDone(s.id)}
                                disabled={busy}
                              >
                                {t("app.equipment.markDone")}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {svcFor === eq.id ? (
                      <form className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3" onSubmit={(e) => addService(e, eq.id)}>
                        <FormField label={t("app.equipment.fieldServiceType")}>
                          <select className="input" value={svcType} onChange={(e) => setSvcType(e.target.value)}>
                            {SERVICE_TYPES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {t(s.labelKey)}
                              </option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label={t("app.equipment.fieldInterval")}>
                          <input
                            className="input"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step="1"
                            value={svcInterval}
                            onChange={(e) => setSvcInterval(e.target.value)}
                          />
                        </FormField>
                        <FormField label={t("app.equipment.fieldLastServiceDate")}>
                          <input
                            className="input"
                            type="date"
                            value={svcLastDone}
                            onChange={(e) => setSvcLastDone(e.target.value)}
                          />
                        </FormField>
                        <div className="flex gap-2 sm:col-span-3">
                          <button type="submit" className="btn-primary min-h-11" disabled={busy}>
                            {t("app.equipment.add")}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary min-h-11"
                            onClick={() => setSvcFor(null)}
                          >
                            {t("app.equipment.cancel")}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
                        onClick={() => setSvcFor(eq.id)}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t("app.equipment.addService")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming across the org */}
          {due && due.items.length > 0 && (
            <div className="card overflow-x-auto">
              <h2 className="mb-3 text-lg font-semibold text-slate-800">{t("app.equipment.upcomingServices")} ({DUE_DAYS} {t("app.equipment.days")})</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 text-left font-semibold">{t("app.equipment.title")}</th>
                    <th className="py-2 text-left font-semibold">{t("app.equipment.colService")}</th>
                    <th className="py-2 text-right font-semibold">{t("app.equipment.colNextService")}</th>
                    <th className="py-2 text-right font-semibold">{t("app.equipment.fieldStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {due.items.map((d) => (
                    <tr key={d.id} className={`border-t border-slate-100 ${d.overdue ? "bg-red-50/50" : ""}`}>
                      <td className="py-2.5 font-medium text-slate-800">{d.equipment_name}</td>
                      <td className="py-2.5 text-slate-600">{label(SERVICE_TYPES, d.service_type)}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-700">{fmtDate(d.next_due_on)}</td>
                      <td className="py-2.5 text-right">
                        {d.overdue ? (
                          <span className="font-semibold text-red-600">{t("app.equipment.overdueLabel")}</span>
                        ) : (
                          <span className="text-slate-500">{d.days_left} {t("app.equipment.days")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
