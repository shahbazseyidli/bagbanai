"use client";

// Role-based registration wizard (HYBRID_PLAN §E, W1): step 1 role, step 2 account + country/region
// (country mandatory for global users), step 3 provider profile (lab/consultant/supplier only —
// supplier must pick multi-select specializations + company + address so the catalog fills). Farmers
// finish at step 2. On success creates the account, then (for providers) the provider profile.
// NOTE: UI copy is inline Azerbaijani for now; the T18 i18n sweep extracts it to t() keys later.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sprout, FlaskConical, Users, Package, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getLocale, t, type I18nKey } from "@/lib/i18n";
import { clearAnswers, countryName, loadAnswers } from "@/lib/onboardingQuiz";
import { ErrorNote } from "@/components/ui";
import OtpVerify from "@/components/OtpVerify";
import type { User, UserRole } from "@/lib/types";

// title/sub stored as i18n keys (constant); resolved with t() at render time so the locale set by
// LocaleProvider applies (module-level t() would freeze at the default locale).
const ROLES: { key: UserRole; titleKey: I18nKey; subKey: I18nKey; Icon: typeof Sprout }[] = [
  { key: "farmer", titleKey: "app.signup.roleFarmerTitle", subKey: "app.signup.roleFarmerSub", Icon: Sprout },
  { key: "lab", titleKey: "app.signup.roleLabTitle", subKey: "app.signup.roleLabSub", Icon: FlaskConical },
  { key: "consultant", titleKey: "app.signup.roleConsultantTitle", subKey: "app.signup.roleConsultantSub", Icon: Users },
  { key: "supplier", titleKey: "app.signup.roleSupplierTitle", subKey: "app.signup.roleSupplierSub", Icon: Package },
];

// Stored value stays the canonical Azerbaijani name (existing rows and the provider-catalog
// filters use it); only the LABEL is localized, so an English visitor no longer reads "Azərbaycan".
const COUNTRIES: { value: string; code: string }[] = [
  { value: "Azərbaycan", code: "AZ" },
  { value: "Türkiyə", code: "TR" },
  { value: "Gürcüstan", code: "GE" },
  { value: "Rusiya", code: "RU" },
  { value: "Qazaxıstan", code: "KZ" },
  { value: "Digər", code: "" },
];

const SPECS: Record<UserRole, string[]> = {
  farmer: [],
  supplier: ["Toxum", "Gübrə", "Dərman (pestisid)", "Texnika", "Suvarma avadanlığı", "Xidmət"],
  lab: ["Torpaq analizi", "NPK", "pH", "Su analizi", "Yarpaq analizi"],
  consultant: ["Bağçılıq", "Fındıq", "Taxıl", "Üzümçülük", "Tərəvəz"],
};

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>("farmer");
  const [country, setCountry] = useState("Azərbaycan");
  const [region, setRegion] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [coverage, setCoverage] = useState("");
  const [phone, setPhone] = useState("");
  const [namePublic, setNamePublic] = useState(true); // farmer name visibility (New-B), default on
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);

  const isProvider = role !== "farmer";

  // Prefill from the landing quiz so a visitor never types the same answer twice.
  useEffect(() => {
    const q = loadAnswers();
    if (!q) return;
    const hit = COUNTRIES.find((c) => c.code && c.code === q.country);
    if (hit) setCountry(hit.value);
    else if (q.country) setCountry("Digər");
    if (q.region) setRegion(q.region);
  }, []);

  function toggleSpec(s: string) {
    setSpecs((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function createProviderIfNeeded() {
    if (!isProvider) return;
    try {
      await api.put("/api/providers/me", {
        kind: role, company, specializations: specs, country, region,
        address: address || undefined, coverage: coverage || undefined, phone: phone || undefined,
      });
    } catch { /* profile can be completed later from account */ }
  }

  async function finish(user: User) {
    await createProviderIfNeeded();
    clearAnswers(); // the quiz has been persisted server-side; don't replay it for the next visitor
    setUser(user);
    router.push("/");
  }

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const r = await api.post<{ needs_verification: boolean; email?: string; user?: User }>(
        "/api/auth/signup",
        { email, password, full_name: fullName || undefined, locale: "az", role, country,
          region: region || undefined, name_public: role === "farmer" ? namePublic : true,
          // E13 — the landing quiz answers become the farmer's profile and prefill their fields.
          onboarding: loadAnswers() ?? undefined },
      );
      if (r.needs_verification) setOtpEmail(r.email ?? email);
      else if (r.user) await finish(r.user);
    } catch (err) {
      const d = err instanceof ApiError ? err.detail : "";
      setError(d === "email_taken" ? t("app.signup.errEmailTaken") : d || t("app.signup.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  function next2() {
    if (!email || password.length < 8) { setError(t("app.signup.errEmailPassword")); return; }
    if (!country) { setError(t("app.signup.errSelectCountry")); return; }
    setError("");
    if (isProvider) setStep(3); else submit();
  }

  if (otpEmail) {
    return (
      <div className="mx-auto max-w-sm"><div className="card">
        <h1 className="mb-4 text-xl font-bold text-slate-900">{t("app.signup.otpTitle")}</h1>
        <OtpVerify email={otpEmail} onVerified={(u) => finish(u)} />
      </div></div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-5 flex items-center justify-center gap-2 text-sm font-medium">
        {[t("app.signup.stepRole"), t("app.signup.stepAccount"), t("app.signup.stepProfile")].map((lbl, i) => {
          const n = i + 1;
          const shown = isProvider || n < 3;
          if (!shown) return null;
          return (
            <div key={lbl} className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                step === n ? "bg-emerald-600 text-white" : step > n ? "bg-emerald-100 text-emerald-700" : "border-[1.5px] border-slate-300 text-slate-400"}`}>
                {step > n ? <Check className="h-4 w-4" /> : n}
              </span>
              <span className={step === n ? "text-slate-900" : "text-slate-400"}>{lbl}</span>
            </div>
          );
        })}
      </div>

      <div className="card">
        {step === 1 && (
          <>
            <h1 className="text-xl font-bold text-slate-900">{t("app.signup.step1Heading")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("app.signup.step1Sub")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ROLES.map(({ key, titleKey, subKey, Icon }) => (
                <button key={key} type="button" onClick={() => setRole(key)}
                  className={`flex items-start gap-3 rounded-xl border-[1.5px] p-4 text-left transition ${
                    role === key ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-emerald-300"}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span><span className="block font-semibold text-slate-900">{t(titleKey)}</span><span className="block text-xs text-slate-500">{t(subKey)}</span></span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button className="btn-primary" onClick={() => { setSpecs([]); setStep(2); }}>{t("app.signup.continue")} <ArrowRight className="h-4 w-4" /></button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-xl font-bold text-slate-900">{t("app.signup.step2Heading")}</h1>
            <div className="mt-4 space-y-3">
              <div><label className="label">{t("app.signup.labelFullName")}</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><label className="label">{t("app.signup.labelEmail")}</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><label className="label">{t("app.signup.labelPassword")}</label><input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">{t("app.signup.labelCountry")}</label>
                  <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
                    {COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.code ? countryName(c.code, getLocale()) : t("mkt.quiz.countryOther")}
                      </option>
                    ))}
                  </select>
                </div>
                <div><label className="label">{t("app.signup.labelRegion")}</label><input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Xaçmaz" /></div>
              </div>
              <p className="text-xs text-slate-500">{t("app.signup.locationHint")}</p>
              {!isProvider && (
                <button
                  type="button"
                  onClick={() => setNamePublic((v) => !v)}
                  role="switch"
                  aria-checked={namePublic}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 text-left"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-slate-900">{t("app.signup.namePublicLabel")}</span>
                    <span className="block text-xs text-slate-500">{t("app.signup.namePublicHint")}</span>
                  </span>
                  <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${namePublic ? "bg-emerald-600" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${namePublic ? "left-[22px]" : "left-0.5"}`} />
                  </span>
                </button>
              )}
            </div>
            <ErrorNote message={error} />
            <div className="mt-5 flex justify-between">
              <button className="btn-ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> {t("app.signup.back")}</button>
              <button className="btn-primary" onClick={next2} disabled={busy}>{isProvider ? <>{t("app.signup.continue")} <ArrowRight className="h-4 w-4" /></> : (busy ? t("app.signup.loading") : t("app.signup.finishSignup"))}</button>
            </div>
          </>
        )}

        {step === 3 && isProvider && (
          <>
            <h1 className="text-xl font-bold text-slate-900">{role === "supplier" ? t("app.signup.supplierProfileTitle") : role === "lab" ? t("app.signup.labProfileTitle") : t("app.signup.consultantProfileTitle")}</h1>
            <div className="mt-4 space-y-3">
              <div><label className="label">{role === "supplier" ? t("app.signup.labelCompanySupplier") : role === "lab" ? t("app.signup.labelCompanyLab") : t("app.signup.labelCompanyConsultant")}</label><input className="input" value={company} onChange={(e) => setCompany(e.target.value)} /></div>
              <div><label className="label">{role === "supplier" ? t("app.signup.labelSpecsSupplier") : role === "lab" ? t("app.signup.labelSpecsLab") : t("app.signup.labelSpecsConsultant")}</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {SPECS[role].map((s) => (
                    <button key={s} type="button" onClick={() => toggleSpec(s)}
                      className={`rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium ${specs.includes(s) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600"}`}>{s}</button>
                  ))}
                </div>
              </div>
              {role === "supplier" && <div><label className="label">{t("app.signup.labelAddress")}</label><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Quba şəh., ..." /></div>}
              <div><label className="label">{t("app.signup.labelCoverage")}</label><input className="input" value={coverage} onChange={(e) => setCoverage(e.target.value)} placeholder="Xaçmaz, Quba, Qusar" /></div>
              <div><label className="label">{t("app.signup.labelPhone")}</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <p className="text-xs text-emerald-700">{t("app.signup.providerFreeNote")}</p>
            </div>
            <ErrorNote message={error} />
            <div className="mt-5 flex justify-between">
              <button className="btn-ghost" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /> {t("app.signup.back")}</button>
              <button className="btn-primary" onClick={submit} disabled={busy || !company}>{busy ? t("app.signup.loading") : t("app.signup.finishSignup")} <Check className="h-4 w-4" /></button>
            </div>
          </>
        )}
      </div>
      <Link href="/login" className="mt-4 block text-center text-sm text-emerald-700 hover:underline">{t("app.signup.alreadyHaveAccount")}</Link>
    </div>
  );
}
