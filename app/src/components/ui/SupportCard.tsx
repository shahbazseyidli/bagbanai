"use client";

// C9 — a small, reusable "need help?" card for spots where a new user is most likely to feel lost
// (empty ledger / sales). Email is always available as a request-a-callback mailto; an optional
// phone shows a direct tel: button. No fabricated phone number — phone is opt-in via prop.
import { Headphones, Mail, Phone } from "lucide-react";

export function SupportCard({
  phone,
  email = "info@agradex.com",
  className = "",
}: {
  /** Optional support number — when set, a direct "Zəng et" (tel:) button appears. */
  phone?: string;
  email?: string;
  className?: string;
}) {
  const subject = encodeURIComponent("Bağban AI — kömək / zəng istəyi");
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl2 border border-line bg-panel-2 p-4 text-left shadow-soft sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-soft text-grass">
          <Headphones className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-sm font-bold text-teal">Sualınız var? Zəng istəyin</p>
          <p className="mt-0.5 text-sm text-slate-600">
            Platformadan istifadədə kömək lazımdırsa, bizə yazın — geri zəng edək.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {phone && (
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className="btn-secondary">
            <Phone className="h-4 w-4" aria-hidden="true" /> Zəng et
          </a>
        )}
        <a href={`mailto:${email}?subject=${subject}`} className="btn-primary">
          <Mail className="h-4 w-4" aria-hidden="true" /> Kömək istə
        </a>
      </div>
    </div>
  );
}

export default SupportCard;
