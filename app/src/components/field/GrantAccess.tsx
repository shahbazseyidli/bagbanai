"use client";

// Give ONE named person read access to THIS field (migration 0061).
//
// WHY IT IS NOT THE SHARE LINK. ShareButton next to this mints an anonymous token: anyone holding
// the URL sees a summary card. That is right for a buyer or a bank. It is wrong for "my agronomist
// should look at this field", which is the commonest access request in the research corpus — a
// token cannot be revoked from one person, cannot be audited, and shows a card rather than the
// record. And the alternative, adding them to the organization, hands over every field, every farm,
// the team and the costs to show one orchard.
//
// WHAT THE GRANTEE GETS. The printable field report, and nothing else — not the field page, not the
// org, not a sibling field. That bound is enforced on the server (deps.require_field_read is called
// by exactly one route); this component only has to be honest about it, which is what the note at
// the bottom does.
//
// THE PERSON MUST ALREADY HAVE AN ACCOUNT. Typing a stranger's address does not create one for
// them — that is their decision, not the granter's — so an unknown email is an explicit error with
// an explicit instruction, not a silent invitation.
import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote, Spinner } from "@/components/ui";
import { t } from "@/lib/i18n";

interface Grant {
  id: string;
  email: string;
  name: string | null;
  note: string | null;
  created_at: string | null;
}

export default function GrantAccess({ fieldId }: { fieldId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Grant[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await api.get<Grant[]>(`/api/fields/${fieldId}/grants`));
    } catch (err) {
      setError(azError(err));
      setItems([]);
    }
  }, [fieldId]);

  useEffect(() => {
    if (open && items === null) void load();
  }, [open, items, load]);

  async function add() {
    const addr = email.trim();
    if (!addr) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/fields/${fieldId}/grants`, { email: addr });
      setEmail("");
      await load();
    } catch (err) {
      // The one error worth its own sentence: "no such account" is not a failure the farmer can
      // fix by retrying, it is an instruction to give the other person.
      const msg = String((err as { message?: string })?.message || "");
      setError(msg.includes("user_not_found") ? t("app.field.grant.noAccount") : azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    try {
      await api.del(`/api/fields/${fieldId}/grants/${id}`);
      await load();
    } catch (err) {
      setError(azError(err));
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[var(--tap)] items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
      >
        <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t("app.field.grant.button")}
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-800">{t("app.field.grant.title")}</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[var(--tap)] px-2 text-sm text-slate-500 hover:text-slate-700"
        >
          {t("app.field.shareButton.close")}
        </button>
      </div>

      {error && <ErrorNote message={error} />}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
          placeholder={t("app.field.grant.emailPlaceholder")}
          className="min-h-[var(--tap)] flex-1 rounded-lg border border-slate-300 px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || !email.trim()}
          className="inline-flex min-h-[var(--tap)] items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          {t("app.field.grant.add")}
        </button>
      </div>

      <div className="mt-3">
        {items === null ? (
          <Spinner />
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">{t("app.field.grant.empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {g.name || g.email}
                  </span>
                  {g.name && (
                    <span className="block truncate text-xs text-slate-500">{g.email}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => void revoke(g.id)}
                  aria-label={t("app.field.grant.revoke")}
                  className="inline-flex min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">{t("app.field.grant.scopeNote")}</p>
    </div>
  );
}
