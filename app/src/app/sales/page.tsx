"use client";

// Satış və alıcılar — harvest → buyer → sale log (HYBRID_PLAN W7, B7). Org-scoped like /ledger:
// org switcher + season filter, a sales table with payment chips, a create form, buyer CRM-lite
// and the by-buyer / by-crop totals. Reads ?field= / ?lot= to prefill from the field Yığım tab,
// so it needs a Suspense boundary (useSearchParams). Inline AZ copy (T18 extracts later).
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Receipt, Trash2, Users, X, Pencil } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote, Field as FormField, Placeholder, Spinner } from "@/components/ui";
import type { Org } from "@/lib/types";

interface Buyer {
  id: string;
  name: string;
  kind?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  region?: string | null;
  notes?: string | null;
}

interface Lot {
  id: string;
  field_id: string;
  field_name?: string | null;
  trace_code: string;
  season_year: number;
  crop_type?: string | null;
  harvested_on: string;
  quantity: number | null;
  unit: string;
  sold_quantity?: number;
}

interface Sale {
  id: string;
  lot_id: string | null;
  field_id: string | null;
  buyer_id: string | null;
  season_year: number | null;
  sold_on: string;
  quantity: number | null;
  unit: string;
  price_per_unit: number | null;
  revenue: number | null;
  currency: string;
  payment_status: string;
  invoice_no?: string | null;
  notes?: string | null;
  field_name?: string | null;
  buyer_name?: string | null;
  trace_code?: string | null;
}

interface Bucket { buyer_id?: string | null; buyer_name?: string; crop?: string; revenue: number; quantity: number; count: number; }
interface Summary {
  totals: { revenue: number; quantity: number; count: number };
  outstanding: { amount: number; count: number };
  by_buyer: Bucket[];
  by_crop: Bucket[];
  seasons: number[];
}

interface FieldLite { id: string; name: string }

const PAYMENTS: { value: string; label: string; cls: string }[] = [
  { value: "paid", label: "Ödənilib", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "pending", label: "Gözləyir", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "partial", label: "Qismən", cls: "bg-sky-50 text-sky-700 border-sky-200" },
];
const BUYER_KINDS: { value: string; label: string }[] = [
  { value: "trader", label: "Alverçi" },
  { value: "processor", label: "Emal müəssisəsi" },
  { value: "market", label: "Bazar / market" },
  { value: "export", label: "İxracatçı" },
  { value: "other", label: "Digər" },
];
const UNITS = ["kq", "ton"];

const money = (n: number | null | undefined) => `${Math.round(Number(n ?? 0)).toLocaleString("az")} ₼`;
const qty = (n: number | null | undefined, unit?: string) =>
  n == null ? "—" : `${Number(n).toLocaleString("az")} ${unit ?? ""}`.trim();

const ERRORS: Record<string, string> = {
  buyer_name_taken: "Bu adda alıcı artıq var.",
  buyer_not_found: "Alıcı tapılmadı.",
  lot_not_found: "Yığım partiyası tapılmadı.",
  sale_not_found: "Satış tapılmadı.",
  invalid_buyer_kind: "Alıcı növü yanlışdır.",
  invalid_payment_status: "Ödəniş statusu yanlışdır.",
  invalid_unit: "Ölçü vahidi yanlışdır.",
  invalid_currency: "Valyuta yanlışdır.",
};
function saleError(err: unknown): string {
  const code = err instanceof Error ? err.message : "";
  return ERRORS[code] ?? azError(err);
}

export default function SalesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SalesInner />
    </Suspense>
  );
}

function SalesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [tab, setTab] = useState<"sales" | "buyers">("sales");
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [fieldList, setFieldList] = useState<FieldLite[]>([]);
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [season, setSeason] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");

  // sale form
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [soldOn, setSoldOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [sField, setSField] = useState("");
  const [sLot, setSLot] = useState("");
  const [sBuyer, setSBuyer] = useState("");
  const [sQty, setSQty] = useState("");
  const [sUnit, setSUnit] = useState("kq");
  const [sPrice, setSPrice] = useState("");
  const [sPayment, setSPayment] = useState("paid");
  const [sInvoice, setSInvoice] = useState("");
  const [sNotes, setSNotes] = useState("");

  // buyer form
  const [bEditing, setBEditing] = useState<string | null>(null);
  const [bName, setBName] = useState("");
  const [bKind, setBKind] = useState("");
  const [bContact, setBContact] = useState("");
  const [bPhone, setBPhone] = useState("");
  const [bEmail, setBEmail] = useState("");
  const [bAddress, setBAddress] = useState("");
  const [bRegion, setBRegion] = useState("");
  const [bNotes, setBNotes] = useState("");

  const [busy, setBusy] = useState(false);

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

  // Prefill from the field Yığım tab ("Satış qeyd et").
  useEffect(() => {
    const f = params.get("field");
    const l = params.get("lot");
    if (f) setSField(f);
    if (l) setSLot(l);
    if (f || l) setShowSaleForm(true);
  }, [params]);

  // Reference data: buyers, harvest lots, fields.
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const [b, lt] = await Promise.all([
          api.get<Buyer[]>(`/api/orgs/${orgId}/buyers`),
          api.get<Lot[]>(`/api/orgs/${orgId}/harvest-lots`),
        ]);
        setBuyers(b);
        setLots(lt);
        const farms = await api.get<{ id: string }[]>(`/api/farms?org_id=${orgId}`);
        const lists = await Promise.all(
          farms.map((fm) => api.get<FieldLite[]>(`/api/fields?farm_id=${fm.id}`).catch(() => [])),
        );
        setFieldList(lists.flat());
      } catch (err) {
        setError(saleError(err));
      }
    })();
  }, [orgId, refresh]);

  // Sales + summary (season / buyer / field filters).
  useEffect(() => {
    if (!orgId) return;
    setSales(null);
    const qs = new URLSearchParams();
    if (season) qs.set("season", season);
    if (buyerFilter) qs.set("buyer_id", buyerFilter);
    if (fieldFilter) qs.set("field_id", fieldFilter);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    Promise.all([
      api.get<Sale[]>(`/api/orgs/${orgId}/sales${suffix}`),
      api.get<Summary>(`/api/orgs/${orgId}/sales/summary${season ? `?season=${season}` : ""}`),
    ])
      .then(([s, sm]) => {
        setSales(s);
        setSummary(sm);
      })
      .catch((err) => {
        setError(saleError(err));
        setSales([]);
      });
  }, [orgId, season, buyerFilter, fieldFilter, refresh]);

  const lotOptions = useMemo(
    () => (sField ? lots.filter((l) => l.field_id === sField) : lots),
    [lots, sField],
  );

  function resetSaleForm() {
    setSLot("");
    setSQty("");
    setSPrice("");
    setSInvoice("");
    setSNotes("");
    setSPayment("paid");
  }

  async function submitSale(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post(`/api/orgs/${orgId}/sales`, {
        sold_on: soldOn,
        field_id: sField || undefined,
        lot_id: sLot || undefined,
        buyer_id: sBuyer || undefined,
        quantity: sQty ? Number(sQty) : undefined,
        unit: sUnit,
        price_per_unit: sPrice ? Number(sPrice) : undefined,
        currency: "AZN",
        payment_status: sPayment,
        invoice_no: sInvoice || undefined,
        notes: sNotes || undefined,
      });
      resetSaleForm();
      setShowSaleForm(false);
      setRefresh((r) => r + 1);
    } catch (err) {
      setError(saleError(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeSale(id: string) {
    if (!window.confirm("Bu satış qeydi silinsin?")) return;
    setError("");
    try {
      await api.del(`/api/sales/${id}`);
      setRefresh((r) => r + 1);
    } catch (err) {
      setError(saleError(err));
    }
  }

  function editBuyer(b: Buyer) {
    setBEditing(b.id);
    setBName(b.name);
    setBKind(b.kind ?? "");
    setBContact(b.contact_name ?? "");
    setBPhone(b.phone ?? "");
    setBEmail(b.email ?? "");
    setBAddress(b.address ?? "");
    setBRegion(b.region ?? "");
    setBNotes(b.notes ?? "");
    setTab("buyers");
  }

  function resetBuyerForm() {
    setBEditing(null);
    setBName("");
    setBKind("");
    setBContact("");
    setBPhone("");
    setBEmail("");
    setBAddress("");
    setBRegion("");
    setBNotes("");
  }

  async function submitBuyer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const payload = {
      name: bName,
      kind: bKind || undefined,
      contact_name: bContact || undefined,
      phone: bPhone || undefined,
      email: bEmail || undefined,
      address: bAddress || undefined,
      region: bRegion || undefined,
      notes: bNotes || undefined,
    };
    try {
      if (bEditing) await api.put(`/api/buyers/${bEditing}`, payload);
      else await api.post(`/api/orgs/${orgId}/buyers`, payload);
      resetBuyerForm();
      setRefresh((r) => r + 1);
    } catch (err) {
      setError(saleError(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeBuyer(id: string) {
    if (!window.confirm("Bu alıcı silinsin? Satış tarixçəsi qalır, sadəcə alıcı adı boşalır.")) return;
    setError("");
    try {
      await api.del(`/api/buyers/${id}`);
      if (bEditing === id) resetBuyerForm();
      setRefresh((r) => r + 1);
    } catch (err) {
      setError(saleError(err));
    }
  }

  const seasonOptions = summary?.seasons ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Satış və alıcılar</h1>
        {orgs.length > 1 && (
          <select className="input max-w-xs" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
      </div>
      <p className="text-sm text-slate-500">
        Yığımdan satışa qədər tam qeyd: kimə satdınız, nə qədər, hansı qiymətə və pul gəldimi.
      </p>

      <div className="flex gap-2">
        {([
          { key: "sales", label: "Satışlar", Icon: Receipt },
          { key: "buyers", label: "Alıcılar", Icon: Users },
        ] as const).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setTab(s.key)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium ${
              tab === s.key
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            <s.Icon className="h-4 w-4" /> {s.label}
          </button>
        ))}
      </div>

      <ErrorNote message={error} />

      {tab === "sales" ? (
        <>
          {/* filters */}
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Mövsüm">
              <select className="input" value={season} onChange={(e) => setSeason(e.target.value)}>
                <option value="">Hamısı</option>
                {seasonOptions.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Alıcı">
              <select className="input" value={buyerFilter} onChange={(e) => setBuyerFilter(e.target.value)}>
                <option value="">Hamısı</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Sahə">
              <select className="input" value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)}>
                <option value="">Hamısı</option>
                {fieldList.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </FormField>
          </div>

          {/* totals */}
          {summary && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="card">
                <div className="text-xs text-slate-500">Ümumi satış gəliri</div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">{money(summary.totals.revenue)}</div>
                <div className="mt-1 text-xs text-slate-500">{summary.totals.count} satış qeydi</div>
              </div>
              <div className="card">
                <div className="text-xs text-slate-500">Satılan miqdar</div>
                <div className="mt-1 text-2xl font-bold text-slate-800">
                  {Math.round(summary.totals.quantity).toLocaleString("az")}
                </div>
                <div className="mt-1 text-xs text-slate-500">ölçü vahidi qeydə görə</div>
              </div>
              <div className={`card ${summary.outstanding.amount > 0 ? "border-amber-300 bg-amber-50/40" : ""}`}>
                <div className="text-xs text-slate-500">Gözləyən ödəniş</div>
                <div className="mt-1 text-2xl font-bold text-amber-700">{money(summary.outstanding.amount)}</div>
                <div className="mt-1 text-xs text-slate-500">{summary.outstanding.count} qeyd</div>
              </div>
            </div>
          )}

          {/* create */}
          {!showSaleForm ? (
            <button type="button" className="btn-primary" onClick={() => setShowSaleForm(true)}>
              <Plus className="h-4 w-4" /> Yeni satış
            </button>
          ) : (
            <form onSubmit={submitSale} className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Yeni satış</h2>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setShowSaleForm(false);
                    resetSaleForm();
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Satış tarixi" required>
                  <input className="input" type="date" required value={soldOn} onChange={(e) => setSoldOn(e.target.value)} />
                </FormField>
                <FormField label="Alıcı">
                  <select className="input" value={sBuyer} onChange={(e) => setSBuyer(e.target.value)}>
                    <option value="">Seçilməyib</option>
                    {buyers.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Sahə">
                  <select
                    className="input"
                    value={sField}
                    onChange={(e) => {
                      setSField(e.target.value);
                      setSLot("");
                    }}
                  >
                    <option value="">Seçilməyib</option>
                    {fieldList.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Yığım partiyası (izləmə kodu)">
                  <select
                    className="input"
                    value={sLot}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSLot(id);
                      const lot = lots.find((l) => l.id === id);
                      if (lot) {
                        setSField(lot.field_id);
                        setSUnit(lot.unit || "kq");
                        if (!sQty && lot.quantity != null) {
                          const left = lot.quantity - (lot.sold_quantity ?? 0);
                          if (left > 0) setSQty(String(left));
                        }
                      }
                    }}
                  >
                    <option value="">Seçilməyib</option>
                    {lotOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.trace_code} · {l.harvested_on} · {qty(l.quantity, l.unit)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Miqdar">
                  <input className="input" type="number" step="any" min="0" value={sQty} onChange={(e) => setSQty(e.target.value)} />
                </FormField>
                <FormField label="Ölçü vahidi">
                  <select className="input" value={sUnit} onChange={(e) => setSUnit(e.target.value)}>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Qiymət (vahid üçün, ₼)">
                  <input className="input" type="number" step="any" min="0" value={sPrice} onChange={(e) => setSPrice(e.target.value)} />
                </FormField>
                <FormField label="Ödəniş">
                  <select className="input" value={sPayment} onChange={(e) => setSPayment(e.target.value)}>
                    {PAYMENTS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Qaimə / faktura №">
                  <input className="input" value={sInvoice} onChange={(e) => setSInvoice(e.target.value)} />
                </FormField>
              </div>
              <FormField label="Qeyd">
                <textarea className="input h-20" value={sNotes} onChange={(e) => setSNotes(e.target.value)} />
              </FormField>
              <p className="text-xs text-slate-500">
                Məbləğ avtomatik hesablanır: miqdar × qiymət.
                {sQty && sPrice ? ` Təxmini: ${money(Number(sQty) * Number(sPrice))}` : ""}
              </p>
              <button className="btn-primary" type="submit" disabled={busy}>
                <Plus className="h-4 w-4" /> {busy ? "Yadda saxlanılır…" : "Satışı yaz"}
              </button>
            </form>
          )}

          {/* table */}
          {sales === null ? (
            <Spinner />
          ) : sales.length === 0 ? (
            <Placeholder>Hələ satış qeydi yoxdur.</Placeholder>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 text-left font-semibold">Satış tarixi</th>
                    <th className="py-2 text-left font-semibold">Sahə</th>
                    <th className="py-2 text-left font-semibold">Alıcı</th>
                    <th className="py-2 text-right font-semibold">Miqdar</th>
                    <th className="py-2 text-right font-semibold">Qiymət</th>
                    <th className="py-2 text-right font-semibold">Məbləğ</th>
                    <th className="py-2 text-left font-semibold">Ödəniş</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => {
                    const pay = PAYMENTS.find((p) => p.value === s.payment_status);
                    return (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="py-2.5 whitespace-nowrap">{s.sold_on}</td>
                        <td className="py-2.5">
                          <div>{s.field_name ?? "—"}</div>
                          {s.trace_code && (
                            <div className="font-mono text-[11px] text-slate-400">{s.trace_code}</div>
                          )}
                        </td>
                        <td className="py-2.5">{s.buyer_name ?? "—"}</td>
                        <td className="py-2.5 text-right tabular-nums">{qty(s.quantity, s.unit)}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {s.price_per_unit != null ? `${s.price_per_unit} ₼` : "—"}
                        </td>
                        <td className="py-2.5 text-right font-semibold tabular-nums text-emerald-700">{money(s.revenue)}</td>
                        <td className="py-2.5">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${pay?.cls ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                            {pay?.label ?? s.payment_status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            className="btn-ghost min-h-11 text-red-600"
                            aria-label="Satışı sil"
                            onClick={() => removeSale(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* breakdowns */}
          {summary && (summary.by_buyer.length > 0 || summary.by_crop.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.by_buyer.length > 0 && (
                <div className="card">
                  <h2 className="mb-3 text-lg font-semibold text-slate-800">Alıcı üzrə</h2>
                  <ul className="space-y-2">
                    {summary.by_buyer.map((b, i) => {
                      const pct = summary.totals.revenue > 0 ? Math.round((b.revenue / summary.totals.revenue) * 100) : 0;
                      return (
                        <li key={b.buyer_id ?? `b-${i}`}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{b.buyer_name}</span>
                            <span className="tabular-nums text-slate-600">{money(b.revenue)} · {pct}%</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {summary.by_crop.length > 0 && (
                <div className="card">
                  <h2 className="mb-3 text-lg font-semibold text-slate-800">Məhsul üzrə</h2>
                  <ul className="space-y-2">
                    {summary.by_crop.map((c, i) => {
                      const pct = summary.totals.revenue > 0 ? Math.round((c.revenue / summary.totals.revenue) * 100) : 0;
                      return (
                        <li key={c.crop ?? `c-${i}`}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize text-slate-700">{c.crop}</span>
                            <span className="tabular-nums text-slate-600">{money(c.revenue)} · {pct}%</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <form onSubmit={submitBuyer} className="card space-y-3">
            <h2 className="font-semibold text-slate-800">{bEditing ? "Alıcını redaktə et" : "Yeni alıcı"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Ad" required>
                <input className="input" required value={bName} onChange={(e) => setBName(e.target.value)} placeholder="Məsələn: Zaqatala Fındıq MMC" />
              </FormField>
              <FormField label="Növ">
                <select className="input" value={bKind} onChange={(e) => setBKind(e.target.value)}>
                  <option value="">Seçilməyib</option>
                  {BUYER_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Əlaqədar şəxs">
                <input className="input" value={bContact} onChange={(e) => setBContact(e.target.value)} />
              </FormField>
              <FormField label="Telefon">
                <input className="input" type="tel" value={bPhone} onChange={(e) => setBPhone(e.target.value)} />
              </FormField>
              <FormField label="Email">
                <input className="input" type="email" value={bEmail} onChange={(e) => setBEmail(e.target.value)} />
              </FormField>
              <FormField label="Rayon / bölgə">
                <input className="input" value={bRegion} onChange={(e) => setBRegion(e.target.value)} />
              </FormField>
              <FormField label="Ünvan">
                <input className="input" value={bAddress} onChange={(e) => setBAddress(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Qeyd">
              <textarea className="input h-20" value={bNotes} onChange={(e) => setBNotes(e.target.value)} />
            </FormField>
            <div className="flex gap-2">
              <button className="btn-primary" type="submit" disabled={busy}>
                <Plus className="h-4 w-4" /> {busy ? "Yadda saxlanılır…" : bEditing ? "Yadda saxla" : "Alıcı əlavə et"}
              </button>
              {bEditing && (
                <button type="button" className="btn-secondary" onClick={resetBuyerForm}>
                  İmtina
                </button>
              )}
            </div>
          </form>

          {buyers.length === 0 ? (
            <Placeholder>Hələ alıcı yoxdur. Məhsulu kimə satdığınızı bura yazın.</Placeholder>
          ) : (
            <ul className="space-y-2">
              {buyers.map((b) => (
                <li key={b.id} className="card flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-500">
                      {[BUYER_KINDS.find((k) => k.value === b.kind)?.label, b.contact_name, b.phone, b.region]
                        .filter(Boolean)
                        .join(" · ") || "Əlavə məlumat yoxdur"}
                    </p>
                    {b.notes && <p className="mt-1 text-sm text-slate-700">{b.notes}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" className="btn-ghost min-h-11" aria-label="Redaktə et" onClick={() => editBuyer(b)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn-ghost min-h-11 text-red-600" aria-label="Sil" onClick={() => removeBuyer(b.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
