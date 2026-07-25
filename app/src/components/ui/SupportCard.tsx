"use client";

// C9 — a small, reusable "need help?" affordance for spots where a new user is most likely to feel
// lost (empty ledger / sales / no-fields). Email is always available as a request-a-callback mailto;
// an optional phone shows a direct tel: button. No fabricated phone number — phone is opt-in via prop.
//
// Two looks (variant):
//   * "card"  (default) — the prominent bordered card. Kept for empty states, which SHOULD draw the
//     eye toward asking for help. Existing callers are unaffected.
//   * "quiet" — a single muted one-line link ("Kömək lazımdır?" + a small headset icon) for the
//     always-visible chrome, where a full card would "gözə soxma" (shove itself in the user's face).
import { Headphones, Mail, Phone } from "lucide-react";
import { t } from "@/lib/i18n";

export function SupportCard({
  phone,
  email = "info@agradex.com",
  variant = "card",
  className = "",
}: {
  /** Optional support number — when set, a direct "Zəng et" (tel:) button appears (card variant). */
  phone?: string;
  email?: string;
  /** "card" (default, prominent) for empty states · "quiet" (subtle one-line link) for chrome. */
  variant?: "card" | "quiet";
  className?: string;
}) {
  const subject = encodeURIComponent(t("app.ui.supportCard.emailSubject"));
  const mailto = `mailto:${email}?subject=${subject}`;

  // Understated one-liner — muted colour, small text, minimal padding; reachable but never dominant.
  if (variant === "quiet") {
    return (
      <a
        href={mailto}
        className={`inline-flex items-center gap-1.5 rounded-[9px] px-2 py-1.5 text-[12.5px] text-ink-soft transition-colors hover:bg-mint-soft hover:text-grass focus:text-grass motion-reduce:transition-none ${className}`}
      >
        <Headphones className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t("app.ui.supportCard.quietLink")}
      </a>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl2 border border-line bg-panel-2 p-4 text-left shadow-soft sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-soft text-grass">
          <Headphones className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-sm font-bold text-teal">{t("app.ui.supportCard.callRequestTitle")}</p>
          <p className="mt-0.5 text-sm text-slate-600">
            {t("app.ui.supportCard.callRequestBody")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {phone && (
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className="btn-secondary">
            <Phone className="h-4 w-4" aria-hidden="true" /> {t("app.ui.supportCard.callButton")}
          </a>
        )}
        <a href={mailto} className="btn-primary">
          <Mail className="h-4 w-4" aria-hidden="true" /> {t("app.ui.supportCard.emailButton")}
        </a>
      </div>
    </div>
  );
}

export default SupportCard;
