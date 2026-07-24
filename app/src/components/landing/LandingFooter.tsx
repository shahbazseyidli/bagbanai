"use client";

// W2 / E12 — closing CTA + footer of the approved landing redesign. Only routes that actually
// exist are linked (no 404s): /signup, /login, /pricing, /catalog, the four /solutions/* pages
// (built alongside this wave) and the in-page anchors.
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

const SOLUTIONS: Array<[string, string]> = [
  ["/solutions/fermer", "Fermerlər"],
  ["/solutions/laboratoriya", "Laboratoriyalar"],
  ["/solutions/konsultant", "Konsultantlar"],
  ["/solutions/techizatci", "Təchizatçılar"],
];

export default function LandingFooter() {
  return (
    <footer className="mt-14 bg-teal text-[#cfe3d8]">
      <div className="mx-auto w-full max-w-[1180px] px-5 pb-9 pt-12 sm:px-6">
        {/* closing CTA */}
        <div className="border-b border-white/10 pb-9 text-center">
          <h2 className="font-display text-[clamp(24px,3.4vw,30px)] font-bold text-white">
            Bu gün başla — rolunu seç
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[14.5px] text-[#a9cdbc]">
            Fermerlər üçün 1 ay pulsuz sınaq, kart tələb olunmur. Laboratoriya, konsultant və
            təchizatçılar pulsuz qoşulur.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="lp-btn lp-btn-white">
              Pulsuz qeydiyyat <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link href="/login" className="lp-btn lp-btn-teal-ghost">
              Daxil ol
            </Link>
          </div>
        </div>

        {/* link grid */}
        <div className="grid gap-6 pt-8 text-[13.5px] min-[920px]:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-2.5 flex items-center gap-2 font-display text-[19px] font-bold text-white">
              <Leaf className="h-6 w-6 text-mint" aria-hidden="true" /> Bağban AI
            </div>
            <p className="text-[13px] text-[#9cc3b1]">
              Peyk, AI, dəftər və marketplace — bir platformada.
            </p>
            <p className="mt-3 text-[12px] text-[#7fae98]">
              Peyk mənbələri: NASA HLS · Sentinel-2 (Copernicus) · Hava: Open-Meteo
            </p>
          </div>

          <div>
            <h5 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-white">
              Məhsul
            </h5>
            <a href="#imkanlar" className="lp-flink">İmkanlar</a>
            <a href="#canli-demo" className="lp-flink">Canlı demo</a>
            <Link href="/pricing" className="lp-flink">Qiymətlər</Link>
          </div>

          <div>
            <h5 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-white">
              Həllər
            </h5>
            {SOLUTIONS.map(([href, label]) => (
              <Link key={href} href={href} className="lp-flink">
                {label}
              </Link>
            ))}
          </div>

          <div>
            <h5 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-white">
              Hesab
            </h5>
            <Link href="/signup" className="lp-flink">Pulsuz qeydiyyat</Link>
            <Link href="/login" className="lp-flink">Daxil ol</Link>
            <Link href="/catalog" className="lp-flink">Provayder kataloqu</Link>
          </div>
        </div>

        <p className="mt-8 border-t border-white/10 pt-5 text-[12px] text-[#7fae98]">
          © {new Date().getFullYear()} Bağban AI · agradex.com
        </p>
      </div>
    </footer>
  );
}
