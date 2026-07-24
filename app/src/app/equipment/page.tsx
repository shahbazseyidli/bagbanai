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
import { useAuth } from "@/lib/auth";
import { ErrorNote, Field as FormField, Placeholder, Spinner } from "@/components/ui";
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

const KINDS = [
  { value: "tractor", label: "Traktor" },
  { value: "sprayer", label: "Çiləyici" },
  { value: "harvester", label: "Kombayn" },
  { value: "pump", label: "Nasos" },
  { value: "other", label: "Digər" },
];

const STATUSES = [
  { value: "active", label: "Aktiv" },
  { value: "service", label: "Servisdə" },
  { value: "retired", label: "İstifadədən çıxıb" },
];

const SERVICE_TYPES = [
  { value: "oil", label: "Yağ dəyişimi" },
  { value: "filter", label: "Filtr dəyişimi" },
  { value: "tyres", label: "Təkərlər" },
  { value: "inspection", label: "Texniki baxış" },
  { value: "other", label: "Digər" },
];

const DUE_DAYS = 30;

function label(list: { value: string; label: string }[], value: string | null): string {
  if (!value) return "—";
  return list.find((o) => o.value === value)?.label ?? value;
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
  if (!s.next_due_on) return <span className="text-xs text-slate-400">Plan yoxdur</span>;
  if (s.overdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        Gecikib · {Math.abs(s.days_left ?? 0)} gün
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
      {s.days_left} gün qalıb
    </span>
  );
}

export default function EquipmentPage() {
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
    if (!window.confirm("Bu texnika silinsin? Servis qeydləri də silinəcək.")) return;
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
      setInfo("Servis qeyd olundu.");
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
          ? `${r.created} servis tapşırığı yaradıldı — “İşlər” bölməsində görünəcək.`
          : "Yeni tapşırıq yoxdur — bütün yaxın servislər artıq tapşırıqdadır.",
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
        <h1 className="text-2xl font-bold text-slate-900">Texnika</h1>
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
      <p className="text-sm text-slate-500">
        Traktor, çiləyici və digər texnikanın reyestri, iş saatı və servis qrafiki. Vaxtı çatan servislər
        tapşırığa çevrilə bilər.
      </p>

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
              <div className="text-xs text-slate-500">Texnika sayı</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{items.length}</div>
            </div>
            <div className="card">
              <div className="text-xs text-slate-500">{DUE_DAYS} gün ərzində servis</div>
              <div className="mt-1 text-2xl font-bold text-amber-600">{due?.items.length ?? 0}</div>
            </div>
            <div className={`card ${(due?.overdue ?? 0) > 0 ? "border-red-300 bg-red-50/40" : ""}`}>
              <div className="text-xs text-slate-500">Gecikib</div>
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
              Texnika əlavə et
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex min-h-11 items-center gap-2"
              onClick={() => void materialize()}
              disabled={busy || !due || due.items.length === 0}
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Tapşırıq yarat
            </button>
          </div>

          {addOpen && (
            <form className="card space-y-3" onSubmit={addEquipment}>
              <h2 className="text-lg font-semibold text-slate-800">Yeni texnika</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Ad" required>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Məsələn: MTZ-892"
                    required
                  />
                </FormField>
                <FormField label="Növ">
                  <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
                    {KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Model">
                  <input
                    className="input"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    placeholder="Marka / model"
                  />
                </FormField>
                <FormField label="İş saatı">
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
                <FormField label="Vəziyyət">
                  <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Qeyd">
                  <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </FormField>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary min-h-11" disabled={busy || !name.trim()}>
                  Yadda saxla
                </button>
                <button type="button" className="btn-secondary min-h-11" onClick={() => setAddOpen(false)}>
                  İmtina
                </button>
              </div>
            </form>
          )}

          {items.length === 0 ? (
            <Placeholder>Hələ texnika qeyd olunmayıb. “Texnika əlavə et” ilə başlayın.</Placeholder>
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
                          {eq.hours != null ? ` · İş saatı: ${Math.round(eq.hours)}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={eq.status} />
                      <button
                        type="button"
                        aria-label="Texnikanı sil"
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
                      Servis qrafiki
                    </div>
                    {eq.services.length === 0 ? (
                      <p className="text-sm text-slate-500">Servis qrafiki yoxdur.</p>
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
                                Növbəti servis: {fmtDate(s.next_due_on)}
                                {s.interval_days ? ` · hər ${s.interval_days} gün` : ""}
                                {s.last_done_on ? ` · son: ${fmtDate(s.last_done_on)}` : ""}
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
                                Servis edildi
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {svcFor === eq.id ? (
                      <form className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3" onSubmit={(e) => addService(e, eq.id)}>
                        <FormField label="Servis növü">
                          <select className="input" value={svcType} onChange={(e) => setSvcType(e.target.value)}>
                            {SERVICE_TYPES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label="Interval (gün)">
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
                        <FormField label="Son servis tarixi">
                          <input
                            className="input"
                            type="date"
                            value={svcLastDone}
                            onChange={(e) => setSvcLastDone(e.target.value)}
                          />
                        </FormField>
                        <div className="flex gap-2 sm:col-span-3">
                          <button type="submit" className="btn-primary min-h-11" disabled={busy}>
                            Əlavə et
                          </button>
                          <button
                            type="button"
                            className="btn-secondary min-h-11"
                            onClick={() => setSvcFor(null)}
                          >
                            İmtina
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
                        Servis əlavə et
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
              <h2 className="mb-3 text-lg font-semibold text-slate-800">Yaxın servislər ({DUE_DAYS} gün)</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 text-left font-semibold">Texnika</th>
                    <th className="py-2 text-left font-semibold">Servis</th>
                    <th className="py-2 text-right font-semibold">Növbəti servis</th>
                    <th className="py-2 text-right font-semibold">Vəziyyət</th>
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
                          <span className="font-semibold text-red-600">Gecikib</span>
                        ) : (
                          <span className="text-slate-500">{d.days_left} gün</span>
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
