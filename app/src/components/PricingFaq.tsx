"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

// C4 — pricing FAQ accordion. Every answer is grounded in services/app/tiers.py (free / Paket 2 /
// Paket 3 gating + quotas) and the C2 1-month Pro trial (new org → 1 month Pro, then free, no card).
// Copy is inline Azerbaijani pending the T18 i18n sweep. Client component for the expand/collapse.
interface QA {
  q: string;
  a: string;
}

const FAQ: QA[] = [
  {
    q: "Pulsuz paketdə nələr var?",
    a: "1 sahə, NASA HLS 30m + Sentinel-2 10m peyk monitorinqi, NDVI ilə birlikdə 9 vegetasiya indeksi, 7 günlük hava proqnozu, sahə idarəetmə alətləri və ayda 1 AI aqronom məsləhəti (hədiyyə). Kart tələb olunmur.",
  },
  {
    q: "«1 ay pulsuz sınaq» necə işləyir?",
    a: "Yeni yaratdığınız hər təşkilat avtomatik olaraq 1 ay müddətinə Pro paketini pulsuz alır. Kart məlumatı istənilmir və heç bir avtomatik ödəniş yoxdur.",
  },
  {
    q: "Sınaq bitəndən sonra nə olur?",
    a: "Heç bir ödəniş çıxılmır. Hesabınız avtomatik Pulsuz paketə (1 sahə, ayda 1 məsləhət) keçir. Sahələriniz və bütün məlumatınız qalır — istədiyiniz vaxt Pro və ya Business-ə keçə bilərsiniz.",
  },
  {
    q: "Paket 2 (Pro) ilə Paket 3 (Business) arasında fərq nədir?",
    a: "Pro (10 AZN/ay): 5 sahə, ayda 8 AI məsləhəti, ayda 50 chatbot sualı, Bilik Pasportu, çiləmə pəncərəsi, suvarma balansı və email bildiriş. Business (25 AZN/ay): limitsiz sahə + komanda, ayda 30 məsləhət, ayda 300 chat, foto diaqnoz, zərərverici riski, gübrə kalkulyatoru, regional benchmark, PDF hesabat və WhatsApp bildiriş.",
  },
  {
    q: "Neçə sahə əlavə edə bilərəm?",
    a: "Pulsuz paketdə 1, Pro paketdə 5 (təxminən 25 ha), Business paketdə limitsiz sahə. Business həmçinin komanda üzvlərini dəstəkləyir.",
  },
  {
    q: "AI aqronom məsləhəti və chatbot neçə dəfə işləyir?",
    a: "AI məsləhəti: Pulsuz ayda 1 (hədiyyə), Pro ayda 8, Business ayda 30. AI chatbot: Pulsuz paketdə yoxdur, Pro-da ayda 50, Business-də ayda 300 sual.",
  },
  {
    q: "Sentinel-2 10m peyk təsviri pulsuz paketdə varmı?",
    a: "Bəli. İlk (tək) sahənizdə həm NASA HLS 30m, həm də Sentinel-2 10m təsviri pulsuz gəlir. NDRE və CIre kimi red-edge indeksləri Pro paketindən başlayır.",
  },
  {
    q: "Hektar limiti varmı?",
    a: "Ayrıca hektar haqqı yoxdur — limit sahə sayına görədir (Pulsuz 1, Pro 5, Business limitsiz).",
  },
  {
    q: "Ödənişi necə edə bilərəm?",
    a: "Onlayn ödəniş inteqrasiyası hazırlanır. Hazırda paketi yüksəltmək üçün bizimlə əlaqə saxlayın — komandamız hesabınızı əl ilə aktivləşdirir.",
  },
  {
    q: "İstənilən vaxt ləğv edə bilərəmmi?",
    a: "Bəli. Ləğv etdikdə hesabınız Pulsuz paketə keçir və məlumatınız itmir. Uzunmüddətli öhdəlik yoxdur.",
  },
  {
    q: "Bildirişlər hansı kanallarla gəlir?",
    a: "Bütün paketlərdə tətbiqdaxili (in-app) bildiriş var. Email bildiriş Pro və Business paketlərində, WhatsApp bildiriş yalnız Business paketində mövcuddur.",
  },
  {
    q: "Foto diaqnoz, gübrə kalkulyatoru və hesabatlar hansı paketdədir?",
    a: "Bunlar Business paketinə daxildir və mərhələli açılır (tezliklə). Foto diaqnoz ayda 30 şəkli əhatə edir.",
  },
  {
    q: "Laboratoriya, konsultant və təchizatçılar üçün qiymət nədir?",
    a: "Provayderlər üçün platforma tamamilə pulsuzdur — abunə, qoşulma haqqı və komissiya yoxdur. Yuxarıdakı qiymətlər yalnız fermerlər üçündür.",
  },
  {
    q: "Endirim proqramları varmı?",
    a: "Bəli — gənc fermer (−50%), kooperativ və tələbə-aqronom endirimləri mövcuddur. Yuxarıdakı kartlardan müraciət edin; endirim müraciətiniz yoxlandıqdan sonra əl ilə tətbiq olunur.",
  },
  {
    q: "Sahə məlumatım kimə görünür?",
    a: "Sahə məlumatınız yalnız öz təşkilatınıza görünür. Regional benchmark rəqəmləri anonimləşdirilmiş və k-anonim aqreqasiya ilə hesablanır — fərdi sahələr açıqlanmır.",
  },
];

export default function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="space-y-4">
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-teal sm:text-2xl">Tez-tez verilən suallar</h2>
      </div>

      <div className="mx-auto max-w-3xl divide-y divide-line overflow-hidden rounded-xl2 border border-line bg-panel shadow-soft">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <HelpCircle className="h-4 w-4 shrink-0 text-grass" aria-hidden="true" />
                <span className="flex-1 text-sm font-semibold text-slate-900">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <p className="pb-4 pl-11 pr-4 text-sm leading-relaxed text-slate-600">{item.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
