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
import { api, azError } from "@/lib/api";
import { ErrorNote, Spinner } from "@/components/ui";
import { t, tf } from "@/lib/i18n";

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
            deleted: boolean; created_at: string | null }[];
  usage: { calls: number; input_tokens: number; output_tokens: number; cost_usd: number;
           last_used: string | null; by_kind: { kind: string; calls: number; cost_usd: number }[] };
  events: { type: string; at: string }[];
  channels: { channel: string; verified: boolean; opt_in: boolean }[];
  push_devices: number;
  blocks_close: boolean;
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
