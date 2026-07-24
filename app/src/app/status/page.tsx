import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, CloudSun, Database, Fingerprint, Globe, HardDrive, Info, KeyRound,
  Lock, Satellite, Server, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// C10 — /status: a plain description of uptime intent, data sources and security posture. Server
// Component (no state, no t()) so it ships its own metadata; copy is inline Azerbaijani.
//
// Honesty rules: this is a DESCRIPTIVE page, not a live monitor. It claims no uptime percentage,
// no certification (ISO/SOC2) and no measured number we cannot back. The "uptime intent" section
// states an aim, not an SLA, and the closing note is explicit about what we do NOT promise.

export const metadata: Metadata = {
  title: "Status və təhlükəsizlik — Bağban AI",
  description:
    "Bağban AI-nin iş vaxtı niyyəti, məlumat mənbələri (NASA HLS, Sentinel-2, Open-Meteo) və təhlükəsizlik yanaşması — sadə Azərbaycan dilində.",
  alternates: { canonical: "/status" },
};

const SOURCES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Satellite,
    title: "NASA HLS (Harmonized Landsat–Sentinel)",
    body:
      "30 metr piksellə uyğunlaşdırılmış peyk məhsulu. Vegetasiya və su indekslərinin əsas mənbələrindən biridir; hər səhnədə bulud və kölgə maskası tətbiq olunur.",
  },
  {
    icon: Satellite,
    title: "Sentinel-2 (Copernicus)",
    body:
      "10 metr piksellə daha incə görüntü. NASA HLS ilə birlikdə istifadə olunur ki, keçidlər daha tez-tez və detal daha yüksək olsun.",
  },
  {
    icon: CloudSun,
    title: "Open-Meteo",
    body:
      "Hava tarixçəsi və proqnozu üçün açıq məlumat mənbəyi. Su balansı, çiləmə pəncərəsi, şaxta və isti dalğası xəbərdarlıqları buna söykənir.",
  },
];

const SECURITY: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: KeyRound,
    title: "Öz autentifikasiyamız",
    body:
      "Giriş öz JWT sistemimizlə idarə olunur; sessiya yalnız httpOnly çərəzdə saxlanılır, ona görə brauzer skriptləri onu oxuya bilmir.",
  },
  {
    icon: Fingerprint,
    title: "Parollar şifrələnir",
    body:
      "Parollar açıq mətndə saxlanılmır — bcrypt ilə heşlənir. Biz sizin parolunuzu görə bilmirik.",
  },
  {
    icon: Database,
    title: "Məlumat izolyasiyası (RLS)",
    body:
      "Hər sorğu təşkilat səviyyəsində məhdudlaşdırılır: verilənlər bazasında sətir-səviyyəli təhlükəsizlik (RLS), üstündə isə server-tərəfli icazə yoxlaması işləyir. Bir təsərrüfatın məlumatı başqasına görünmür.",
  },
  {
    icon: Lock,
    title: "Şifrələnmiş bağlantı",
    body:
      "Bütün trafik HTTPS (TLS) üzərindən gedir; sertifikat Let's Encrypt ilə avtomatik yenilənir. Brauzerlə server arasında məlumat şifrələnir.",
  },
  {
    icon: ShieldCheck,
    title: "Paylaşım sizin nəzarətinizdədir",
    body:
      "Sahə məlumatını yalnız özünüz paylaşırsınız — komandaya dəvət və ya tokenli paylaşma linki ilə. Link yalnız qısa sahə kartını açır və istənilən vaxt ləğv edilə bilər.",
  },
  {
    icon: HardDrive,
    title: "Ehtiyat nüsxə",
    body:
      "Verilənlər bazasının müntəzəm ehtiyat nüsxəsi ayrıca serverə köçürülür ki, gözlənilməz nasazlıqda məlumat bərpa oluna bilsin.",
  },
];

export default function StatusPage() {
  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      {/* ---------------------------------------------------------- head */}
      <header className="mx-auto max-w-[720px] py-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
          status və təhlükəsizlik
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.1] text-[color:var(--brand-ink)]">
          Sistem, məlumat və təhlükəsizlik
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--brand-ink-2)]">
          Bu səhifə platformanın necə işlədiyini, məlumatın haradan gəldiyini və məlumatınızı necə
          qoruduğumuzu sadə dildə izah edir.
        </p>
      </header>

      <div className="mx-auto max-w-[760px] space-y-8">
        {/* --------------------------------------------- uptime intent */}
        <section className="rounded-xl2 border border-line bg-panel p-6 shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]">
          <h2 className="flex items-center gap-2.5 font-display text-[19px] font-bold text-[color:var(--brand-ink)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep" aria-hidden="true">
              <Activity className="h-5 w-5" />
            </span>
            İş vaxtı niyyətimiz
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">
            Platformanın 24/7 əlçatan olması üçün çalışırıq. Peyk emalı, hava yeniləmələri və analiz
            işləri avtomatik cədvəllərlə arxa planda işləyir; server və xidmətlər müntəzəm izlənir.
            Planlı texniki işləri mümkün qədər aşağı yük saatlarında aparırıq.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">
            Konkret bir «iş vaxtı faizi» (SLA) vəd etmirik — bunun əvəzinə, nasazlıq baş verərsə,
            onu tez aşkarlamağa və qısa müddətdə bərpa etməyə fokuslanırıq. Sizə təsir edən ciddi
            hadisə olduqda tətbiqdaxili bildirişlə xəbər verməyə çalışırıq.
          </p>
        </section>

        {/* ------------------------------------------------ data sources */}
        <section>
          <h2 className="flex items-center gap-2.5 font-display text-[19px] font-bold text-[color:var(--brand-ink)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep" aria-hidden="true">
              <Globe className="h-5 w-5" />
            </span>
            Məlumat mənbələri
          </h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">
            Analizlərimiz açıq, etibarlı peyk və hava mənbələrinə söykənir. Yağış, buludluluq və
            atmosfer şəraiti peyk keçidlərinin tezliyinə təsir edə bilər.
          </p>
          <div className="mt-4 grid gap-3">
            {SOURCES.map((s) => (
              <div
                key={s.title}
                className="flex gap-4 rounded-xl2 border border-line bg-panel p-5 shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-panel-2 text-teal" aria-hidden="true">
                  <s.icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[16px] font-bold text-[color:var(--brand-ink)]">{s.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-[color:var(--brand-ink-2)]">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--brand-muted)]">
            AI analizləri üçün müstəqil böyük dil modeli provayderindən istifadə olunur; sahə
            məlumatınız yalnız sizin sorğunuzun kontekstini qurmaq üçün işlədilir.
          </p>
        </section>

        {/* --------------------------------------------------- security */}
        <section>
          <h2 className="flex items-center gap-2.5 font-display text-[19px] font-bold text-[color:var(--brand-ink)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep" aria-hidden="true">
              <ShieldCheck className="h-5 w-5" />
            </span>
            Təhlükəsizlik yanaşması
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SECURITY.map((s) => (
              <div
                key={s.title}
                className="rounded-xl2 border border-line bg-panel p-5 shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-panel-2 text-teal" aria-hidden="true">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-display text-[15.5px] font-bold text-[color:var(--brand-ink)]">{s.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--brand-ink-2)]">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------- what we don't claim */}
        <section className="rounded-xl2 border-[1.5px] border-[#ecdcb0] bg-[#fff8ea] p-6">
          <h2 className="flex items-center gap-2.5 font-display text-[17px] font-bold text-[#8a5f08]">
            <Info className="h-5 w-5 shrink-0" aria-hidden="true" />
            Nəyi vəd etmirik
          </h2>
          <ul className="mt-3 grid gap-2.5">
            {[
              "Rəsmi sertifikat (ISO, SOC 2 və s.) iddia etmirik — belə sertifikatlarımız yoxdur.",
              "Konkret «iş vaxtı faizi» və ya ölçülməmiş dəqiqlik rəqəmi vəd etmirik.",
              "AI cavabları məsləhət xarakterlidir və peşəkar aqronomu əvəz etmir — son qərar sizindir.",
            ].map((item) => (
              <li key={item} className="flex gap-2.5 text-[14px] leading-relaxed text-[#7a5407]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c98a12]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* -------------------------------------------------- infra note */}
        <section className="flex gap-4 rounded-xl2 border border-line bg-panel p-5 shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-panel-2 text-teal" aria-hidden="true">
            <Server className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[16px] font-bold text-[color:var(--brand-ink)]">İnfrastruktur</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[color:var(--brand-ink-2)]">
              Xidmət Avropada yerləşən serverlərdə, konteynerləşdirilmiş şəkildə işləyir. Peyk
              rasterləri, verilənlər bazası və analiz xidmətləri ayrı-ayrı komponentlərdir; bir
              hissənin yükü digərinə minimal təsir etsin deyə belə qurulub.
            </p>
          </div>
        </section>
      </div>

      {/* ----------------------------------------------------------- cta */}
      <section className="mx-auto max-w-[760px] pt-11">
        <div
          className="rounded-xl2 p-8 text-center shadow-soft sm:p-11"
          style={{ background: "linear-gradient(150deg,#0f4b42,#0a2f2a)" }}
        >
          <h2 className="font-display text-[clamp(22px,3vw,28px)] font-bold text-white">
            Suallarınız var?
          </h2>
          <p className="mt-2.5 text-[15px] text-[#a9cdbc]">
            Necə başlamalı bələdçilərinə baxın və ya bu gün pulsuz sınayın.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/guide"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-teal transition-opacity hover:opacity-90"
            >
              Necə başlamalı
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-white/30 px-7 text-[15px] font-bold text-white transition-colors hover:border-white"
            >
              Pulsuz başla
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
