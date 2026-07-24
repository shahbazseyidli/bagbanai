"use client";

// W2 / E12 — the signed-out landing page, rebuilt against the approved redesign mockup
// (artifact c5e155e7): hero → proof marquee → live hero visual → roles → stats → module tour →
// why-us + comparison → testimonials → FAQ → closing CTA + footer.
//
// The hero visual is NOT the mockup's CSS fake: it is the real anonymous tap-to-detect map
// (LandingHeroMap) with the real NDVI reading, live weather and the localStorage draft that is
// carried into /signup. That flow is the product's best hook and must keep working.
//
// The design tokens live in globals.css / tailwind.config.ts; the small block below only holds
// what utilities cannot express (keyframes, gradient text, masks, a few composite pieces). It is
// scoped with an `lp-` prefix so it cannot collide with the app shell.
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import LandingHeroMap from "./LandingHeroMap";
import LandingFaq from "./LandingFaq";
import LandingFooter from "./LandingFooter";
import { Marquee, ModuleRows, RoleCards, StatsStrip, Testimonials, WhyUs } from "./LandingSections";

const LP_CSS = `
/* full-bleed out of the app shell's max-w-6xl main; body already clips overflow-x */
.lp-root{position:relative;left:50%;right:50%;margin-left:-50vw;margin-right:-50vw;width:100vw}
.lp-ink{color:var(--brand-ink)}
.lp-ink2{color:var(--brand-ink-2)}
.lp-muted{color:var(--brand-muted)}
.lp-eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--green)}
.lp-accent{background:linear-gradient(100deg,var(--green),#4bbd7a);-webkit-background-clip:text;background-clip:text;color:transparent}

/* buttons — 48px targets, pill shape */
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 22px;border-radius:999px;font-weight:600;font-size:15px;line-height:1;transition:background .15s,box-shadow .15s,border-color .15s,transform .06s}
.lp-btn:active{transform:translateY(1px)}
.lp-btn-pri{background:var(--green);color:#fff;box-shadow:0 6px 16px rgba(30,152,82,.28)}
.lp-btn-pri:hover{background:var(--green-deep);box-shadow:0 10px 24px rgba(30,152,82,.34)}
.lp-btn-ghost{background:transparent;color:var(--brand-ink);border:1.5px solid var(--line-2)}
.lp-btn-ghost:hover{border-color:var(--brand-ink)}
.lp-btn-white{background:#fff;color:var(--teal)}
.lp-btn-white:hover{background:#eaf3ee}
.lp-btn-teal-ghost{background:transparent;color:#eaf3ee;border:1.5px solid rgba(255,255,255,.28)}
.lp-btn-teal-ghost:hover{border-color:#fff;color:#fff}
.lp-link{color:var(--green)}
.lp-link:hover{color:var(--green-deep)}
.lp-flink{display:block;padding:6px 0;color:#a9cdbc;min-height:32px}
.lp-flink:hover{color:#fff}

/* hero orbs */
@keyframes lpFloat1{0%,100%{transform:translateY(0)}50%{transform:translateY(30px) translateX(18px)}}
@keyframes lpFloat2{0%,100%{transform:translateY(0)}50%{transform:translateY(-26px) translateX(-16px)}}
.lp-orb{position:absolute;border-radius:50%}
.lp-orb-a{animation:lpFloat1 14s ease-in-out infinite}
.lp-orb-b{animation:lpFloat2 17s ease-in-out infinite}
.lp-orb-c{animation:lpFloat1 20s ease-in-out infinite}

/* proof marquee */
@keyframes lpScrollX{to{transform:translateX(-50%)}}
.lp-track{animation:lpScrollX 26s linear infinite}
.lp-mask{-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.lp-mq{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:var(--panel);border:1px solid var(--line);font-size:13.5px;font-weight:600;color:var(--brand-ink-2);white-space:nowrap}

@media (prefers-reduced-motion: reduce){
  .lp-orb-a,.lp-orb-b,.lp-orb-c,.lp-track{animation:none !important}
  .lp-role:hover{transform:none}
}

/* surfaces */
.lp-frame{box-shadow:var(--sh-lg)}
.lp-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--sh-sm)}
.lp-card-hl{background:linear-gradient(165deg,#eaf7ef,#fff);border-color:#bfe6cd}
.lp-role{box-shadow:var(--sh);transition:transform .15s}
.lp-role:hover{transform:translateY(-4px)}

/* chips, pills, tags */
.lp-chip{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 12px;border-radius:999px;background:var(--panel);border:1.5px solid var(--line);font-size:13px;font-weight:600;color:var(--brand-ink-2)}
.lp-pill{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:0 11px;border-radius:999px;font-size:12.5px;font-weight:600}
.lp-pill-good{background:var(--mint-soft);color:#166b3b}
.lp-pill-warn{background:var(--amber-soft);color:#8a5f08}
.lp-pill-neutral{background:var(--panel-2);color:var(--brand-ink-2)}
.lp-pill-blue{background:#e9f1fb;color:#215a95}
.lp-tag{font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;background:var(--panel-2);color:var(--brand-ink-2)}
.lp-logo{width:52px;height:52px;border-radius:13px;display:grid;place-items:center;color:#fff;flex:none;font-weight:800;font-size:15px}
.lp-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(150deg,#6aa77f,#2f6b45);color:#fff;display:grid;place-items:center;font-weight:700;flex:none}

/* NDVI ramp used by the hero legend */
.lp-ramp{height:8px;border-radius:4px;background:linear-gradient(90deg,var(--ndvi-1),var(--ndvi-2),var(--ndvi-3),var(--ndvi-4),var(--ndvi-5))}

/* composite blocks reused inside the module shots + hero strip */
.lp-aichip{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:12.5px;color:var(--brand-ink-2);box-shadow:var(--sh-sm)}
.lp-aichip-h{display:flex;align-items:center;gap:7px;font-weight:700;color:var(--green);margin-bottom:5px;font-size:12px}
.lp-verdict{border-radius:var(--r);padding:14px;display:flex;gap:12px;align-items:flex-start;background:linear-gradient(150deg,#fbf3df,#fff);border:1px solid #ecdcb0}
.lp-verdict-ico{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;flex:none;background:var(--amber-soft);color:#8a5f08}
.lp-peer{border:1px dashed #bcd9c6;background:var(--mint-soft);border-radius:var(--r);padding:12px 14px;display:flex;gap:12px;align-items:center}
.lp-peer-av{width:30px;height:30px;border-radius:50%;border:2px solid #fff;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:700}
.lp-callout{background:var(--mint-soft);border:1px solid #cfebd8;border-radius:var(--r);padding:13px 15px;font-size:13.5px;color:#1c5c39;display:flex;gap:10px;align-items:flex-start}
`;

export default function PublicLanding() {
  return (
    <div className="lp-root -mb-24 -mt-6 bg-paper md:-mb-6">
      <style dangerouslySetInnerHTML={{ __html: LP_CSS }} />

      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden px-5 pb-4 pt-12 text-center sm:pt-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-48 bottom-0 z-0 opacity-[0.55] blur-[50px]"
        >
          <span
            className="lp-orb lp-orb-a left-[8%] top-0 h-[420px] w-[420px]"
            style={{ background: "radial-gradient(circle,#8DE0A9,transparent 68%)" }}
          />
          <span
            className="lp-orb lp-orb-b right-[6%] top-[6%] h-[360px] w-[360px]"
            style={{ background: "radial-gradient(circle,#7fd0c8,transparent 68%)" }}
          />
          <span
            className="lp-orb lp-orb-c left-[44%] top-[24%] h-[300px] w-[300px]"
            style={{ background: "radial-gradient(circle,#e9d27a,transparent 70%)" }}
          />
        </div>

        <div className="relative z-[1] mx-auto max-w-[1180px]">
          <p className="lp-eyebrow">peyk · ai · dəftər · icma</p>
          <h1 className="lp-ink mt-4 font-display text-[clamp(34px,6vw,66px)] font-bold leading-[1.06] tracking-[-0.03em]">
            Torpağını peykdən gör,
            <br />
            <span className="lp-accent">hər manatı hesabla.</span>
          </h1>
          <p className="lp-ink2 mx-auto mt-5 max-w-[660px] text-[clamp(16px,2vw,20px)]">
            NASA və Sentinel-2 peyk indeksləri, AI aqronom, təsərrüfat dəftəri — üstəlik
            laboratoriya, konsultant və təchizatçıların bir yerdə olduğu platforma. Fermerlər,
            kooperativlər və aqronomlar üçün.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="lp-btn lp-btn-pri">
              1 ay pulsuz başla <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <a href="#canli-demo" className="lp-btn lp-btn-ghost">
              <Play className="h-5 w-5" aria-hidden="true" /> Demo izlə
            </a>
          </div>
          <p className="lp-muted mt-5 text-[13px]">
            🎁 <b className="text-grass">1 ay pulsuz sınaq</b> · kart tələb olunmur · provayderlər
            pulsuz qoşulur · fındıq və bağlar üçün kalibrlənib
          </p>
        </div>
      </section>

      {/* --------------------------------------------------- proof marquee */}
      <Marquee />

      {/* ------------------------------------------- hero visual (live map) */}
      <section id="canli-demo" className="scroll-mt-24 px-5 pb-2 pt-2 sm:px-6">
        <LandingHeroMap />
        <p className="lp-muted mx-auto mt-3 max-w-[980px] text-center text-[12.5px]">
          Yuxarıdakı xəritə canlıdır — kəndinizi axtarın, tarlanıza toxunun və peyk oxunuşunu
          qeydiyyatsız görün.
        </p>
      </section>

      {/* --------------------------------------------------------- sections */}
      <RoleCards />
      <StatsStrip />
      <div id="imkanlar" className="scroll-mt-24">
        <ModuleRows />
      </div>
      <WhyUs />
      <Testimonials />
      <LandingFaq />
      <LandingFooter />
    </div>
  );
}
