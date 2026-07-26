"use client";

// Edit your own name / country / region. Email stays read-only here: changing it has to go back
// through OTP verification, which is a separate flow the backend does not expose on this endpoint.
//
// PATCH /api/auth/profile treats an ABSENT key as "leave the column alone" and "" as "clear it", so
// all three keys are always sent — otherwise a farmer could never empty a field they once filled.
import { useEffect, useState, type FormEvent } from "react";
import { UserRound } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getLocale, t } from "@/lib/i18n";
import { countryName } from "@/lib/onboardingQuiz";
import { ErrorNote } from "@/components/ui";
import { ACCOUNT_COUNTRIES } from "@/components/account/countries";
import type { User } from "@/lib/types";

export default function ProfileForm() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [country, setCountry] = useState(user?.country ?? "");
  const [region, setRegion] = useState(user?.region ?? "");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [ok, setOk] = useState(false);

  // Auth paints from the localStorage cache and only then reconciles with /me, so the real user can
  // arrive after this component mounts. Re-seed when the identity changes, not on every render of a
  // new object, or typing would be wiped by each background revalidation.
  const userId = user?.id;
  useEffect(() => {
    setFullName(user?.full_name ?? "");
    setCountry(user?.country ?? "");
    setRegion(user?.region ?? "");
    setOk(false);
    setBanner("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!user) return null;

  const stored = user.country ?? "";
  // A country that is not one of the six (a legacy row, or something the landing quiz wrote) would
  // otherwise be silently rewritten to the first option the moment anything else is saved.
  const unlisted = stored !== "" && !ACCOUNT_COUNTRIES.some((c) => c.value === stored);

  const dirty =
    fullName !== (user.full_name ?? "") ||
    country !== (user.country ?? "") ||
    region !== (user.region ?? "");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBanner("");
    setOk(false);
    setBusy(true);
    try {
      const updated = await api.patch<User>("/api/auth/profile", {
        full_name: fullName.trim(),
        country,
        region: region.trim(),
      });
      // Also rewrites the cached user, so the "Ölkə & region" card above updates in the same tick.
      setUser(updated);
      setOk(true);
    } catch (err) {
      setBanner(azError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="profile" className="rounded-xl border-[1.5px] border-slate-300 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-emerald-700">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{t("app.account.profile.title")}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{t("app.account.profile.body")}</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-3 space-y-3">
        <div>
          <label className="label" htmlFor="profile-name">{t("app.signup.labelFullName")}</label>
          <input
            id="profile-name"
            className="input"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="profile-country">{t("app.account.profile.country")}</label>
            <select
              id="profile-country"
              className="input"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {unlisted && <option value={stored}>{stored}</option>}
              {stored === "" && <option value="" disabled>{t("common.select")}</option>}
              {ACCOUNT_COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.code ? countryName(c.code, getLocale()) : t("mkt.quiz.countryOther")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="profile-region">{t("app.account.profile.region")}</label>
            <input
              id="profile-region"
              className="input"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Xaçmaz"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">{t("app.account.profile.emailNote")}</p>

        {banner && <ErrorNote message={banner} />}
        {ok && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {t("app.account.profile.saved")}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={busy || !dirty}>
          {busy ? t("common.saving") : t("common.save")}
        </button>
      </form>
    </div>
  );
}
