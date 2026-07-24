"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t, type I18nKey } from "@/lib/i18n";
import { ErrorNote, Field as FormField, Spinner } from "@/components/ui";
import type { Invite, Member, Org, Role } from "@/lib/types";

const ROLES: Role[] = ["owner", "admin", "agronomist", "worker", "viewer"];

function roleLabel(role: string): string {
  return t(`team.role.${role}` as I18nKey);
}

export default function TeamPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("worker");
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const loadMembers = useCallback(async (orgId: string) => {
    setError("");
    setForbidden(false);
    try {
      setMembers(await api.get<Member[]>(`/api/orgs/${orgId}/members`));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setForbidden(true);
      else setError(err instanceof Error ? err.message : t("common.error"));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const list = await api.get<Org[]>("/api/orgs");
        setOrgs(list);
        if (list.length) {
          setSelectedOrg(list[0].id);
          await loadMembers(list[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.error"));
      }
    })();
  }, [user, loadMembers]);

  const currentOrg = orgs.find((o) => o.id === selectedOrg);
  const canManage = currentOrg?.role === "owner" || currentOrg?.role === "admin";

  async function onSelectOrg(id: string) {
    setSelectedOrg(id);
    setInviteLink("");
    await loadMembers(id);
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInviteLink("");
    try {
      const res = await api.post<Invite>(`/api/orgs/${selectedOrg}/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setInviteLink(`${origin}${res.accept_path}`);
      setInviteEmail("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setForbidden(true);
      else setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function changeRole(userId: string, role: string) {
    setError("");
    try {
      await api.post(`/api/orgs/${selectedOrg}/members/${userId}/role`, { role });
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: role as Role } : m)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setError(t("team.forbidden"));
      else setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  if (loading || !user) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("team.title")}</h1>

      {orgs.length > 1 && (
        <div className="card">
          <label className="label">{t("dash.selectOrg")}</label>
          <select className="input" value={selectedOrg} onChange={(e) => onSelectOrg(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <ErrorNote message={error} />
      {forbidden && <ErrorNote message={t("team.forbidden")} />}

      {/* Members */}
      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-800">{t("team.members")}</h2>
        {members.length === 0 ? (
          <p className="text-sm text-slate-500">{t("common.none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-4">{t("auth.email")}</th>
                  <th className="py-2 pr-4">{t("dash.role")}</th>
                  <th className="py-2">{t("team.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <td className="py-2 pr-4">
                      <div className="text-slate-800">{m.email}</div>
                      {m.full_name && <div className="text-xs text-slate-400">{m.full_name}</div>}
                    </td>
                    <td className="py-2 pr-4">
                      {canManage ? (
                        <select
                          className="input w-40"
                          value={m.role}
                          onChange={(e) => changeRole(m.user_id, e.target.value)}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {roleLabel(r)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{roleLabel(m.role)}</span>
                      )}
                    </td>
                    <td className="py-2 text-slate-500">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite */}
      {canManage && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-slate-800">{t("team.invite")}</h2>
          <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
            <div className="min-w-52 flex-1">
              <FormField label={t("team.inviteEmail")}>
                <input
                  className="input"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </FormField>
            </div>
            <div>
              <FormField label={t("team.inviteRole")}>
                <select className="input w-40" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
                  {(["admin", "agronomist", "worker", "viewer"] as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <button className="btn-primary" type="submit">
              {t("team.invite")}
            </button>
          </form>

          {inviteLink && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="mb-1 text-sm font-medium text-emerald-800">{t("team.inviteLink")}</p>
              <div className="flex items-center gap-2">
                <input className="input flex-1 bg-white" readOnly value={inviteLink} />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigator.clipboard?.writeText(inviteLink)}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
