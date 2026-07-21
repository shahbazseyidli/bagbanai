"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Building2,
  Sprout,
  Sparkles,
  Coins,
  CalendarDays,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote, Placeholder, Spinner } from "@/components/ui";
import type {
  AdminOverview,
  AdminUser,
  AdminActivityItem,
  AdminUsageRow,
  AdminBilling,
} from "@/lib/types";

type Tab = "overview" | "users" | "subscriptions" | "activity" | "billing";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Ümumi" },
  { id: "users", label: "İstifadəçilər" },
  { id: "subscriptions", label: "Abunələr" },
  { id: "activity", label: "Aktivlik" },
  { id: "billing", label: "Xərc / Billing" },
];

// Small amounts (AI usage) can be fractions of a cent; show more decimals then.
function formatUSD(n: number | null | undefined): string {
  const v = typeof n === "number" ? n : 0;
  const decimals = Math.abs(v) < 1 ? 6 : 2;
  return `$${v.toFixed(decimals)}`;
}

function formatInt(n: number | null | undefined): string {
  return (typeof n === "number" ? n : 0).toLocaleString("en-US");
}

// Backend sends ISO strings; slice to a compact local-agnostic display.
function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 16).replace("T", " ");
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

const TYPE_STYLES: Record<string, string> = {
  signup: "bg-emerald-50 text-emerald-700 border-emerald-200",
  field: "bg-sky-50 text-sky-700 border-sky-200",
  advice: "bg-violet-50 text-violet-700 border-violet-200",
  chat: "bg-amber-50 text-amber-700 border-amber-200",
  scouting: "bg-orange-50 text-orange-700 border-orange-200",
  task: "bg-slate-100 text-slate-600 border-slate-200",
};

const TYPE_LABELS: Record<string, string> = {
  signup: "Qeydiyyat",
  field: "Sahə",
  advice: "AI məsləhət",
  chat: "AI söhbət",
  scouting: "Skautinq",
  task: "Tapşırıq",
};

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_STYLES[type] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="text-emerald-600">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

// ---- Overview tab ----
function OverviewSection() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<AdminOverview>("/api/admin/overview")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Xəta"));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">AI provayder / model</div>
          <div className="font-semibold text-slate-800">
            {data.provider} · {data.model}
          </div>
        </div>
        <span
          className={`inline-block rounded-md border px-3 py-1 text-sm font-medium ${
            data.ai_configured
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {data.ai_configured ? "AI qoşulub" : "AI qoşulmayıb"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="İstifadəçilər" value={formatInt(data.users)} />
        <StatCard icon={<Building2 className="h-4 w-4" />} label="Təşkilatlar" value={formatInt(data.orgs)} />
        <StatCard icon={<Sprout className="h-4 w-4" />} label="Sahələr" value={formatInt(data.fields)} hint={`${formatInt(data.farms)} ferma`} />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="AI çağırışları"
          value={formatInt(data.ai_calls)}
          hint={`${formatInt(data.advice_count)} məsləhət · ${formatInt(data.chat_count)} söhbət`}
        />
        <StatCard
          icon={<ArrowDownToLine className="h-4 w-4" />}
          label="Giriş tokenləri"
          value={formatInt(data.input_tokens)}
        />
        <StatCard
          icon={<ArrowUpFromLine className="h-4 w-4" />}
          label="Çıxış tokenləri"
          value={formatInt(data.output_tokens)}
        />
        <StatCard icon={<Coins className="h-4 w-4" />} label="Ümumi xərc" value={formatUSD(data.cost_usd)} />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Bu ay xərc" value={formatUSD(data.cost_usd_month)} />
      </div>
    </div>
  );
}

// ---- Users tab ----
function UsersSection() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ users: AdminUser[] }>("/api/admin/users")
      .then((r) => setUsers(r.users))
      .catch((err) => setError(err instanceof Error ? err.message : "Xəta"));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!users) return <Spinner />;
  if (users.length === 0) return <Placeholder>Hələ istifadəçi yoxdur.</Placeholder>;

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2 pr-4">E-poçt</th>
              <th className="py-2 pr-4">Ad</th>
              <th className="py-2 pr-4">Təşkilat</th>
              <th className="py-2 pr-4">Rol</th>
              <th className="py-2 pr-4">Qoşulma</th>
              <th className="py-2 pr-4 text-right">AI çağırışı</th>
              <th className="py-2 pr-4 text-right">Token (giriş/çıxış)</th>
              <th className="py-2 pr-4 text-right">Xərc</th>
              <th className="py-2 pr-4">Son aktivlik</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    {u.email}
                    {u.is_admin && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        admin
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-4 text-slate-600">{u.full_name || "—"}</td>
                <td className="py-2 pr-4 text-slate-600">{u.org_name || "—"}</td>
                <td className="py-2 pr-4 text-slate-500">{u.role || "—"}</td>
                <td className="py-2 pr-4 text-slate-500">{formatDate(u.created_at)}</td>
                <td className="py-2 pr-4 text-right text-slate-700">{formatInt(u.ai_calls)}</td>
                <td className="py-2 pr-4 text-right text-slate-500">
                  {formatInt(u.input_tokens)} / {formatInt(u.output_tokens)}
                </td>
                <td className="py-2 pr-4 text-right font-medium text-slate-800">{formatUSD(u.cost_usd)}</td>
                <td className="py-2 pr-4 text-slate-500">{formatDateTime(u.last_active)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Activity tab ----
function ActivitySection() {
  const [items, setItems] = useState<AdminActivityItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ activity: AdminActivityItem[] }>("/api/admin/activity?limit=60")
      .then((r) => setItems(r.activity))
      .catch((err) => setError(err instanceof Error ? err.message : "Xəta"));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!items) return <Spinner />;
  if (items.length === 0) return <Placeholder>Hələ aktivlik yoxdur.</Placeholder>;

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2 pr-4">Vaxt</th>
              <th className="py-2 pr-4">İstifadəçi</th>
              <th className="py-2 pr-4">Tip</th>
              <th className="py-2">Detal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it, i) => (
              <tr key={`${it.at}-${i}`}>
                <td className="whitespace-nowrap py-2 pr-4 text-slate-500">{formatDateTime(it.at)}</td>
                <td className="py-2 pr-4 text-slate-600">{it.user_email || "—"}</td>
                <td className="py-2 pr-4">
                  <TypeBadge type={it.type} />
                </td>
                <td className="py-2 text-slate-700">{it.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Billing tab ----
function BillingSection() {
  const [billing, setBilling] = useState<AdminBilling | null>(null);
  const [daily, setDaily] = useState<AdminUsageRow[] | null>(null);
  const [byModel, setByModel] = useState<AdminUsageRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [b, d, m] = await Promise.all([
          api.get<AdminBilling>("/api/admin/billing"),
          api.get<{ group: string; rows: AdminUsageRow[] }>("/api/admin/usage?group=day"),
          api.get<{ group: string; rows: AdminUsageRow[] }>("/api/admin/usage?group=model"),
        ]);
        setBilling(b);
        setDaily(d.rows);
        setByModel(m.rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Xəta");
      }
    })();
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!billing || !daily || !byModel) return <Spinner />;

  const chartData = daily.map((r) => ({ day: formatDate(r.day), cost_usd: r.cost_usd }));

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Coins className="h-4 w-4" />} label="Ümumi AI xərci" value={formatUSD(billing.total_cost_usd)} />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Bu ay xərc" value={formatUSD(billing.month_cost_usd)} />
        <StatCard
          icon={<Coins className="h-4 w-4" />}
          label="Təklif olunan hesab"
          value={formatUSD(billing.total_suggested_usd)}
          hint={`markup ×${billing.markup_x}`}
        />
      </div>

      {/* Per-org billing */}
      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-800">Təşkilatlar üzrə</h2>
        {billing.orgs.length === 0 ? (
          <Placeholder>Hələ istifadə yoxdur.</Placeholder>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Təşkilat</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4 text-right">Çağırış</th>
                  <th className="py-2 pr-4 text-right">Token (giriş/çıxış)</th>
                  <th className="py-2 pr-4 text-right">AI xərci</th>
                  <th className="py-2 pr-4 text-right">Təklif olunan hesab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billing.orgs.map((o) => (
                  <tr key={o.org_id}>
                    <td className="py-2 pr-4 text-slate-800">{o.org_name}</td>
                    <td className="py-2 pr-4 text-slate-500">{o.plan}</td>
                    <td className="py-2 pr-4 text-right text-slate-700">{formatInt(o.ai_calls)}</td>
                    <td className="py-2 pr-4 text-right text-slate-500">
                      {formatInt(o.input_tokens)} / {formatInt(o.output_tokens)}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-700">{formatUSD(o.cost_usd)}</td>
                    <td className="py-2 pr-4 text-right font-medium text-slate-800">
                      {formatUSD(o.suggested_charge_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Daily cost chart */}
      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-800">Günlük xərc (son 30 gün)</h2>
        {chartData.length === 0 ? (
          <Placeholder>Məlumat yoxdur.</Placeholder>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 5, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d: string) => (typeof d === "string" ? d.slice(5) : d)}
                />
                <YAxis tick={{ fontSize: 11 }} width={52} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  formatter={(v: number | string) => [
                    typeof v === "number" ? formatUSD(v) : v,
                    "Xərc",
                  ]}
                />
                <Line type="monotone" dataKey="cost_usd" name="Xərc" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* By model */}
      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-800">Model üzrə</h2>
        {byModel.length === 0 ? (
          <Placeholder>Məlumat yoxdur.</Placeholder>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4 text-right">Çağırış</th>
                  <th className="py-2 pr-4 text-right">Token (giriş/çıxış)</th>
                  <th className="py-2 pr-4 text-right">Xərc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byModel.map((r) => (
                  <tr key={r.model}>
                    <td className="py-2 pr-4 text-slate-800">{r.model}</td>
                    <td className="py-2 pr-4 text-right text-slate-700">{formatInt(r.ai_calls)}</td>
                    <td className="py-2 pr-4 text-right text-slate-500">
                      {formatInt(r.input_tokens)} / {formatInt(r.output_tokens)}
                    </td>
                    <td className="py-2 pr-4 text-right font-medium text-slate-800">{formatUSD(r.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Subscriptions tab (admin sets each org's package; billing deferred) ----
interface AdminSub {
  org_id: string;
  name: string;
  owner_email: string | null;
  tier: string;
  label: string;
  fields: number;
  advice_month: number;
  advice_limit: number;
  chat_month: number;
  chat_limit: number;
  valid_until: string | null;
}

const TIER_OPTIONS = [
  { id: "free", label: "Pulsuz" },
  { id: "pro", label: "Pro (10 AZN)" },
  { id: "business", label: "Business (25 AZN)" },
];

function SubscriptionsSection() {
  const [subs, setSubs] = useState<AdminSub[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ subscriptions: AdminSub[] }>("/api/admin/subscriptions");
      setSubs(r?.subscriptions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "xəta");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function setTier(orgId: string, tier: string) {
    setSaving(orgId);
    try {
      await api.put(`/api/admin/subscriptions/${orgId}`, { tier });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "xəta");
    } finally {
      setSaving(null);
    }
  }

  if (error) return <ErrorNote message={error} />;
  if (!subs) return <Spinner />;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Təşkilat</th>
            <th className="px-3 py-2">Sahib</th>
            <th className="px-3 py-2">Sahə</th>
            <th className="px-3 py-2">Bu ay (məsləhət / söhbət)</th>
            <th className="px-3 py-2">Paket</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {subs.map((s) => (
            <tr key={s.org_id}>
              <td className="px-3 py-2 font-medium text-slate-800">{s.name}</td>
              <td className="px-3 py-2 text-slate-500">{s.owner_email ?? "—"}</td>
              <td className="px-3 py-2 tabular-nums">{s.fields}</td>
              <td className="px-3 py-2 tabular-nums text-slate-600">
                {s.advice_month}/{s.advice_limit} · {s.chat_month}/{s.chat_limit}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.tier === "business"
                      ? "bg-violet-100 text-violet-700"
                      : s.tier === "pro"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {s.label}
                </span>
              </td>
              <td className="px-3 py-2">
                <select
                  value={s.tier}
                  disabled={saving === s.org_id}
                  onChange={(e) => setTier(s.org_id, e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                >
                  {TIER_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  const guard = useCallback(() => {
    if (!loading && !user?.is_admin) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    guard();
  }, [guard]);

  if (loading || !user?.is_admin) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin panel</h1>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium ${
              tab === tb.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewSection />}
      {tab === "users" && <UsersSection />}
      {tab === "subscriptions" && <SubscriptionsSection />}
      {tab === "activity" && <ActivitySection />}
      {tab === "billing" && <BillingSection />}
    </div>
  );
}
