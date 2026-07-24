import { Sprout, Users2, GraduationCap, Mail, Info } from "lucide-react";

// C3 — three farmer discount programmes shown under the plans. These are MARKETING cards only:
// there is NO discount-code system in the backend, so the CTA is a plain mailto to support and the
// discount is applied by hand after review (see the honest note under the cards). Copy is inline
// Azerbaijani pending the T18 i18n sweep — the marketing surface hard-codes copy today (cf.
// components/ui/SupportCard.tsx).
const SUPPORT_EMAIL = "info@agradex.com";

interface Programme {
  icon: typeof Sprout;
  title: string;
  badge: string;
  who: string;
  body: string;
  subject: string; // mailto subject — the operator applies the discount manually after review
}

const PROGRAMMES: Programme[] = [
  {
    icon: Sprout,
    title: "Gənc fermer",
    badge: "−50%",
    who: "40 yaşa qədər fermerlər",
    body: "40 yaşa qədər və ya yeni başlayan fermerlər üçün Pro və Business paketlərində 50% endirim. Peyk xəritəsi və hava onsuz da pulsuzdur.",
    subject: "Bağban AI — Gənc fermer endirimi (−50%)",
  },
  {
    icon: Users2,
    title: "Kooperativ / birlik",
    badge: "Toplu qiymət",
    who: "Fermer kooperativləri",
    body: "Kooperativlər və fermer birlikləri üçün birdən çox təsərrüfatı bir hesabda idarə edən toplu qiymət. Üzv sayına görə fərdi təklif hazırlayırıq.",
    subject: "Bağban AI — Kooperativ / birlik təklifi",
  },
  {
    icon: GraduationCap,
    title: "Tələbə-aqronom",
    badge: "Güzəştli",
    who: "Aqronomluq tələbələri",
    body: "Aqronomluq və əkinçilik üzrə təhsil alan tələbələr üçün güzəştli qiymət. Tələbə statusunu təsdiq edən sənədlə müraciət edin.",
    subject: "Bağban AI — Tələbə-aqronom endirimi",
  },
];

export default function DiscountCards() {
  return (
    <section className="space-y-4">
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-teal sm:text-2xl">Endirim proqramları</h2>
        <p className="mx-auto mt-1 max-w-2xl text-sm text-slate-600">
          Fermerlər üçün güzəştlər. Müraciət edin — uyğunluğu yoxlayıb paketinizə tətbiq edək.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PROGRAMMES.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="flex flex-col rounded-xl2 border border-line bg-panel p-5 shadow-soft"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-grass">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-mint-soft px-2.5 py-0.5 text-xs font-bold text-grass">
                  {p.badge}
                </span>
              </div>
              <h3 className="mt-3 font-display text-lg font-bold text-slate-900">{p.title}</h3>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{p.who}</p>
              <p className="mt-2 flex-1 text-sm text-slate-600">{p.body}</p>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(p.subject)}`}
                className="btn-primary mt-4"
              >
                <Mail className="h-4 w-4" aria-hidden="true" /> Müraciət et
              </a>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-line bg-panel-2 px-4 py-3 text-xs text-slate-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <span>
          Endirimlər avtomatik tətbiq olunmur. Müraciətinizi yoxladıqdan sonra komandamız endirimi
          hesabınıza əl ilə tətbiq edir.
        </span>
      </div>
    </section>
  );
}
