"use client";

// W2 / E12 — the static marketing sections of the approved landing redesign (artifact c5e155e7):
// role cards → stats → module tour → why-us + comparison → testimonials.
// Copy is Azerbaijani inline (the redesign copy is not in the i18n dictionary yet — the T18 sweep
// extracts it); code/identifiers stay English.
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  FlaskConical,
  Layers,
  Package,
  Sparkles,
  Sprout,
  TriangleAlert,
  Users,
} from "lucide-react";

/* ------------------------------------------------------------------ shared */

export function Wrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1180px] px-5 sm:px-6 ${className}`}>{children}</div>;
}

export function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-[660px] text-center">
      {eyebrow && <p className="lp-eyebrow">{eyebrow}</p>}
      <h2 className="lp-ink mt-3 font-display text-[clamp(26px,3.6vw,40px)] font-bold leading-[1.1] tracking-[-0.022em]">
        {title}
      </h2>
      {sub && <p className="lp-ink2 mt-3 text-[17px]">{sub}</p>}
    </div>
  );
}

function Tick() {
  return (
    <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-soft text-grass-deep">
      <Check className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}

/* -------------------------------------------------------------- role cards */

const ROLES = [
  {
    href: "/solutions/fermer",
    title: "Fermer",
    body: "Peyk monitorinq, AI aqronom, su balansı, dəftər. Provayderlərə platformadan müraciət et.",
    cta: "Fermerlər üçün",
    gradient: "linear-gradient(165deg,#3c6b45,#1c3d27)",
    Icon: Sprout,
  },
  {
    href: "/solutions/laboratoriya",
    title: "Laboratoriya",
    body: "Torpaq nümunə xidmətini fermerlərə çatdır — kataloqda görün, sifariş al.",
    cta: "Laboratoriyalar üçün",
    gradient: "linear-gradient(165deg,#2f6ca8,#123a5e)",
    Icon: FlaskConical,
  },
  {
    href: "/solutions/konsultant",
    title: "Konsultant",
    body: "Təcrübəni miqyasla — çox-müştəri idarəetmə, sübut hesabatları, AI dəstəyi.",
    cta: "Konsultantlar üçün",
    gradient: "linear-gradient(165deg,#7a5bd0,#3a2668)",
    Icon: Users,
  },
  {
    href: "/solutions/techizatci",
    title: "Təchizatçı",
    body: "Toxum, gübrə, dərman kataloqunu yerləşdir — fermerlərə çat, birbaşa tələb al.",
    cta: "Təchizatçılar üçün",
    gradient: "linear-gradient(165deg,#c07a1f,#5e360f)",
    Icon: Package,
  },
];

export function RoleCards() {
  return (
    <Wrap className="py-14 sm:py-16">
      <SectionHead
        eyebrow="bir platforma · dörd rol"
        title="Kim üçün?"
        sub="Fermerlər, laboratoriyalar, konsultantlar və təchizatçılar bir ekosistemdə görüşür."
      />
      <div className="grid gap-4 min-[920px]:grid-cols-4">
        {ROLES.map(({ href, title, body, cta, gradient, Icon }) => (
          <Link
            key={href}
            href={href}
            className="lp-role relative flex min-h-[230px] flex-col justify-end overflow-hidden rounded-xl2 p-6 text-white"
            style={{ backgroundImage: gradient }}
          >
            <span className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="font-display text-[19px] font-semibold">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-snug text-white/85">{body}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/90">
              {cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
      <p className="lp-muted mt-4 text-center text-[13px]">
        Laboratoriya, konsultant və təchizatçılar platformaya <b className="text-grass">pulsuz</b>{" "}
        qoşulur — abunə yalnız fermerlər üçündür.
      </p>
    </Wrap>
  );
}

/* ------------------------------------------------------------------ stats */

const STATS = [
  { n: "2", l: "peyk (NASA + Sentinel-2)" },
  { n: "10m", l: "ən yüksək dəqiqlik" },
  { n: "9", l: "vegetasiya indeksi" },
  { n: "4", l: "rol · 4 dil" },
  { n: "2-3 gün", l: "yeni peyk yeniləməsi" },
];

export function StatsStrip() {
  return (
    <Wrap>
      <div className="grid gap-4 rounded-xl2 bg-teal px-6 py-8 text-center shadow-soft min-[920px]:grid-cols-5">
        {STATS.map((s) => (
          <div key={s.l}>
            <b className="block font-display text-[30px] font-bold text-white">{s.n}</b>
            <span className="text-[12.5px] text-[#9dc6b3]">{s.l}</span>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

/* ------------------------------------------------------------ module tour */

function ModText({
  eyebrow,
  title,
  lead,
  points,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  points: string[];
}) {
  return (
    <div>
      <p className="lp-eyebrow">{eyebrow}</p>
      <h3 className="lp-ink mt-2.5 font-display text-[clamp(22px,2.6vw,30px)] font-bold leading-[1.12] tracking-[-0.022em]">
        {title}
      </h3>
      <p className="lp-ink2 mt-3 text-[16.5px]">{lead}</p>
      <ul className="mt-4 grid gap-2.5">
        {points.map((p) => (
          <li key={p} className="lp-ink2 flex items-start gap-2.5 text-[14.5px]">
            <Tick />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Shot({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="lp-card overflow-hidden">
      <div className="lp-ink2 flex h-[38px] items-center gap-2 border-b border-line bg-panel-2 px-4 text-[12.5px] font-semibold">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ModRow({ reverse, text, shot }: { reverse?: boolean; text: React.ReactNode; shot: React.ReactNode }) {
  return (
    <div className="grid items-center gap-8 py-8 min-[920px]:grid-cols-2 min-[920px]:gap-11">
      <div className={reverse ? "min-[920px]:order-2" : ""}>{text}</div>
      <div className={reverse ? "min-[920px]:order-1" : ""}>{shot}</div>
    </div>
  );
}

export function ModuleRows() {
  return (
    <Wrap className="py-14 sm:py-16">
      <SectionHead eyebrow="imkanlar" title="Peykdən yığıma qədər — və bir addım o yana" />

      {/* 1 — satellite monitoring */}
      <ModRow
        text={
          <ModText
            eyebrow="peyk monitorinq"
            title="Bitki sağlamlığını hər 2-3 gündə izlə"
            lead="NDVI, NDMI, NDRE + 6 indeks — piksel-səviyyəli overlay. Stresi yayılmadan tut."
            points={[
              "NASA HLS 30m + Sentinel-2 10m",
              "Kontrast rejimi + rayon benchmark bandı",
              "Bulud filtri, timeline, iki-tarix müqayisə",
            ]}
          />
        }
        shot={
          <Shot title="Sentinel-2 · NDVI trend">
            <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="h-[120px] w-full" role="img" aria-label="NDVI trend qrafiki">
              <defs>
                <linearGradient id="lpSpark1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#8DE0A9" stopOpacity="0.5" />
                  <stop offset="1" stopColor="#8DE0A9" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,80 C40,60 60,50 90,52 C130,55 150,40 190,44 C230,48 250,70 290,78 L320,82 L320,120 L0,120Z"
                fill="url(#lpSpark1)"
              />
              <path
                d="M0,80 C40,60 60,50 90,52 C130,55 150,40 190,44 C230,48 250,70 290,78 L320,82"
                stroke="#1E9852"
                strokeWidth="2.4"
                fill="none"
              />
            </svg>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
              <span className="lp-pill lp-pill-warn">Orta · düşür ↓</span>
              <span className="lp-muted ml-auto text-[13px]">Ən son: 0.47 · 10 sent</span>
            </div>
          </Shot>
        }
      />

      {/* 2 — AI agronomist */}
      <ModRow
        reverse
        text={
          <ModText
            eyebrow="ai aqronom · foto · torpaq"
            title="Şəkil çək — AI özü tanısın və analiz etsin"
            lead="Sahə, məhsul və ya ağac şəklini çək; AI nə olduğunu tanıyır, adlandırır və məsləhətdə nəzərə alır. Torpaq analizini yüklə — AI ona da baxsın."
            points={[
              "Foto auto-diaqnoz: xəstəlik/zərərverici tanıma",
              "Torpaq analizi upload → AI kontekstinə daxil",
              "Səsləndir — oxumaq lazım deyil",
            ]}
          />
        }
        shot={
          <Shot title="AI Məsləhət · Xudat fındıq">
            <div className="lp-verdict mb-3">
              <span className="lp-verdict-ico">
                <TriangleAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h4 className="lp-ink font-display text-[15.5px] font-semibold">
                  Fındıq orta — diqqət tələb olunur
                </h4>
                <p className="lp-ink2 mt-1 text-[13px]">
                  Foto: yarpaqda fındıq qurdu izi · torpaq pH 6.2, azot aşağı.
                </p>
              </div>
            </div>
            <div className="lp-peer">
              <span className="flex shrink-0">
                <span className="lp-peer-av" style={{ background: "#3c6b45" }}>A</span>
                <span className="lp-peer-av -ml-2" style={{ background: "#c07a1f" }}>R</span>
                <span className="lp-peer-av -ml-2" style={{ background: "#2f6ca8" }}>E</span>
              </span>
              <p className="text-[12.5px] text-[#1c5c39]">
                <b className="text-grass-deep">Eyni bölgədə fındıq əkən 3 fermer</b> bu problemlə
                üzləşib — məsləhətləş.
              </p>
            </div>
            <p className="lp-muted mt-2 flex items-center gap-1.5 text-[11.5px]">
              <Camera className="h-3.5 w-3.5" aria-hidden="true" /> Nümunə ekran — real sahə
              məlumatı ilə doldurulur.
            </p>
          </Shot>
        }
      />

      {/* 3 — farm ledger */}
      <ModRow
        text={
          <ModText
            eyebrow="təsərrüfat dəftəri · gübrə"
            title="Hər sahə nə qazandı — və nə qədər gübrə lazımdır"
            lead="Xərc/gəlir per-sahə mənfəət. Gübrələmə qrafikini əlavə et, AI NDVI + torpaq analizinə görə doza təklif etsin."
            points={[
              "Xərc / Gəlir / Mənfəət — sahə və mövsüm üzrə",
              "Gübrə qrafiki + AI doza təklifi",
              "Qəbz fotosundan avto xərc girişi",
            ]}
          />
        }
        shot={
          <Shot title="Gübrə · AI təklif">
            <div className="lp-callout mb-3">
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                NDVI + torpaq analizinə görə: <b>şimal zonaya 30% az azot</b>, cənub zonaya
                standart doza.
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] border border-line p-3.5">
                <span className="lp-muted text-[12px]">Mənfəət/ha</span>
                <b className="mt-1 block font-display text-[22px] font-bold tabular-nums text-grass">
                  580 ₼
                </b>
              </div>
              <div className="rounded-[14px] border border-line p-3.5">
                <span className="lp-muted text-[12px]">Növbəti gübrə</span>
                <b className="lp-ink mt-1 block font-display text-[15px] font-semibold">28 iyul</b>
              </div>
            </div>
          </Shot>
        }
      />

      {/* 4 — marketplace + community */}
      <ModRow
        reverse
        text={
          <ModText
            eyebrow="marketplace · icma"
            title="Laboratoriya, konsultant, təchizatçı — və digər fermerlər"
            lead="Kataloqdan xidmət provayderi seç, birbaşa yaz. Fermer icmasında eyni məhsulu əkənlərlə məsləhətləş."
            points={[
              "Provayder kataloqu (ölkə/region/ixtisas filtri)",
              "Rol-arası + fermer-fermer mesajlaşma",
              "Problem anında peer-təklif: “yaxın fermerlə danış”",
            ]}
          />
        }
        shot={
          <Shot title="Kataloq">
            <div className="flex gap-3.5">
              <span className="lp-logo" style={{ background: "#2f6ca8" }}>AT</span>
              <div>
                <h4 className="lp-ink flex items-center gap-2 font-display text-[16px] font-semibold">
                  AqroTest Laboratoriya <span className="text-[13px] text-[#e0a83b]">★ 4.8</span>
                </h4>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="lp-tag">Torpaq analizi</span>
                  <span className="lp-tag">Xaçmaz</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3.5">
              <span className="lp-logo" style={{ background: "#c07a1f" }}>GM</span>
              <div>
                <h4 className="lp-ink flex items-center gap-2 font-display text-[16px] font-semibold">
                  GübrəMarket <span className="text-[13px] text-[#e0a83b]">★ 4.6</span>
                </h4>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="lp-tag">Gübrə</span>
                  <span className="lp-tag">Toxum</span>
                  <span className="lp-tag">Quba</span>
                </div>
              </div>
            </div>
            <Link
              href="/catalog"
              className="lp-link mt-4 inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-semibold"
            >
              Kataloqa bax <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Shot>
        }
      />
    </Wrap>
  );
}

/* ----------------------------------------------------------------- why us */

const CMP: Array<[string, string, string, string]> = [
  ["Azərbaycan dili · fındıq üçün kalibrləmə", "yox", "yox", "var"],
  ["AI aqronom + foto-diaqnoz", "məhdud", "yox", "var"],
  ["Təsərrüfat dəftəri (xərc/gəlir)", "yox", "var", "var"],
  ["Marketplace (lab/təchizatçı) + icma", "qismən", "yox", "var"],
];

function CmpCell({ v }: { v: string }) {
  if (v === "var")
    return (
      <span className="inline-flex items-center gap-1 font-bold text-grass">
        <Check className="h-4 w-4" aria-hidden="true" /> var
      </span>
    );
  return <span className="lp-muted">{v}</span>;
}

export function WhyUs() {
  return (
    <Wrap className="py-14 sm:py-16">
      <SectionHead
        eyebrow="niyə bağban"
        title="Üç dünyanı birləşdirir"
        sub="Peyk platformalarının gözü, ferma-idarəetmə proqramlarının dəftəri, AI aqronom — üstəlik marketplace."
      />
      <div className="grid gap-4 min-[920px]:grid-cols-3">
        <div className="lp-card p-6">
          <span className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9f1fb] text-[#215a95]">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </span>
          <h4 className="lp-ink font-display text-[17px] font-semibold">Peyk gözü</h4>
          <p className="lp-ink2 mt-1.5 text-[13.5px]">
            Piksel-səviyyəli NDVI, zonalar, kontrast rejimi — üstəlik Azərbaycan bölgələri üçün
            benchmark.
          </p>
        </div>
        <div className="lp-card p-6">
          <span className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--amber-soft)] text-[#8a5f08]">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <h4 className="lp-ink font-display text-[17px] font-semibold">Təsərrüfat dəftəri</h4>
          <p className="lp-ink2 mt-1.5 text-[13.5px]">
            Xərc, gəlir, per-sahə mənfəət — peyk məlumatı ilə eyni ekranda.
          </p>
        </div>
        <div className="lp-card lp-card-hl p-6">
          <span className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-grass text-white">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <h4 className="lp-ink font-display text-[17px] font-semibold">AI + Marketplace</h4>
          <p className="lp-ink2 mt-1.5 text-[13.5px]">
            AI aqronom + laboratoriya/konsultant/təchizatçı kataloqu + fermer icması — bir yerdə.
          </p>
        </div>
      </div>

      <div className="lp-card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-[14px]">
            <thead>
              <tr>
                <th className="lp-ink2 border-b border-line bg-panel-2 px-4 py-3 text-left text-[13px] font-semibold">
                  Xüsusiyyət
                </th>
                <th className="lp-ink2 border-b border-line bg-panel-2 px-4 py-3 text-center text-[13px] font-semibold">
                  OneSoil
                </th>
                <th className="lp-ink2 border-b border-line bg-panel-2 px-4 py-3 text-center text-[13px] font-semibold">
                  Farmbrite
                </th>
                <th className="border-b border-line bg-panel-2 px-4 py-3 text-center text-[13px] font-semibold text-grass">
                  Bağban AI
                </th>
              </tr>
            </thead>
            <tbody>
              {CMP.map(([feature, a, b, c]) => (
                <tr key={feature}>
                  <td className="lp-ink2 border-b border-line px-4 py-3">{feature}</td>
                  <td className="border-b border-line px-4 py-3 text-center">
                    <CmpCell v={a} />
                  </td>
                  <td className="border-b border-line px-4 py-3 text-center">
                    <CmpCell v={b} />
                  </td>
                  <td className="border-b border-line px-4 py-3 text-center">
                    <CmpCell v={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="lp-muted mt-3 text-center text-[12px]">
        Müqayisə 2026-cı ilin açıq məlumatlarına əsaslanır — rəqiblərin funksiyaları dəyişə bilər.
      </p>
    </Wrap>
  );
}

/* ----------------------------------------------------------- testimonials */

const TESTIS = [
  {
    q: "Peykdən sahəni görüb, elə oradaca gübrə satıcısına yazdım. Hər şey bir yerdə.",
    n: "Elşən M.",
    r: "Fındıq · Xaçmaz · 8 ha",
  },
  {
    q: "AI şəkildən xəstəliyi tanıdı, yaxın fermerlə də məsləhətləşdim. Məhsulu xilas etdim.",
    n: "Rəşad Q.",
    r: "Üzüm · Şamaxı · 5 ha",
  },
  {
    q: "Konsultant kimi 40 sahəni bir ekranda idarə edirəm, hesabatları müştərilərə göndərirəm.",
    n: "Səbinə A.",
    r: "Aqro-konsultant · Gəncə",
  },
];

export function Testimonials() {
  return (
    <Wrap className="py-14 sm:py-16">
      <SectionHead title="Fermerlər nə deyir" />
      <div className="grid gap-4 min-[920px]:grid-cols-3">
        {TESTIS.map((t2) => (
          <div key={t2.n} className="lp-card p-6">
            <p className="lp-ink text-[15px] leading-[1.55]">“{t2.q}”</p>
            <div className="mt-4 flex items-center gap-2.5">
              <span className="lp-avatar">{t2.n.slice(0, 1)}</span>
              <div>
                <div className="lp-ink text-[14px] font-semibold">{t2.n}</div>
                <div className="lp-muted text-[12px]">{t2.r}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="lp-muted mt-4 text-center text-[12px]">
        Nümunə istifadə ssenariləri — real fermer rəyləri pilot bitdikcə əlavə olunacaq.
      </p>
    </Wrap>
  );
}

/* --------------------------------------------------------------- marquee */

const CHIPS = [
  { e: "🛰️", b: "2 peyk", t: "NASA + Sentinel-2" },
  { e: "🌰", b: "", t: "Fındıq üçün kalibrlənib" },
  { e: "🧪", b: "Laboratoriyalar", t: "" },
  { e: "👨‍🌾", b: "", t: "Fermer icması" },
  { e: "📊", b: "", t: "Təsərrüfat dəftəri" },
  { e: "🤖", b: "", t: "AI aqronom" },
  { e: "🌍", b: "4 dil", t: "" },
  { e: "📦", b: "", t: "Təchizatçı kataloqu" },
];

export function Marquee() {
  const row = [...CHIPS, ...CHIPS];
  return (
    <div className="lp-mask overflow-hidden py-4" aria-hidden="true">
      <div className="lp-track flex w-max gap-3.5">
        {row.map((c, i) => (
          <span key={`${c.e}-${i}`} className="lp-mq">
            <span>{c.e}</span>
            {c.b && <b className="text-grass">{c.b}</b>}
            {c.t}
          </span>
        ))}
      </div>
    </div>
  );
}
