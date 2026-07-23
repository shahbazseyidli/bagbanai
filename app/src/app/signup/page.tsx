"use client";

// Role-based registration wizard (HYBRID_PLAN §E, W1): step 1 role, step 2 account + country/region
// (country mandatory for global users), step 3 provider profile (lab/consultant/supplier only —
// supplier must pick multi-select specializations + company + address so the catalog fills). Farmers
// finish at step 2. On success creates the account, then (for providers) the provider profile.
// NOTE: UI copy is inline Azerbaijani for now; the T18 i18n sweep extracts it to t() keys later.
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sprout, FlaskConical, Users, Package, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote } from "@/components/ui";
import OtpVerify from "@/components/OtpVerify";
import type { User, UserRole } from "@/lib/types";

const ROLES: { key: UserRole; title: string; sub: string; Icon: typeof Sprout }[] = [
  { key: "farmer", title: "Fermer", sub: "Sahələrimi izləyirəm, məhsul yetişdirirəm", Icon: Sprout },
  { key: "lab", title: "Laboratoriya", sub: "Torpaq nümunə xidməti göstərirəm", Icon: FlaskConical },
  { key: "consultant", title: "Aqro-konsultant", sub: "Fermerlərə məsləhət verirəm", Icon: Users },
  { key: "supplier", title: "Təchizatçı", sub: "Toxum, gübrə, dərman satıram", Icon: Package },
];

const COUNTRIES = ["Azərbaycan", "Türkiyə", "Gürcüstan", "Rusiya", "Qazaxıstan", "Digər"];

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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);

  const isProvider = role !== "farmer";

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
    setUser(user);
    router.push("/");
  }

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const r = await api.post<{ needs_verification: boolean; email?: string; user?: User }>(
        "/api/auth/signup",
        { email, password, full_name: fullName || undefined, locale: "az", role, country, region: region || undefined },
      );
      if (r.needs_verification) setOtpEmail(r.email ?? email);
      else if (r.user) await finish(r.user);
    } catch (err) {
      const d = err instanceof ApiError ? err.detail : "";
      setError(d === "email_taken" ? "Bu e-poçt artıq qeydiyyatdadır" : d || "Xəta baş verdi");
    } finally {
      setBusy(false);
    }
  }

  function next2() {
    if (!email || password.length < 8) { setError("E-poçt və ən azı 8 simvol parol lazımdır"); return; }
    if (!country) { setError("Ölkə seçin"); return; }
    setError("");
    if (isProvider) setStep(3); else submit();
  }

  if (otpEmail) {
    return (
      <div className="mx-auto max-w-sm"><div className="card">
        <h1 className="mb-4 text-xl font-bold text-slate-900">E-poçt təsdiqi</h1>
        <OtpVerify email={otpEmail} onVerified={(u) => finish(u)} />
      </div></div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-5 flex items-center justify-center gap-2 text-sm font-medium">
        {["Rol", "Hesab", "Profil"].map((lbl, i) => {
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
            <h1 className="text-xl font-bold text-slate-900">Rolunuzu seçin</h1>
            <p className="mt-1 text-sm text-slate-500">Platformadan necə istifadə edəcəksiniz?</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ROLES.map(({ key, title, sub, Icon }) => (
                <button key={key} type="button" onClick={() => setRole(key)}
                  className={`flex items-start gap-3 rounded-xl border-[1.5px] p-4 text-left transition ${
                    role === key ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-emerald-300"}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span><span className="block font-semibold text-slate-900">{title}</span><span className="block text-xs text-slate-500">{sub}</span></span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button className="btn-primary" onClick={() => { setSpecs([]); setStep(2); }}>Davam et <ArrowRight className="h-4 w-4" /></button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-xl font-bold text-slate-900">Hesab və məkan</h1>
            <div className="mt-4 space-y-3">
              <div><label className="label">Ad, soyad</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><label className="label">E-poçt *</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><label className="label">Parol * (ən azı 8 simvol)</label><input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Ölkə *</label>
                  <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">Region / rayon</label><input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Xaçmaz" /></div>
              </div>
              <p className="text-xs text-slate-500">Ölkə və region xəritə + hava proqnozunu dəqiqləşdirir (qlobal istifadəçilər üçün ölkə məcburidir).</p>
            </div>
            <ErrorNote message={error} />
            <div className="mt-5 flex justify-between">
              <button className="btn-ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Geri</button>
              <button className="btn-primary" onClick={next2} disabled={busy}>{isProvider ? <>Davam et <ArrowRight className="h-4 w-4" /></> : (busy ? "Yüklənir…" : "Qeydiyyatı tamamla")}</button>
            </div>
          </>
        )}

        {step === 3 && isProvider && (
          <>
            <h1 className="text-xl font-bold text-slate-900">{role === "supplier" ? "Təchizatçı profili" : role === "lab" ? "Laboratoriya profili" : "Konsultant profili"}</h1>
            <div className="mt-4 space-y-3">
              <div><label className="label">{role === "supplier" ? "Şirkət adı *" : role === "lab" ? "Laboratoriya adı *" : "Ad / şirkət *"}</label><input className="input" value={company} onChange={(e) => setCompany(e.target.value)} /></div>
              <div><label className="label">{role === "supplier" ? "İxtisaslaşma (çoxlu seçim) *" : role === "lab" ? "Xidmətlər" : "İxtisaslaşma"}</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {SPECS[role].map((s) => (
                    <button key={s} type="button" onClick={() => toggleSpec(s)}
                      className={`rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium ${specs.includes(s) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600"}`}>{s}</button>
                  ))}
                </div>
              </div>
              {role === "supplier" && <div><label className="label">Ünvan *</label><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Quba şəh., ..." /></div>}
              <div><label className="label">Əhatə zonası</label><input className="input" value={coverage} onChange={(e) => setCoverage(e.target.value)} placeholder="Xaçmaz, Quba, Qusar" /></div>
              <div><label className="label">Telefon</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <p className="text-xs text-emerald-700">Provayderlər üçün platforma pulsuzdur — kataloqda görünəcək, fermerlərdən sifariş alacaqsınız.</p>
            </div>
            <ErrorNote message={error} />
            <div className="mt-5 flex justify-between">
              <button className="btn-ghost" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /> Geri</button>
              <button className="btn-primary" onClick={submit} disabled={busy || !company}>{busy ? "Yüklənir…" : "Qeydiyyatı tamamla"} <Check className="h-4 w-4" /></button>
            </div>
          </>
        )}
      </div>
      <Link href="/login" className="mt-4 block text-center text-sm text-emerald-700 hover:underline">Artıq hesabınız var? Daxil olun</Link>
    </div>
  );
}
