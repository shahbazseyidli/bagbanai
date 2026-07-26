"use client";

// Anbar — inventory-lite (HYBRID_PLAN W7, B12). Org-scoped stock items + quick +/− movements +
// low-stock flagging. Stock is deducted automatically from field operations on the backend, so this
// page only covers manual intake/adjustment. Inline AZ copy (T18 extracts later).
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, History, Minus, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, azError } from "@/lib/api";
import { t, type I18nKey } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { ErrorNote, Field as FormField, Placeholder, Spinner } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";

interface Org {
  id: string;
  name: string;
}

interface Item {
  id: string;
  org_id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  min_quantity: number | null;
  unit_cost: number | null;
  currency: string;
  supplier: string | null;
  notes: string | null;
  low: boolean;
  value: number | null;
}

interface Move {
  id: string;
  item_id: string;
  delta: number;
  reason: string;
  operation_id: string | null;
  field_id: string | null;
  note: string | null;
  created_at: string | null;
}

const CATEGORIES = ["seed", "fertilizer", "pesticide", "fuel", "other"] as const;

// Enum code → localized label. Render-time t() so it follows the active locale (module-scope t()
// would freeze to the load-time locale). Keys: app.inventory.cat.* / app.inventory.reason.*
const catLabel = (c: string): string => t(`app.inventory.cat.${c}` as I18nKey);
const reasonLabel = (r: string): string => t(`app.inventory.reason.${r}` as I18nKey);

const UNITS = ["kq", "ton", "litr", "ədəd", "qab"];

const num = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : Number(n).toLocaleString("az", { maximumFractionDigits: 2 });

const money = (n: number | null | undefined, cur = "AZN") =>
  n === null || n === undefined ? "—" : `${Number(n).toLocaleString("az", { maximumFractionDigits: 2 })} ${cur === "AZN" ? "₼" : cur}`;

/** Backend detail codes this page can produce → plain Azerbaijani. Falls back to azError(). */
function errMsg(e: unknown): string {
  const detail = (e as { detail?: string } | null)?.detail;
  if (detail === "inventory_name_taken") return t("app.inventory.errNameTaken");
  if (detail === "name_required") return t("app.inventory.errNameRequired");
  if (detail === "delta_required") return t("app.inventory.errDeltaRequired");
  if (detail === "invalid_reason") return t("app.inventory.errInvalidReason");
  if (detail === "invalid_category") return t("app.inventory.errInvalidCategory");
  if (detail === "invalid_number") return t("app.inventory.errInvalidNumber");
  if (detail === "item_not_found") return t("app.inventory.errItemNotFound");
  return azError(e);
}

const EMPTY = {
  name: "",
  category: "fertilizer",
  unit: "kq",
  quantity: "",
  min_quantity: "",
  unit_cost: "",
  supplier: "",
  notes: "",
};

export default function InventorySection() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const [step, setStep] = useState<Record<string, string>>({});
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [moves, setMoves] = useState<Move[] | null>(null);

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
      .catch((e) => setError(errMsg(e)));
  }, [user, loading, router]);

  const load = useCallback(
    async (id: string) => {
      try {
        setItems(await api.get<Item[]>(`/api/orgs/${id}/inventory`));
      } catch (e) {
        setError(errMsg(e));
        setItems([]);
      }
    },
    [],
  );

  useEffect(() => {
    if (!orgId) return;
    setItems(null);
    setHistoryId(null);
    void load(orgId);
  }, [orgId, load]);

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY });
    setFormOpen(true);
    setError("");
  }

  function openEdit(it: Item) {
    setEditId(it.id);
    setForm({
      name: it.name,
      category: it.category,
      unit: it.unit,
      quantity: String(it.quantity ?? ""),
      min_quantity: it.min_quantity === null ? "" : String(it.min_quantity),
      unit_cost: it.unit_cost === null ? "" : String(it.unit_cost),
      supplier: it.supplier ?? "",
      notes: it.notes ?? "",
    });
    setFormOpen(true);
    setError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setError("");
    setBusy(true);
    const payload = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      quantity: form.quantity === "" ? 0 : Number(form.quantity),
      min_quantity: form.min_quantity === "" ? null : Number(form.min_quantity),
      unit_cost: form.unit_cost === "" ? null : Number(form.unit_cost),
      supplier: form.supplier || null,
      notes: form.notes || null,
    };
    try {
      if (editId) await api.put(`/api/inventory/${editId}`, payload);
      else await api.post(`/api/orgs/${orgId}/inventory`, payload);
      setFormOpen(false);
      setEditId(null);
      setForm({ ...EMPTY });
      await load(orgId);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function onMove(it: Item, sign: 1 | -1) {
    const raw = step[it.id] ?? "1";
    const amount = Number(String(raw).replace(",", "."));
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setError(t("app.inventory.errPositive"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      await api.post(`/api/inventory/${it.id}/move`, {
        delta: sign * amount,
        reason: sign > 0 ? "purchase" : "adjust",
        note: sign > 0 ? "Mədaxil" : "Məxaric",
      });
      await load(orgId);
      if (historyId === it.id) await fetchMoves(it.id);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(it: Item) {
    if (!window.confirm(`“${it.name}” ${t("app.inventory.deleteConfirm")}`)) return;
    setBusy(true);
    try {
      await api.del(`/api/inventory/${it.id}`);
      if (historyId === it.id) setHistoryId(null);
      await load(orgId);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function fetchMoves(itemId: string) {
    try {
      setMoves(await api.get<Move[]>(`/api/inventory/${itemId}/moves`));
    } catch (err) {
      setError(errMsg(err));
      setMoves([]);
    }
  }

  async function openHistory(itemId: string) {
    if (historyId === itemId) {
      setHistoryId(null);
      return;
    }
    setHistoryId(itemId);
    setMoves(null);
    await fetchMoves(itemId);
  }

  const lowItems = (items ?? []).filter((i) => i.low);
  const totalValue = (items ?? []).reduce((s, i) => s + (i.value ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Package className="h-6 w-6 text-emerald-700" /> {t("app.inventory.heading")}
        </h1>
        {orgs.length > 1 && (
          <select
            className="input max-w-xs"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            aria-label={t("app.inventory.orgAria")}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="text-sm text-slate-500">{t("app.inventory.subtitle")}</p>

      <ErrorNote message={error} />

      {items !== null && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card">
            <div className="text-xs text-slate-500">{t("app.inventory.statTypes")}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{items.length}</div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500">{t("app.inventory.statValue")}</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">{money(totalValue)}</div>
          </div>
          <div className={`card ${lowItems.length > 0 ? "border-amber-300 bg-amber-50/60" : ""}`}>
            <div className="text-xs text-slate-500">{t("app.inventory.lowLabel")}</div>
            <div
              className={`mt-1 text-2xl font-bold ${lowItems.length > 0 ? "text-amber-700" : "text-slate-900"}`}
            >
              {lowItems.length}
            </div>
          </div>
        </div>
      )}

      {lowItems.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border-[1.5px] border-amber-300 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">
              {t("app.inventory.lowBannerPre")}
              {lowItems.length}
              {t("app.inventory.lowBannerPost")}
            </p>
            <p className="mt-0.5 text-amber-800">
              {lowItems.map((i) => `${i.name} (${num(i.quantity)} ${i.unit})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary min-h-[44px]"
          onClick={() => (formOpen && !editId ? setFormOpen(false) : openCreate())}
        >
          {formOpen && !editId ? (
            <span className="flex items-center gap-2">
              <X className="h-4 w-4" /> {t("app.inventory.close")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> {t("app.inventory.newItem")}
            </span>
          )}
        </button>
      </div>

      {formOpen && (
        <form onSubmit={onSubmit} className="card space-y-3">
          <h2 className="font-semibold text-slate-800">
            {editId ? t("app.inventory.editItemTitle") : t("app.inventory.newItemTitle")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("app.inventory.fieldName")} required>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("app.inventory.namePlaceholder")}
                required
              />
            </FormField>
            <FormField label={t("app.inventory.fieldCategory")}>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {catLabel(c)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("app.inventory.fieldQuantity")}>
              <input
                className="input"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
              />
            </FormField>
            <FormField label={t("app.inventory.fieldUnit")}>
              <select
                className="input"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("app.inventory.fieldMin")}>
              <input
                className="input"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                value={form.min_quantity}
                onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                placeholder={t("app.inventory.minPlaceholder")}
              />
            </FormField>
            <FormField label={t("app.inventory.fieldUnitCost")}>
              <input
                className="input"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                value={form.unit_cost}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                placeholder="₼"
              />
            </FormField>
            <FormField label={t("app.inventory.fieldSupplier")}>
              <input
                className="input"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                placeholder={t("app.inventory.supplierPlaceholder")}
              />
            </FormField>
            <FormField label={t("app.inventory.fieldNote")}>
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </FormField>
          </div>
          <p className="text-xs text-slate-500">{t("app.inventory.minHelp")}</p>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary min-h-[44px]" disabled={busy}>
              {busy ? t("app.inventory.saving") : t("app.inventory.save")}
            </button>
            <button
              type="button"
              className="btn-secondary min-h-[44px]"
              onClick={() => {
                setFormOpen(false);
                setEditId(null);
              }}
            >
              {t("app.inventory.cancel")}
            </button>
          </div>
        </form>
      )}

      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("app.inventory.emptyTitle")}
          body={t("app.inventory.emptyBody")}
          action={{ label: t("app.inventory.newItem"), onClick: openCreate, icon: Plus }}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 text-left font-semibold">{t("app.inventory.fieldName")}</th>
                <th className="py-2 text-left font-semibold">{t("app.inventory.fieldCategory")}</th>
                <th className="py-2 text-right font-semibold">{t("app.inventory.fieldQuantity")}</th>
                <th className="py-2 text-right font-semibold">{t("app.inventory.fieldMin")}</th>
                <th className="py-2 text-right font-semibold">{t("app.inventory.fieldUnitCost")}</th>
                <th className="py-2 text-center font-semibold">{t("app.inventory.colMovement")}</th>
                <th className="py-2 text-right font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.id}
                  className={`border-t border-slate-100 align-middle ${it.low ? "bg-amber-50" : ""}`}
                >
                  <td className="py-2.5">
                    <div className="font-medium text-slate-800">{it.name}</div>
                    {it.low && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        <AlertTriangle className="h-3 w-3" /> {t("app.inventory.lowLabel")}
                      </span>
                    )}
                    {it.supplier && <div className="text-xs text-slate-400">{it.supplier}</div>}
                  </td>
                  <td className="py-2.5 text-slate-600">{catLabel(it.category)}</td>
                  <td className="py-2.5 text-right tabular-nums font-semibold text-slate-800">
                    {num(it.quantity)} <span className="font-normal text-slate-500">{it.unit}</span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-500">
                    {it.min_quantity === null ? "—" : num(it.min_quantity)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">
                    {money(it.unit_cost, it.currency)}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        aria-label={t("app.inventory.decreaseAria")}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => onMove(it, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        className="input h-11 w-20 text-center"
                        type="number"
                        step="any"
                        min="0"
                        inputMode="decimal"
                        value={step[it.id] ?? "1"}
                        onChange={(e) => setStep({ ...step, [it.id]: e.target.value })}
                        aria-label={t("app.inventory.moveAmountAria")}
                      />
                      <button
                        type="button"
                        aria-label={t("app.inventory.increaseAria")}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => onMove(it, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={t("app.inventory.historyAria")}
                        title={t("app.inventory.historyTitle")}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                        onClick={() => openHistory(it.id)}
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("app.inventory.editAria")}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                        onClick={() => openEdit(it)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("app.inventory.deleteAria")}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                        disabled={busy}
                        onClick={() => onDelete(it)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historyId && (
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">
              {t("app.inventory.historyTitle")} —{" "}
              {(items ?? []).find((i) => i.id === historyId)?.name ?? ""}
            </h2>
            <button
              type="button"
              aria-label={t("app.inventory.close")}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => setHistoryId(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {moves === null ? (
            <Spinner />
          ) : moves.length === 0 ? (
            <Placeholder>{t("app.inventory.noMoves")}</Placeholder>
          ) : (
            <ul className="divide-y divide-slate-100">
              {moves.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <span
                      className={`font-semibold tabular-nums ${m.delta < 0 ? "text-red-600" : "text-emerald-700"}`}
                    >
                      {m.delta > 0 ? "+" : ""}
                      {num(m.delta)}
                    </span>
                    <span className="ml-2 text-slate-600">{reasonLabel(m.reason)}</span>
                    {m.note && <span className="ml-2 text-slate-400">{m.note}</span>}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {m.created_at ? m.created_at.slice(0, 10) : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
