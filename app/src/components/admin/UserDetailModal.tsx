"use client";

// One account, everything about it, in a drawer over the admin users table.
//
// WHY A DRAWER AND NOT A PAGE. The admin's job here is comparing and acting across a list — open a
// row, change something, close it, open the next. A route would lose the list's scroll position and
// filters on every glance. Same reason FieldDetailModal in app/admin/page.tsx is a modal.
//
// READ FIRST, ACT SECOND. Everything above the "Danger zone" is either a fact or a reversible
// toggle. The one irreversible action sits at the bottom, behind the target's own address typed by
// hand, and refuses in three cases before it will even ask — see the endpoint's docstring.
//
// The delete here is the SAME anonymisation the account owner's own "close my account" runs
// (routers/auth.py::anonymise_account, imported by the admin router). It does not DELETE the row:
// fifteen tables reference users with ON DELETE NO ACTION, so the person is erased and the records
// they authored survive, unattached. The copy says so, because "delete" would be a lie about what
// the button does.
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api, azError } from "@/lib/api";
import type { Polygon } from "@/lib/types";
import { ErrorNote, Spinner } from "@/components/ui";
import { t, tf } from "@/lib/i18n";

// Dynamic + ssr:false because MapLibre touches `window` at import time, and this drawer is rendered
// from a client page that Next still prerenders. The map is also the one piece here that costs real
// bytes — an admin who never opens a user should not pay for it.
const FieldsOverviewMap = dynamic(() => import("@/components/FieldsOverviewMap"), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse rounded-lg bg-slate-100" />,
});

export interface AdminUserDetail {
  user: {
    id: string; email: string; full_name: string | null; phone: string | null;
    locale: string | null; role: string | null; country: string | null; region: string | null;
    is_admin: boolean; is_active: boolean; email_verified: boolean; email_lifecycle: boolean;
    area_unit: string | null; name_public: boolean | null;
    created_at: string | null; last_seen_at: string | null; deleted_at: string | null;
    onboarding: unknown; has_password: boolean; has_google: boolean;
  };
  orgs: { id: string; name: string; role: string | null; status: string | null; is_owner: boolean;
          members: number; tier: string; valid_until: string | null }[];
  fields: { id: string; name: string; area_ha: number | null; farm_name: string | null;
            org_name: string | null; crop_type: string | null; crop_cycle: string | null;
            region: string | null; data_status: string | null; scenes: number;
            last_scene: string | null; score: number | null; tone: string | null;
            deleted: boolean; created_at: string | null;
            drawn_by_them: boolean; geom: Polygon | null;
            lon: number | null; lat: number | null }[];
  usage: { calls: number; input_tokens: number; output_tokens: number; cost_usd: number;
           last_used: string | null; by_kind: { kind: string; calls: number; cost_usd: number }[] };
  events: { type: string; at: string }[];
  channels: { channel: string; verified: boolean; opt_in: boolean }[];
  push_devices: number;
  blocks_close: boolean;
  auth: {
    logins: number; failed: number; logouts: number; distinct_ips: number;
    first_at: string | null; last_at: string | null;
    events: { event: string; method: string | null; ip: string | null;
              user_agent: string | null; detail: string | null; at: string }[];
    magic_links: { issued: string; expires: string | null; used: string | null }[];
  };
  advice: { at: string; lang: string | null; field: string; summary: string }[];
  chat: { role: string; content: string; at: string }[];
  notifications: {
    total: number; unread: number; critical: number; last_at: string | null;
    recent: { severity: string | null; type: string | null; title: string | null;
              read: boolean; at: string }[];
  };
  emails: { template: string; dedup: string | null; status: string;
            locale: string | null; at: string }[];
  scouting: { category: string | null; severity: string | null; note: string | null;
              field: string; status: string | null; at: string }[];
  seasons: { year: number; crop: string | null; status: string | null; field: string;
             planted: string | null; harvested: string | null }[];
  shares: { label: string | null; scope: string | null; views: number; field: string;
            at: string; revoked: string | null; expires: string | null }[];
  grants_out: { field: string; who: string; at: string; revoked: string | null }[];
  grants_in: { field: string; who: string | null; at: string; revoked: string | null }[];
  alerts: { total: number; open: number; resolved: number };
}

const d = (iso?: string | null) => (iso ? iso.slice(0, 10) : "—");
const dt = (iso?: string | null) => (iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : "—");
const usd = (n: number) => `$${(n ?? 0).toFixed(n < 1 ? 4 : 2)}`;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 text-sm last:border-0">
      <span className="shrink-0 text-slate-500">{k}</span>
      <span className="text-right font-medium text-slate-800">{v}</span>
    </div>
  );
}

/** A dense list section. Everything below the map is "N rows of a thing", and writing nine
 *  bespoke tables would be nine places for the empty state to be forgotten. */
function Mini({ title, rows, empty }: {
  title: string;
  rows: { k: React.ReactNode; v: React.ReactNode }[];
  empty: string;
}) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="max-h-56 overflow-y-auto">
          {rows.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-3 border-b border-slate-100 py-1 text-xs last:border-0">
              <span className="min-w-0 flex-1 text-slate-700">{r.k}</span>
              <span className="shrink-0 text-right text-slate-400">{r.v}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Chip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}

export default function UserDetailModal({
  userId,
  currentUserId,
  onClose,
  onChanged,
}: {
  userId: string;
  currentUserId: string;
  onClose: () => void;
  /** Refresh the list behind the drawer — an edit here changes a row there. */
  onChanged: () => void;
}) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [form, setForm] = useState<{ full_name: string; locale: string; role: string;
                                     country: string; region: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<AdminUserDetail>(`/api/admin/users/${userId}`);
      setData(r);
      setForm({
        full_name: r.user.full_name ?? "",
        locale: r.user.locale ?? "",
        role: r.user.role ?? "",
        country: r.user.country ?? "",
        region: r.user.region ?? "",
      });
    } catch (e) {
      setError(azError(e));
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/api/admin/users/${userId}`, body);
      await load();
      onChanged();
    } catch (e) {
      setError(azError(e));
    } finally {
      setBusy(false);
    }
  }

  async function closeAccount() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/admin/users/${userId}/close`, { email: confirmEmail.trim() });
      onChanged();
      onClose();
    } catch (e) {
      // The endpoint's three refusals each get their own sentence — "forbidden" would leave the
      // admin guessing which of them fired.
      const m = String((e as { message?: string })?.message || "");
      const key = ["cannot_delete_self", "demote_admin_first", "transfer_ownership_first",
                   "confirm_email_mismatch"].find((k) => m.includes(k));
      setError(key ? t(`app.admin.ud.err.${key}` as never) : azError(e));
    } finally {
      setBusy(false);
    }
  }

  const u = data?.user;
  const isSelf = userId === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
         onClick={onClose}>
      <div className="my-6 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900">
              {u?.full_name || u?.email || t("app.admin.ud.title")}
            </h2>
            {u && <p className="truncate text-sm text-slate-500">{u.email}</p>}
          </div>
          <button type="button" onClick={onClose}
                  className="shrink-0 text-sm text-slate-500 hover:text-slate-700">
            {t("app.admin.fdClose")}
          </button>
        </div>

        {error && <ErrorNote message={error} />}
        {!data || !u || !form ? (
          <Spinner />
        ) : (
          <div className="space-y-5">
            {u.deleted_at && (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
                {tf("app.admin.ud.closedOn", { date: d(u.deleted_at) })}
              </p>
            )}

            {/* ---- identity + how they get in ---- */}
            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("app.admin.ud.secProfile")}
              </h3>
              <div className="flex flex-wrap gap-1.5 pb-2">
                <Chip on={u.is_active} label={t("app.admin.ud.chipActive")} />
                <Chip on={u.email_verified} label={t("app.admin.ud.chipVerified")} />
                <Chip on={u.is_admin} label={t("app.admin.adminBadge")} />
                {/* The three ways in. An account with none of them can still arrive by magic link,
                    which is exactly what someone reporting a lockout needs us to see. */}
                <Chip on={u.has_password} label={t("app.admin.ud.chipPassword")} />
                <Chip on={u.has_google} label="Google" />
              </div>
              <Row k={t("app.admin.ud.created")} v={d(u.created_at)} />
              <Row k={t("app.admin.ud.lastSeen")} v={dt(u.last_seen_at)} />
              <Row k={t("app.admin.ud.phone")} v={u.phone || "—"} />
              <Row k={t("app.admin.ud.areaUnit")} v={u.area_unit || t("app.admin.ud.auto")} />
              <Row k={t("app.admin.ud.digest")}
                   v={u.email_lifecycle ? t("app.admin.ud.on") : t("app.admin.ud.off")} />
              <Row k={t("app.admin.ud.pushDevices")} v={String(data.push_devices)} />
              {data.channels.length > 0 && (
                <Row k={t("app.admin.ud.channels")}
                     v={data.channels.map((c) => `${c.channel}${c.verified ? " ✓" : ""}`).join(", ")} />
              )}
            </section>

            {/* ---- editable ---- */}
            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("app.admin.ud.secEdit")}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["full_name", t("app.admin.colName")],
                  ["locale", t("app.admin.ud.locale")],
                  ["role", t("app.admin.colRole")],
                  ["country", t("app.admin.ud.country")],
                  ["region", t("app.admin.ud.region")],
                ] as const).map(([k, label]) => (
                  <label key={k} className="block">
                    <span className="mb-0.5 block text-xs text-slate-500">{label}</span>
                    <input
                      className="input"
                      value={form[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              {/* Email is absent on purpose: it is the login identity and 0059's unique key, and a
                  password field would let an admin impersonate. Both are stated in the endpoint. */}
              <p className="mt-1.5 text-[11px] text-slate-400">{t("app.admin.ud.editNote")}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void patch(form)}
                className="btn-primary mt-2 disabled:opacity-50"
              >
                {busy ? t("common.saving") : t("common.save")}
              </button>
            </section>

            {/* ---- orgs ---- */}
            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("app.admin.ud.secOrgs")}
              </h3>
              {data.orgs.length === 0 ? (
                <p className="text-sm text-slate-500">{t("app.admin.ud.noOrgs")}</p>
              ) : (
                data.orgs.map((o) => (
                  <Row
                    key={o.id}
                    k={`${o.name}${o.is_owner ? " ★" : ""}`}
                    v={`${o.role ?? "—"} · ${o.members} · ${o.tier}`}
                  />
                ))
              )}
            </section>

            {/* ---- fields ---- */}
            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                {tf("app.admin.ud.secFields", { n: data.fields.length })}
              </h3>
              {/* The boundaries themselves, not a list of names. "Which area did they add" is a
                  question about shape and place, and a table of hectares cannot answer it.
                  Soft-deleted fields are excluded from the map (they would draw as live ground)
                  but stay in the table below, greyed. */}
              {data.fields.some((f) => !f.deleted && f.geom) && (
                <div className="mb-2 h-64 overflow-hidden rounded-lg border border-slate-200">
                  <FieldsOverviewMap
                    fields={data.fields
                      .filter((f) => !f.deleted && f.geom)
                      .map((f) => ({ id: f.id, name: f.name, area_ha: f.area_ha,
                                     data_status: f.data_status ?? undefined, geom: f.geom }))}
                    heightClass="h-full"
                  />
                </div>
              )}
              {data.fields.length === 0 ? (
                <p className="text-sm text-slate-500">{t("app.admin.ud.noFields")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-1 pr-3">{t("app.admin.ud.fName")}</th>
                        <th className="py-1 pr-3">ha</th>
                        <th className="py-1 pr-3">{t("app.admin.ud.fCrop")}</th>
                        <th className="py-1 pr-3">{t("app.admin.ud.fStatus")}</th>
                        <th className="py-1 pr-3 text-right">{t("app.admin.ud.fScenes")}</th>
                        <th className="py-1 pr-3">{t("app.admin.ud.fLastScene")}</th>
                        <th className="py-1 pr-3 text-right">{t("app.admin.ud.fScore")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.fields.map((f) => (
                        <tr key={f.id} className={f.deleted ? "opacity-45" : ""}>
                          <td className="py-1 pr-3">
                            <a
                              href={`/fields/${f.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-emerald-700 hover:underline"
                            >
                              {f.name}
                            </a>
                            {f.deleted && (
                              <span className="ml-1 text-[10px] text-red-600">
                                {t("app.admin.ud.fDeleted")}
                              </span>
                            )}
                            {/* Membership is not authorship — this star says THIS person drew it. */}
                            {f.drawn_by_them && (
                              <span className="ml-1 text-[10px] text-emerald-700" title={t("app.admin.ud.fDrawn")}>
                                ★
                              </span>
                            )}
                            <span className="block text-[10px] text-slate-400">
                              {[f.farm_name, f.region].filter(Boolean).join(" · ") || "—"}
                            </span>
                          </td>
                          <td className="py-1 pr-3">{f.area_ha?.toFixed(2) ?? "—"}</td>
                          <td className="py-1 pr-3">{f.crop_type || "—"}</td>
                          <td className="py-1 pr-3">{f.data_status || "—"}</td>
                          <td className="py-1 pr-3 text-right">{f.scenes}</td>
                          <td className="py-1 pr-3">{d(f.last_scene)}</td>
                          <td className="py-1 pr-3 text-right">{f.score ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ---- alerts standing on their fields ---- */}
            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("app.admin.ud.secAlerts")}
              </h3>
              <Row k={t("app.admin.ud.alOpen")}
                   v={<span className={data.alerts.open > 0 ? "font-semibold text-amber-700" : ""}>
                        {data.alerts.open}
                      </span>} />
              <Row k={t("app.admin.ud.alResolved")} v={String(data.alerts.resolved)} />
              <Row k={t("app.admin.ud.alTotal")} v={String(data.alerts.total)} />
            </section>

            {/* ---- sign-in audit ---- */}
            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("app.admin.ud.secAuth")}
              </h3>
              <Row k={t("app.admin.ud.aLogins")} v={String(data.auth.logins)} />
              <Row k={t("app.admin.ud.aFailed")}
                   v={<span className={data.auth.failed > 0 ? "text-red-600" : ""}>
                        {data.auth.failed}
                      </span>} />
              <Row k={t("app.admin.ud.aLogouts")} v={String(data.auth.logouts)} />
              <Row k={t("app.admin.ud.aIps")} v={String(data.auth.distinct_ips)} />
              <Row k={t("app.admin.ud.aLast")} v={dt(data.auth.last_at)} />
              {data.auth.events.length === 0 ? (
                // The audit starts the day it shipped; an account with no rows is not an account
                // that never signed in, and saying so stops the empty table reading as a fact.
                <p className="mt-1 text-xs text-slate-400">{t("app.admin.ud.aEmpty")}</p>
              ) : (
                <div className="mt-1.5 max-h-56 overflow-y-auto">
                  {data.auth.events.map((e, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 border-b border-slate-100 py-1 text-xs last:border-0">
                      <span className="min-w-0 flex-1">
                        <span className={e.event === "login_failed" ? "font-semibold text-red-600" : "text-slate-700"}>
                          {e.event}
                        </span>
                        {e.method && <span className="text-slate-400"> · {e.method}</span>}
                        {e.detail && <span className="text-red-500"> · {e.detail}</span>}
                        <span className="block truncate text-[10px] text-slate-400">
                          {[e.ip, e.user_agent].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                      <span className="shrink-0 text-slate-400">{dt(e.at)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Mini
                title={t("app.admin.ud.aMagic")}
                empty={t("app.admin.ud.noneYet")}
                rows={data.auth.magic_links.map((m) => ({
                  k: m.used ? t("app.admin.ud.aUsed") : t("app.admin.ud.aUnused"),
                  v: `${dt(m.issued)}${m.used ? " → " + dt(m.used) : ""}`,
                }))}
              />
            </section>

            {/* ---- records they authored, and what we sent them ---- */}
            <Mini
              title={t("app.admin.ud.secAdvice")}
              empty={t("app.admin.ud.noneYet")}
              rows={data.advice.map((a) => ({
                k: <><b>{a.field}</b>{a.lang ? ` · ${a.lang}` : ""} — {a.summary}</>,
                v: d(a.at),
              }))}
            />
            <Mini
              title={t("app.admin.ud.secChat")}
              empty={t("app.admin.ud.noneYet")}
              rows={data.chat.map((c) => ({
                k: <><span className="text-slate-400">{c.role}:</span> {c.content}</>,
                v: dt(c.at),
              }))}
            />
            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("app.admin.ud.secNotif")}
              </h3>
              <Row k={t("app.admin.ud.nTotal")}
                   v={`${data.notifications.total} · ${data.notifications.unread} ${t("app.admin.ud.nUnread")}`} />
              <Row k={t("app.admin.ud.nCritical")} v={String(data.notifications.critical)} />
              <div className="mt-1 max-h-40 overflow-y-auto">
                {data.notifications.recent.map((n, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 border-b border-slate-100 py-1 text-xs last:border-0">
                    <span className={`min-w-0 flex-1 ${n.read ? "text-slate-500" : "font-medium text-slate-800"}`}>
                      {n.severity === "critical" && <span className="text-red-600">● </span>}
                      {n.title || n.type}
                    </span>
                    <span className="shrink-0 text-slate-400">{d(n.at)}</span>
                  </div>
                ))}
              </div>
            </section>
            <Mini
              title={t("app.admin.ud.secEmails")}
              empty={t("app.admin.ud.noneYet")}
              rows={data.emails.map((e) => ({
                k: <>{e.template}{e.dedup ? <span className="text-slate-400"> · {e.dedup}</span> : null}
                   {e.status !== "sent" && <span className="text-amber-600"> · {e.status}</span>}</>,
                v: `${e.locale ?? ""} ${d(e.at)}`,
              }))}
            />
            <Mini
              title={t("app.admin.ud.secScouting")}
              empty={t("app.admin.ud.noneYet")}
              rows={data.scouting.map((sc) => ({
                k: <><b>{sc.field}</b> · {sc.category}{sc.severity ? ` (${sc.severity})` : ""} — {sc.note}</>,
                v: d(sc.at),
              }))}
            />
            <Mini
              title={t("app.admin.ud.secSeasons")}
              empty={t("app.admin.ud.noneYet")}
              rows={data.seasons.map((se) => ({
                k: <><b>{se.field}</b> · {se.year} · {se.crop ?? "—"} ({se.status})</>,
                v: se.harvested ? d(se.harvested) : d(se.planted),
              }))}
            />
            <Mini
              title={t("app.admin.ud.secShares")}
              empty={t("app.admin.ud.noneYet")}
              rows={data.shares.map((sh) => ({
                k: <><b>{sh.field}</b>{sh.label ? ` · ${sh.label}` : ""}
                   {sh.revoked && <span className="text-red-500"> · {t("app.admin.ud.revoked")}</span>}</>,
                v: `${sh.views} ${t("app.admin.ud.views")} · ${d(sh.at)}`,
              }))}
            />
            <Mini
              title={t("app.admin.ud.secGrantsOut")}
              empty={t("app.admin.ud.noneYet")}
              rows={data.grants_out.map((g) => ({
                k: <><b>{g.field}</b> → {g.who}
                   {g.revoked && <span className="text-red-500"> · {t("app.admin.ud.revoked")}</span>}</>,
                v: d(g.at),
              }))}
            />
            <Mini
              title={t("app.admin.ud.secGrantsIn")}
              empty={t("app.admin.ud.noneYet")}
              rows={data.grants_in.map((g) => ({
                k: <>{g.who ?? "—"} → <b>{g.field}</b>
                   {g.revoked && <span className="text-red-500"> · {t("app.admin.ud.revoked")}</span>}</>,
                v: d(g.at),
              }))}
            />

            {/* ---- usage ---- */}
            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("app.admin.ud.secUsage")}
              </h3>
              <Row k={t("app.admin.ud.uCalls")} v={String(data.usage.calls)} />
              <Row k={t("app.admin.ud.uCost")} v={usd(data.usage.cost_usd)} />
              <Row
                k={t("app.admin.ud.uTokens")}
                v={`${data.usage.input_tokens.toLocaleString()} / ${data.usage.output_tokens.toLocaleString()}`}
              />
              <Row k={t("app.admin.ud.uLast")} v={dt(data.usage.last_used)} />
              {data.usage.by_kind.map((k) => (
                <Row key={k.kind} k={`· ${k.kind}`} v={`${k.calls} · ${usd(k.cost_usd)}`} />
              ))}
            </section>

            {/* ---- events ---- */}
            {data.events.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("app.admin.ud.secEvents")}
                </h3>
                <ul className="max-h-40 overflow-y-auto text-xs text-slate-600">
                  {data.events.map((e, i) => (
                    <li key={i} className="flex justify-between border-b border-slate-100 py-1 last:border-0">
                      <span>{e.type}</span>
                      <span className="text-slate-400">{dt(e.at)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ---- danger zone ---- */}
            {!u.deleted_at && (
              <section className="rounded-xl border border-red-200 bg-red-50/50 p-3">
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-red-700">
                  {t("app.admin.ud.secDanger")}
                </h3>
                {/* Says what the button DOES, not what it is called. "Delete" would be a lie: the
                    row survives because fifteen tables point at it, and what the person authored
                    stays behind, no longer attached to a name. */}
                <p className="mb-2 text-xs leading-snug text-red-800">
                  {t("app.admin.ud.dangerBody")}
                </p>
                {isSelf ? (
                  <p className="text-xs font-medium text-red-700">{t("app.admin.ud.err.cannot_delete_self")}</p>
                ) : u.is_admin ? (
                  <p className="text-xs font-medium text-red-700">{t("app.admin.ud.err.demote_admin_first")}</p>
                ) : data.blocks_close ? (
                  <p className="text-xs font-medium text-red-700">
                    {t("app.admin.ud.err.transfer_ownership_first")}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="input flex-1"
                      placeholder={tf("app.admin.ud.typeEmail", { email: u.email })}
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={busy || confirmEmail.trim().toLowerCase() !== u.email.toLowerCase()}
                      onClick={() => void closeAccount()}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {t("app.admin.ud.closeCta")}
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
