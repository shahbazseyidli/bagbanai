"use client";

// W2 / E12 — FAQ accordion from the approved landing redesign. Answers stay factual: the prices
// mirror app/src/lib/pricing.ts (10 / 25 AZN per month), providers join free, trial is one month.
import { useState } from "react";
import { Plus } from "lucide-react";
import { SectionHead, Wrap } from "./LandingSections";

const QA: Array<{ q: string; a: string }> = [
  {
    q: "Neçəyə başa gəlir?",
    a: "Peyk sağlamlıq xəritəsi və hava proqnozu həmişə pulsuzdur. AI aqronom, təsərrüfat dəftəri və marketplace üçün Paket 2 (10 ₼/ay) və Paket 3 (25 ₼/ay) var. Hektar limiti yoxdur.",
  },
  {
    q: "1 ay pulsuz sınaq necə işləyir?",
    a: "Qeydiyyatdan sonra ödənişli funksiyalar 1 ay pulsuz açılır — kart məlumatı tələb olunmur. Ay bitəndə heç nə avtomatik çıxılmır: ya paket seçirsiniz, ya da pulsuz rejimdə davam edirsiniz.",
  },
  {
    q: "Provayder kimi necə qoşulum?",
    a: "Qeydiyyatda rolunuzu seçin (laboratoriya / konsultant / təchizatçı), profil və xidmətlərinizi əlavə edin — kataloqda görünəcəksiniz. Provayderlər üçün qoşulma pulsuzdur; abunə yalnız fermerlər üçündür.",
  },
  {
    q: "Məlumatımı kim görür?",
    a: "Şəxsi məlumatınız satılmır. Sahə məlumatları yalnız sizin təşkilatınıza aiddir; provayderlə əlaqə yalnız siz yazışmağa başlayanda yaranır. Bölgə müqayisəsi anonim və toplu şəkildə hesablanır.",
  },
];

export default function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Wrap className="py-14 sm:py-16">
      <SectionHead title="Tez-tez verilən suallar" />
      <div className="mx-auto max-w-[760px]">
        {QA.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="border-b border-line">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="lp-ink flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-[16.5px] font-semibold"
              >
                {item.q}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel-2 transition-transform duration-200 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                  aria-hidden="true"
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              <div
                className={`lp-ink2 overflow-hidden text-[14.5px] transition-[max-height] duration-300 ${
                  isOpen ? "max-h-72 pb-4" : "max-h-0"
                }`}
              >
                {item.a}
              </div>
            </div>
          );
        })}
      </div>
    </Wrap>
  );
}
