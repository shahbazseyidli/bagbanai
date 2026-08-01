"use client";

// "Continue with Google" — a LINK, not a widget.
//
// It navigates to our own /api/auth/google/start, which 302s on to Google. Google's Identity
// Services button would have been fewer lines and would have put a third-party script on the two
// pages where a farmer types their identity — on a site whose privacy policy promises, in eight
// languages, that there is no Google Analytics and no Google Tag Manager. A plain <a> keeps that
// promise literally true: nothing Google-owned is ever loaded by the browser on our origin.
//
// It also means no JS has to run for this to work, which on a 2G connection in a field is not a
// small thing.
//
// RENDERS NOTHING UNLESS THE SERVER HAS KEYS. /api/auth/providers is the single source of that
// truth, so adding the credentials to .env and restarting the API is the whole activation — no
// rebuild, no flag, no second place to remember. Same contract the Telegram and LLM keys follow.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getLocale, t } from "@/lib/i18n";

/** The brand mark. Inlined rather than fetched: Google's own hosted asset would be exactly the
 *  third-party request this component exists to avoid, and their brand guidelines require these
 *  four colours in these positions. */
function GoogleMark() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function GoogleButton({ next }: { next?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<{ google: boolean }>("/api/auth/providers")
      .then((r) => {
        if (active) setEnabled(Boolean(r?.google));
      })
      .catch(() => {
        // A server that predates this endpoint, or an outage. Showing a button that cannot work is
        // worse than showing none.
      });
    return () => {
      active = false;
    };
  }, []);

  if (!enabled) return null;

  const params = new URLSearchParams({ locale: getLocale() });
  // Where to land afterwards. The server re-validates this — it only accepts a path on our own
  // site — because an open redirect on a sign-in route is a phishing gift: the victim really does
  // sign in to us, and really does end up wherever the attacker chose.
  if (next && next.startsWith("/")) params.set("next", next);

  return (
    <>
      <div className="my-4 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {t("auth.or")}
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <a
        href={`/api/auth/google/start?${params.toString()}`}
        className="flex min-h-[var(--tap)] w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <GoogleMark />
        {t("auth.google.cta")}
      </a>
    </>
  );
}
