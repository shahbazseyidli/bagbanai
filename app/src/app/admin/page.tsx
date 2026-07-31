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
import { api, azError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { ErrorNote, Placeholder, Spinner } from "@/components/ui";
import FieldsOverviewMap, { type GeoField, type FieldScoreLite } from "@/components/FieldsOverviewMap";
import type {
  AdminOverview,
  AdminUser,
  AdminField,
  AdminActivityItem,
  AdminUsageRow,
  AdminBilling,
} from "@/lib/types";

type Tab = "overview" | "users" | "fields" | "subscriptions" | "activity" | "billing";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

// Wellness tone → chip colours (mirrors lib/indexStatus / FieldsOverviewMap bands).
const TONE_CHIP: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warn: "bg-amber-100 text-amber-700 border-amber-200",
  bad: "bg-red-100 text-red-700 border-red-200",
};

function ScoreChip({ score, tone }: { score?: number | null; tone?: string | null }) {
  if (typeof score !== "number") {
    return <span className="text-xs text-slate-400">{t("app.admin.scoreNone")}</span>;
  }
  const key = tone === "good" || tone === "warn" || tone === "bad"
    ? tone
    : score >= 70 ? "good" : score >= 45 ? "warn" : "bad";
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${TONE_CHIP[key]}`}>
      {score}
    </span>
  );
}

// Trigger a browser download of an admin export. The httpOnly auth cookie rides along on the
// same-origin request; a Blob + object URL forces the "save as" without navigating away.
async function downloadExport(kind: "orgs" | "users" | "fields" | "usage") {
  const res = await fetch(`${API_BASE}/api/admin/export?kind=${kind}&format=csv`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = `${kind}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
}

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

function TypeBadge({ type }: { type: string }) {
  const TYPE_LABELS: Record<string, string> = {
    signup: t("app.admin.typeSignup"),
    field: t("app.admin.typeField"),
    advice: t("app.admin.typeAdvice"),
    chat: t("app.admin.typeChat"),
    scouting: t("app.admin.typeScouting"),
    task: t("app.admin.typeTask"),
  };
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

// ---- Export toolbar (CSV downloads) ----
function ExportToolbar() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const KINDS: { id: "orgs" | "users" | "fields" | "usage"; label: string }[] = [
    { id: "orgs", label: t("app.admin.exportOrgs") },
    { id: "users", label: t("app.admin.exportUsers") },
    { id: "fields", label: t("app.admin.exportFields") },
    { id: "usage", label: t("app.admin.exportUsage") },
  ];
  async function run(kind: "orgs" | "users" | "fields" | "usage") {
    setBusy(kind);
    setError("");
    try {
      await downloadExport(kind);
    } catch (e) {
      setError(azError(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="card">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
        <ArrowUpFromLine className="h-4 w-4 text-emerald-600" />
        {t("app.admin.exportHeading")}
      </div>
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            disabled={busy === k.id}
            onClick={() => run(k.id)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {k.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
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
      .catch((err) => setError(azError(err)));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <ExportToolbar />

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">{t("app.admin.aiProviderModel")}</div>
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
          {data.ai_configured ? t("app.admin.aiConnected") : t("app.admin.aiNotConnected")}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label={t("app.admin.statUsers")} value={formatInt(data.users)} />
        <StatCard icon={<Building2 className="h-4 w-4" />} label={t("app.admin.statOrgs")} value={formatInt(data.orgs)} />
        <StatCard icon={<Sprout className="h-4 w-4" />} label={t("app.admin.statFields")} value={formatInt(data.fields)} hint={`${formatInt(data.farms)} ${t("app.admin.farmWord")}`} />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label={t("app.admin.statAiCalls")}
          value={formatInt(data.ai_calls)}
          hint={`${formatInt(data.advice_count)} ${t("app.admin.adviceWord")} · ${formatInt(data.chat_count)} ${t("app.admin.chatWord")}`}
        />
        <StatCard
          icon={<ArrowDownToLine className="h-4 w-4" />}
          label={t("app.admin.statInputTokens")}
          value={formatInt(data.input_tokens)}
        />
        <StatCard
          icon={<ArrowUpFromLine className="h-4 w-4" />}
          label={t("app.admin.statOutputTokens")}
          value={formatInt(data.output_tokens)}
        />
        <StatCard icon={<Coins className="h-4 w-4" />} label={t("app.admin.statTotalCost")} value={formatUSD(data.cost_usd)} />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label={t("app.admin.statMonthCost")} value={formatUSD(data.cost_usd_month)} />
      </div>
    </div>
  );
}

// ---- Users tab ----
function ActionButton({
  label,
  onClick,
  busy,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  variant?: "default" | "danger";
}) {
  const cls =
    variant === "danger"
      ? "border-red-200 text-red-700 hover:bg-red-50"
      : "border-slate-300 text-slate-700 hover:bg-slate-50";
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50 ${cls}`}
    >
      {label}
    </button>
  );
}

function UsersSection({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ users: AdminUser[] }>("/api/admin/users");
      setUsers(r.users);
    } catch (e) {
      setError(azError(e));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Partial<AdminUser>) {
    setBusy(id);
    setError("");
    try {
      await api.patch(`/api/admin/users/${id}`, body);
      await load();
    } catch (e) {
      setError(azError(e));
    } finally {
      setBusy(null);
    }
  }

  if (error && !users) return <ErrorNote message={error} />;
  if (!users) return <Spinner />;
  if (users.length === 0) return <Placeholder>{t("app.admin.usersEmpty")}</Placeholder>;

  return (
    <div className="card">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2 pr-4">{t("app.admin.colEmail")}</th>
              <th className="py-2 pr-4">{t("app.admin.colName")}</th>
              <th className="py-2 pr-4">{t("app.admin.colOrg")}</th>
              <th className="py-2 pr-4">{t("app.admin.colRole")}</th>
              <th className="py-2 pr-4 text-right">{t("app.admin.cost")}</th>
              <th className="py-2 pr-4">{t("app.admin.colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2 pr-4">
                  <div className="flex flex-wrap items-center gap-1.5 text-slate-800">
                    {u.email}
                    {u.is_admin && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {t("app.admin.adminBadge")}
                      </span>
                    )}
                    {!u.is_active && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        {t("app.admin.badgeInactive")}
                      </span>
                    )}
                    {!u.email_verified && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        {t("app.admin.badgeUnverified")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-4 text-slate-600">{u.full_name || "—"}</td>
                <td className="py-2 pr-4 text-slate-600">{u.org_name || "—"}</td>
                <td className="py-2 pr-4 text-slate-500">{u.role || "—"}</td>
                <td className="py-2 pr-4 text-right font-medium text-slate-800">{formatUSD(u.cost_usd)}</td>
                <td className="py-2 pr-4">
                  <div className="flex flex-wrap gap-1.5">
                    {u.is_active ? (
                      <ActionButton
                        label={t("app.admin.actDeactivate")}
                        busy={busy === u.id}
                        variant="danger"
                        onClick={() => {
                          if (window.confirm(t("app.admin.confirmDeactivate")))
                            patch(u.id, { is_active: false });
                        }}
                      />
                    ) : (
                      <ActionButton
                        label={t("app.admin.actActivate")}
                        busy={busy === u.id}
                        onClick={() => patch(u.id, { is_active: true })}
                      />
                    )}
                    {u.is_admin ? (
                      <ActionButton
                        label={t("app.admin.actRemoveAdmin")}
                        busy={busy === u.id || u.id === currentUserId}
                        variant="danger"
                        onClick={() => {
                          if (window.confirm(t("app.admin.confirmRemoveAdmin")))
                            patch(u.id, { is_admin: false });
                        }}
                      />
                    ) : (
                      <ActionButton
                        label={t("app.admin.actMakeAdmin")}
                        busy={busy === u.id}
                        onClick={() => patch(u.id, { is_admin: true })}
                      />
                    )}
                    {!u.email_verified && (
                      <ActionButton
                        label={t("app.admin.actVerifyEmail")}
                        busy={busy === u.id}
                        onClick={() => patch(u.id, { email_verified: true })}
                      />
                    )}
                  </div>
                </td>
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
      .catch((err) => setError(azError(err)));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!items) return <Spinner />;
  if (items.length === 0) return <Placeholder>{t("app.admin.activityEmpty")}</Placeholder>;

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2 pr-4">{t("app.admin.colTime")}</th>
              <th className="py-2 pr-4">{t("app.admin.colUser")}</th>
              <th className="py-2 pr-4">{t("app.admin.colType")}</th>
              <th className="py-2">{t("app.admin.colDetail")}</th>
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
        setError(azError(err));
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
        <StatCard icon={<Coins className="h-4 w-4" />} label={t("app.admin.statTotalAiCost")} value={formatUSD(billing.total_cost_usd)} />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label={t("app.admin.statMonthCost")} value={formatUSD(billing.month_cost_usd)} />
        <StatCard
          icon={<Coins className="h-4 w-4" />}
          label={t("app.admin.statSuggestedCharge")}
          value={formatUSD(billing.total_suggested_usd)}
          hint={`markup ×${billing.markup_x}`}
        />
      </div>

      {/* Per-org billing */}
      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-800">{t("app.admin.perOrgHeading")}</h2>
        {billing.orgs.length === 0 ? (
          <Placeholder>{t("app.admin.noUsageYet")}</Placeholder>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-4">{t("app.admin.colOrg")}</th>
                  <th className="py-2 pr-4">{t("app.admin.colPlan")}</th>
                  <th className="py-2 pr-4 text-right">{t("app.admin.colCalls")}</th>
                  <th className="py-2 pr-4 text-right">{t("app.admin.colTokens")}</th>
                  <th className="py-2 pr-4 text-right">{t("app.admin.colAiCost")}</th>
                  <th className="py-2 pr-4 text-right">{t("app.admin.colSuggestedCharge")}</th>
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
        <h2 className="mb-3 font-semibold text-slate-800">{t("app.admin.dailyCostHeading")}</h2>
        {chartData.length === 0 ? (
          <Placeholder>{t("app.admin.noData")}</Placeholder>
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
                    t("app.admin.cost"),
                  ]}
                />
                <Line type="monotone" dataKey="cost_usd" name={t("app.admin.cost")} stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* By model */}
      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-800">{t("app.admin.byModelHeading")}</h2>
        {byModel.length === 0 ? (
          <Placeholder>{t("app.admin.noData")}</Placeholder>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-4">{t("app.admin.colModel")}</th>
                  <th className="py-2 pr-4 text-right">{t("app.admin.colCalls")}</th>
                  <th className="py-2 pr-4 text-right">{t("app.admin.colTokens")}</th>
                  <th className="py-2 pr-4 text-right">{t("app.admin.cost")}</th>
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

// ---- Fields tab (every field across all orgs — list + map) ----
interface AdminFieldDetail {
  id: string;
  name: string;
  org_name?: string | null;
  owner_email?: string | null;
  crop_type?: string | null;
  variety?: string | null;
  planting_date?: string | null;
  growth_stage?: string | null;
  area_ha: number | null;
  data_status?: string | null;
  wellness_score?: number | null;
  wellness_tone?: string | null;
  wellness_headline?: string | null;
  scene_count: number;
  advice?: { summary?: string | null; generated_at?: string | null } | null;
  indices: { index_name: string; mean: number | null; p50: number | null; acquired_at: string | null }[];
}

function FieldDetailModal({ fieldId, onClose }: { fieldId: string; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<AdminFieldDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<AdminFieldDetail>(`/api/admin/fields/${fieldId}`)
      .then(setData)
      .catch((e) => setError(azError(e)));
  }, [fieldId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{t("app.admin.fdTitle")}</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            {t("app.admin.fdClose")}
          </button>
        </div>
        {error && <ErrorNote message={error} />}
        {!data && !error && <Spinner />}
        {data && (
          <div className="space-y-3 text-sm">
            <div className="text-xl font-semibold text-slate-900">{data.name}</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-600">
              <dt className="text-slate-400">{t("app.admin.colOrg")}</dt>
              <dd>{data.org_name || "—"}</dd>
              <dt className="text-slate-400">{t("app.admin.fdOwner")}</dt>
              <dd>{data.owner_email || "—"}</dd>
              <dt className="text-slate-400">{t("app.admin.fdCrop")}</dt>
              <dd>{data.crop_type || "—"}</dd>
              <dt className="text-slate-400">{t("app.admin.fdArea")}</dt>
              <dd>{data.area_ha != null ? `${data.area_ha} ha` : "—"}</dd>
              <dt className="text-slate-400">{t("app.admin.fdStatus")}</dt>
              <dd>{data.data_status || "—"}</dd>
              <dt className="text-slate-400">{t("app.admin.fdScore")}</dt>
              <dd>
                <ScoreChip score={data.wellness_score} tone={data.wellness_tone} />
              </dd>
              <dt className="text-slate-400">{t("app.admin.fdScenes")}</dt>
              <dd>{formatInt(data.scene_count)}</dd>
            </dl>

            <div>
              <div className="mb-1 font-semibold text-slate-800">{t("app.admin.fdAdvice")}</div>
              {data.advice?.summary ? (
                <p className="text-slate-600">{data.advice.summary}</p>
              ) : (
                <p className="text-slate-400">{t("app.admin.fdNoAdvice")}</p>
              )}
            </div>

            {data.indices.length > 0 && (
              <div>
                <div className="mb-1 font-semibold text-slate-800">{t("app.admin.fdIndices")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.indices.map((ix) => (
                    <span
                      key={ix.index_name}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {ix.index_name}: {ix.mean != null ? ix.mean.toFixed(2) : "—"}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => router.push(`/fields/${data.id}`)}
              className="mt-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t("app.admin.fdOpenFull")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// The demo flag is admin-only plumbing, so it is declared here rather than widened into the shared
// AdminField contract that every other consumer of /api/admin/fields reads.
type AdminFieldRow = AdminField & { is_demo?: boolean };

function FieldsSection() {
  const [fields, setFields] = useState<AdminFieldRow[] | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ fields: AdminFieldRow[] }>("/api/admin/fields")
      .then((r) => setFields(r.fields))
      .catch((e) => setError(azError(e)));
  }, []);

  // Exactly one field can be the public /demo field, so promoting one clears every other row here
  // too — the backend does the same inside one transaction.
  async function toggleDemo(id: string, next: boolean) {
    setDemoBusy(id);
    try {
      await api.patch(`/api/admin/fields/${id}`, { is_demo: next });
      setFields((prev) =>
        prev ? prev.map((f) => ({ ...f, is_demo: next && f.id === id })) : prev);
    } catch (e) {
      setError(azError(e));
    } finally {
      setDemoBusy(null);
    }
  }

  if (error) return <ErrorNote message={error} />;
  if (!fields) return <Spinner />;
  if (fields.length === 0) return <Placeholder>{t("app.admin.fieldsEmpty")}</Placeholder>;

  const geoFields: GeoField[] = fields.map((f) => ({
    id: f.id,
    name: f.name,
    area_ha: f.area_ha,
    data_status: f.data_status ?? undefined,
    geom: f.geom,
  }));
  const scores: Record<string, FieldScoreLite> = {};
  for (const f of fields) {
    if (typeof f.wellness_score === "number") {
      scores[f.id] = { field_id: f.id, score: f.wellness_score, tone: f.wellness_tone };
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
            view === "list"
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {t("app.admin.viewList")}
        </button>
        <button
          type="button"
          onClick={() => setView("map")}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
            view === "map"
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {t("app.admin.viewMap")}
        </button>
        <span className="ml-auto text-sm text-slate-400">{formatInt(fields.length)}</span>
      </div>

      {view === "map" ? (
        <div className="h-[70vh]">
          <FieldsOverviewMap fields={geoFields} scores={scores} heightClass="h-full" />
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-4">{t("app.admin.colOrg")}</th>
                  <th className="py-2 pr-4">{t("app.admin.colOwner")}</th>
                  <th className="py-2 pr-4">{t("app.admin.colName")}</th>
                  <th className="py-2 pr-4 text-right">{t("app.admin.colArea")}</th>
                  <th className="py-2 pr-4">{t("app.admin.colCrop")}</th>
                  <th className="py-2 pr-4">{t("app.admin.colScore")}</th>
                  <th className="py-2 pr-4">{t("app.admin.colStatus")}</th>
                  {/* Untranslated on purpose: "Demo" is the same word in all eight locales and this
                      is an internal admin surface, so it needs no dictionary entry. */}
                  <th className="py-2 pr-4">Demo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => setDetailId(f.id)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="py-2 pr-4 text-slate-600">{f.org_name || "—"}</td>
                    <td className="py-2 pr-4 text-slate-500">{f.owner_email || "—"}</td>
                    <td className="py-2 pr-4 font-medium text-slate-800">{f.name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-600">
                      {f.area_ha != null ? f.area_ha : "—"}
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{f.crop_type || "—"}</td>
                    <td className="py-2 pr-4">
                      <ScoreChip score={f.wellness_score} tone={f.wellness_tone} />
                    </td>
                    <td className="py-2 pr-4 text-slate-500">{f.data_status || "—"}</td>
                    <td className="py-2 pr-4">
                      <button
                        type="button"
                        disabled={demoBusy === f.id}
                        // The row itself opens the detail modal; the toggle must not do both.
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleDemo(f.id, !f.is_demo);
                        }}
                        className={`rounded-md border px-2 py-0.5 text-xs font-semibold disabled:opacity-50 ${
                          f.is_demo
                            ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                            : "border-slate-300 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {f.is_demo ? "/demo ✓" : "/demo"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailId && <FieldDetailModal fieldId={detailId} onClose={() => setDetailId(null)} />}
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

function SubscriptionsSection() {
  const TIER_OPTIONS = [
    { id: "free", label: t("app.admin.tierFree") },
    { id: "pro", label: t("app.admin.tierPro") },
    { id: "business", label: t("app.admin.tierBusiness") },
  ];
  const [subs, setSubs] = useState<AdminSub[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ subscriptions: AdminSub[] }>("/api/admin/subscriptions");
      setSubs(r?.subscriptions ?? []);
    } catch (e) {
      setError(azError(e));
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
      setError(azError(e));
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
            <th className="px-3 py-2">{t("app.admin.colOrg")}</th>
            <th className="px-3 py-2">{t("app.admin.colOwner")}</th>
            <th className="px-3 py-2">{t("app.admin.colField")}</th>
            <th className="px-3 py-2">{t("app.admin.colMonthUsage")}</th>
            <th className="px-3 py-2">{t("app.admin.colPackage")}</th>
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

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: t("app.admin.tabOverview") },
    { id: "users", label: t("app.admin.tabUsers") },
    { id: "fields", label: t("app.admin.tabFields") },
    { id: "subscriptions", label: t("app.admin.tabSubscriptions") },
    { id: "activity", label: t("app.admin.tabActivity") },
    { id: "billing", label: t("app.admin.tabBilling") },
  ];

  const guard = useCallback(() => {
    if (!loading && !user?.is_admin) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    guard();
  }, [guard]);

  if (loading || !user?.is_admin) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("app.admin.title")}</h1>

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
      {tab === "users" && <UsersSection currentUserId={user.id} />}
      {tab === "fields" && <FieldsSection />}
      {tab === "subscriptions" && <SubscriptionsSection />}
      {tab === "activity" && <ActivitySection />}
      {tab === "billing" && <BillingSection />}
    </div>
  );
}
