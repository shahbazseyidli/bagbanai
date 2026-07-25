import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, Boxes, Brain, Camera, CloudSun, Droplets, FileText, Globe, Handshake,
  Layers, MapPin, Satellite, Snowflake, Sprout, Volume2, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// C10 — /yenilikler: a public changelog of the major capabilities that now exist. Server Component
// (no state, no t()) so it ships its own metadata; copy is inline Azerbaijani.
//
// Honesty rules: entries are framed as "əlavə edildi" and grouped into COARSE periods (season-
// level, not fake day precision) — the transparency note at the top says the dates are approximate.
// Every entry maps to a capability the product actually ships today; nothing forward-looking is
// listed as done.

type Entry = { icon: IconKey; title: string; body: string };
type IconKey =
  | "satellite" | "map-pin" | "clipboard" | "brain" | "camera" | "droplets" | "cloud" | "snow"
  | "sprout" | "wallet" | "boxes" | "report" | "handshake" | "layers" | "globe" | "offline" | "bell";

const ICONS: Record<IconKey, LucideIcon> = {
  satellite: Satellite,
  "map-pin": MapPin,
  clipboard: FileText,
  brain: Brain,
  camera: Camera,
  droplets: Droplets,
  cloud: CloudSun,
  snow: Snowflake,
  sprout: Sprout,
  wallet: Wallet,
  boxes: Boxes,
  report: FileText,
  handshake: Handshake,
  layers: Layers,
  globe: Globe,
  offline: Volume2,
  bell: Bell,
};

const CHANGELOG: { period: string; entries: Entry[] }[] = [
  {
    period: "2026 · Yay",
    entries: [
      {
        icon: "handshake",
        title: "Marketplace və provayder kataloqu",
        body:
          "Laboratoriya, aqronom və təchizatçı üçün pulsuz profillər, region üzrə axtarıla bilən kataloq və birbaşa yazışma əlavə edildi. Fermerlər üçün icma söhbəti də açıldı — vasitəçi və komissiya yoxdur.",
      },
      {
        icon: "layers",
        title: "Məhsuldarlıq zonaları",
        body:
          "Bir neçə mövsümün peyk piksellərindən hesablanmış davamlı güclü/zəif zonalar əlavə edildi — hansı hissəyə daha çox, hansına daha az resurs vermək lazım olduğunu göstərir.",
      },
      {
        icon: "report",
        title: "Hesabat kitabxanası və paylaşma linki",
        body:
          "Mövsüm hesabatı, əməliyyat jurnalı və xərc hesabatı — çap üçün hazır və CSV kimi — əlavə edildi. Sahənin qısa kartını tokenli, istənilən vaxt ləğv edilə bilən linklə paylaşmaq mümkün oldu.",
      },
      {
        icon: "wallet",
        title: "Genişlənmiş təsərrüfat dəftəri",
        body:
          "Anbar, texnika servisi, yığım lotları, alıcı bazası və satış jurnalı əlavə edildi. Xərc və gəlir indi sahə-sahə toplanır; qəbz şəklindən xərc qaralaması avtomatik doldurulur.",
      },
      {
        icon: "globe",
        title: "Çoxdilli interfeys",
        body:
          "Azərbaycan dilinə əlavə olaraq ingilis, türk və alman dilləri əlavə edildi. Brauzer dili avtomatik tanınır, dil istənilən vaxt dəyişdirilə bilər.",
      },
      {
        icon: "camera",
        title: "Torpaq analizinin oxunması",
        body:
          "Laboratoriya sənədinin şəklini və ya PDF-ini yükləmək imkanı əlavə edildi: sistem pH, NPK və üzvi maddə kimi göstəriciləri oxuyub torpaq pasportuna yazır və AI tövsiyələrinə qatır.",
      },
    ],
  },
  {
    period: "2026 · Yaz",
    entries: [
      {
        icon: "brain",
        title: "AI aqronom məsləhəti və söhbət",
        body:
          "Hər yeni peyk səhnəsindən sonra avtomatik strukturlu analiz — risklər (şiddət dərəcəsi ilə), tövsiyələr, növbəti addımlar — əlavə edildi. Sahə kontekstini xatırlayan söhbət də açıldı.",
      },
      {
        icon: "camera",
        title: "Foto diaqnoz",
        body:
          "Yarpaq, meyvə və ya torpağın şəklini çəkib xəstəlik/zərərverici izini oxutmaq imkanı əlavə edildi. Şəkillər sahənin arxivində qalır və analizə daxil olur.",
      },
      {
        icon: "droplets",
        title: "Su balansı və çiləmə pəncərəsi",
        body:
          "FAO-56 metodikası ilə torpaq su ehtiyatı hesablaması və 7 günlük proqnozdan çiləmə üçün uyğun pəncərə əlavə edildi.",
      },
      {
        icon: "snow",
        title: "Hava, şaxta və isti dalğası xəbərdarlığı",
        body:
          "Open-Meteo əsaslı hava proqnozu, şaxta və isti dalğası xəbərdarlıqları əlavə edildi. Bildirişlərdə sakit saatlar var — gecə narahat etmirik.",
      },
      {
        icon: "sprout",
        title: "Gübrə planı və AI doza təklifi",
        body:
          "Gübrə qrafiki, NDVI trendinə, məhsul normalarına və (varsa) laboratoriya analizinə əsaslanan doza təklifi əlavə edildi. Hər tətbiq dəftərə və xərcə düşür.",
      },
      {
        icon: "offline",
        title: "Offline rejim, PWA və səsləndirmə",
        body:
          "Tətbiqin telefona quraşdırılması (PWA), son baxılan məlumatın offline açılması, «data qənaəti» rejimi və məsləhəti dinləmək üçün «səsləndir» düyməsi əlavə edildi.",
      },
    ],
  },
  {
    period: "2026 · İlkin buraxılış",
    entries: [
      {
        icon: "satellite",
        title: "Peyk monitorinqi",
        body:
          "NASA HLS (30 m) və Sentinel-2 (10 m) səhnələri, 9-dan çox vegetasiya və su indeksi (NDVI, NDMI, NDRE, EVI, SAVI, NBR…), sahəyə kəsilmiş piksel-səviyyəli rəngli xəritə və bulud faizli tarix zolağı ilə platforma işə düşdü.",
      },
      {
        icon: "map-pin",
        title: "Bir toxunuşla sahə qeydiyyatı",
        body:
          "Xəritədə kəndini axtarıb tarlaya toxunmaqla sərhədin avtomatik tanınması əlavə edildi. Əl ilə düzəliş və hazır shapefile (.zip) yükləmə də dəstəklənir.",
      },
      {
        icon: "clipboard",
        title: "Tapşırıq və əməliyyat jurnalı",
        body:
          "Tapşırıq zənciri, əməliyyat qeydiyyatı, yığım məhdudiyyəti (PHI) sayğacı və yığım qeydiyyatı platformanın ilk buraxılışından bəri mövcuddur.",
      },
    ],
  },
];

export const metadata: Metadata = {
  title: "Yeniliklər — Bağban AI",
  description:
    "Bağban AI-ə əlavə edilən əsas imkanlar: peyk monitorinqi, AI aqronom, təsərrüfat dəftəri, marketplace, məhsuldarlıq zonaları, hava/şaxta xəbərdarlığı və hesabatlar.",
  alternates: { canonical: "/yenilikler" },
};

export default function ChangelogPage() {
  return (
    <div className="-mx-4 -mt-6 -mb-24 bg-paper px-4 pt-6 pb-24 md:-mb-6 md:pb-8">
      {/* ---------------------------------------------------------- head */}
      <header className="mx-auto max-w-[720px] py-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
          yeniliklər
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.1] text-[color:var(--brand-ink)]">
          Nə əlavə edildi
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--brand-ink-2)]">
          Bağban AI davamlı böyüyür. Aşağıda platformada indi mövcud olan əsas imkanlar toplanıb.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--brand-muted)]">
          Qeyd: tarixlər dövr səviyyəsində (təxmini) göstərilir — dəqiq gün iddia etmirik.
        </p>
      </header>

      {/* ------------------------------------------------------ timeline */}
      <div className="mx-auto max-w-[760px] space-y-10">
        {CHANGELOG.map((group) => (
          <section key={group.period}>
            <h2 className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-1.5 font-display text-[15px] font-bold text-[color:var(--brand-ink)]">
              {group.period}
            </h2>
            <ul className="space-y-3">
              {group.entries.map((e) => {
                const Icon = ICONS[e.icon] ?? Satellite;
                return (
                  <li
                    key={e.title}
                    className="flex gap-4 rounded-xl2 border border-line bg-panel p-5 shadow-[0_1px_2px_rgba(20,15,10,0.05),0_2px_8px_rgba(20,15,10,0.05)]"
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep"
                      aria-hidden="true"
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[17px] font-bold text-[color:var(--brand-ink)]">
                          {e.title}
                        </h3>
                        <span className="rounded-full border border-[#bfe6cd] bg-mint-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-grass-deep">
                          Əlavə edildi
                        </span>
                      </div>
                      <p className="mt-1.5 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]">
                        {e.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* ----------------------------------------------------------- cta */}
      <section className="mx-auto max-w-[760px] pt-11">
        <div
          className="rounded-xl2 p-8 text-center shadow-soft sm:p-11"
          style={{ background: "linear-gradient(150deg,#0f4b42,#0a2f2a)" }}
        >
          <h2 className="font-display text-[clamp(22px,3vw,28px)] font-bold text-white">
            Bu imkanları öz sahənizdə sınayın
          </h2>
          <p className="mt-2.5 text-[15px] text-[#a9cdbc]">
            Fermerlər üçün 1 ay pulsuz · kart lazım deyil
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-teal transition-opacity hover:opacity-90"
            >
              Pulsuz başla
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/guide"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-white/30 px-7 text-[15px] font-bold text-white transition-colors hover:border-white"
            >
              Necə başlamalı
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
