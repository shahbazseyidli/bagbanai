// B-legal — the shared renderer for /privacy and /terms.
//
// Async SERVER COMPONENT: it must never be imported from a client component. Translation goes
// through getT() (the x-locale request header) rather than the client t(), whose module-level locale
// is set by LocaleProvider and is therefore still "az" while the server renders — which is exactly
// how a crawler, or a reader with JS off, would have seen an Azerbaijani privacy policy on /de.
// Interpolation is a plain .replace() for the same reason: tf() reads that same client-side locale.
import Link from "next/link";
import { AlertTriangle, Mail } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { LEGAL_UPDATED } from "./types";
import type { LegalBlock, LegalDoc } from "./types";

/** Already the product's support address (see components/ui/SupportCard.tsx). */
const LEGAL_EMAIL = "info@agradex.com";

function Blocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === "p") {
          return (
            <p key={i} className="mt-3 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">
              {b.text}
            </p>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={i} className="mt-3 space-y-2">
              {b.items.map((item, j) => (
                <li
                  key={j}
                  className="relative pl-5 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]"
                >
                  <span
                    className="absolute left-0 top-[9px] h-1.5 w-1.5 rounded-full bg-grass"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        // kv — the processor table. It is the widest thing on the page, so it scrolls inside its own
        // box rather than pushing the body sideways on a 375px screen.
        return (
          <div key={i} className="mt-4 overflow-x-auto rounded-xl2 border border-line bg-panel">
            <dl className="min-w-[520px] divide-y divide-line">
              {b.rows.map((row, j) => (
                <div key={j} className="grid grid-cols-[190px_1fr] gap-4 p-4">
                  <dt className="text-[14px] font-bold text-[color:var(--brand-ink)]">{row.k}</dt>
                  <dd className="text-[14px] leading-relaxed text-[color:var(--brand-ink-2)]">
                    {row.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </>
  );
}

export default async function LegalArticle<Id extends string>({
  doc,
  ids,
  kind,
}: {
  doc: LegalDoc<Id>;
  /** Anchor + table-of-contents order. Comes from PRIVACY_IDS / TERMS_IDS, never from the locale
   *  file, so eight translations cannot drift apart on ids or ordering. */
  ids: readonly Id[];
  kind: "privacy" | "terms";
}) {
  const t = await getT();
  const [contactBefore, contactAfter] = t("mkt.legal.contactBody").split("{email}");
  const crossHref = kind === "privacy" ? "/terms" : "/privacy";
  const crossLabel = kind === "privacy" ? t("mkt.legal.crossTerms") : t("mkt.legal.crossPrivacy");

  return (
    <article className="mx-auto max-w-[760px] py-8">
      {/* ---------------------------------------------------------------- head */}
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--green)]">
        Agradex
      </p>
      <h1 className="mt-3 font-display text-[clamp(26px,3.6vw,38px)] font-bold leading-[1.15] text-[color:var(--brand-ink)]">
        {doc.title}
      </h1>
      <p className="mt-2 text-[13px] font-semibold text-[color:var(--brand-muted)]">
        {t("mkt.legal.updated").replace("{date}", LEGAL_UPDATED)}
      </p>

      {/* The banner lives HERE and not in either page, so it cannot be dropped from one document
          while surviving in the other. It sits above the fold on purpose. */}
      <aside className="mt-5 flex gap-3 rounded-xl2 border border-amber-300 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-bold text-amber-900">{t("mkt.legal.reviewTitle")}</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-amber-900">
            {t("mkt.legal.reviewNote").replace("{date}", LEGAL_UPDATED)}
          </p>
        </div>
      </aside>

      <p className="mt-6 text-[16px] leading-relaxed text-[color:var(--brand-ink-2)]">{doc.lead}</p>

      {/* ------------------------------------------------------------- summary */}
      <section className="mt-6 rounded-xl2 bg-mint-soft p-5">
        <h2 className="font-display text-[17px] font-bold text-grass-deep">
          {t("mkt.legal.summaryTitle")}
        </h2>
        <ul className="mt-3 space-y-2">
          {doc.summary.map((s, i) => (
            <li
              key={i}
              className="relative pl-5 text-[14.5px] leading-relaxed text-[color:var(--brand-ink-2)]"
            >
              <span
                className="absolute left-0 top-[9px] h-1.5 w-1.5 rounded-full bg-grass-deep"
                aria-hidden="true"
              />
              {s}
            </li>
          ))}
        </ul>
      </section>

      {/* ----------------------------------------------------------------- toc */}
      <nav className="mt-7 rounded-xl2 border border-line bg-panel p-5" aria-label={t("mkt.legal.toc")}>
        <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[color:var(--brand-muted)]">
          {t("mkt.legal.toc")}
        </h2>
        <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {ids.map((id, i) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="flex min-h-8 items-center gap-2 text-[14px] text-teal underline-offset-2 hover:underline"
              >
                <span className="text-[12px] font-bold text-[color:var(--brand-muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {doc.sections[id].heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ------------------------------------------------------------ sections */}
      {ids.map((id, i) => {
        const s = doc.sections[id];
        return (
          <section key={id} id={id} className="mt-9 scroll-mt-24">
            <h2 className="font-display text-[20px] font-bold leading-snug text-[color:var(--brand-ink)]">
              <span className="mr-2 text-[14px] font-bold text-[color:var(--brand-muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              {s.heading}
            </h2>
            <Blocks blocks={s.body} />
          </section>
        );
      })}

      {/* ------------------------------------------------------------- contact */}
      <section className="mt-10 rounded-xl2 border border-line bg-panel-2 p-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-grass-deep"
            aria-hidden="true"
          >
            <Mail className="h-5 w-5" />
          </span>
          <h2 className="font-display text-[17px] font-bold text-[color:var(--brand-ink)]">
            {t("mkt.legal.contactTitle")}
          </h2>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--brand-ink-2)]">
          {contactBefore}
          <a href={`mailto:${LEGAL_EMAIL}`} className="font-semibold text-teal underline underline-offset-2">
            {LEGAL_EMAIL}
          </a>
          {contactAfter}
        </p>
      </section>

      {/* ----------------------------------------------------------- also read */}
      <section className="mt-6">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[color:var(--brand-muted)]">
          {t("mkt.legal.alsoRead")}
        </h2>
        <Link
          href={crossHref}
          className="mt-2 inline-flex min-h-11 items-center text-[15px] font-bold text-teal underline-offset-2 hover:underline"
        >
          {crossLabel}
        </Link>
      </section>
    </article>
  );
}
