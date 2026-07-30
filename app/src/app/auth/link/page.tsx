"use client";

// Where the emailed link lands. It spends the token and gets out of the way.
//
// THE TOKEN IS A CREDENTIAL, so the order of the first three statements in the effect is the
// security of this page:
//   1. read it out of the URL FRAGMENT (window.location.hash) into a local const — never React
//      state, which is readable from the component tree in devtools, and never the URL for longer
//      than it takes to strip. The fragment rather than the query because a browser never transmits
//      what follows `#`: as `?token=` it reached nginx's access log twice per sign-in, once in the
//      request line and once as the Referer of every same-origin asset this page fetches;
//   2. history.replaceState it away BEFORE the network call, so it is out of the address bar, out
//      of the back stack, and out of the Referer header of anything this page loads next;
//   3. only then POST it. It is never rendered, never logged, never put in a GET.
//
// WHY A PLAIN window.location READ AND NOT useSearchParams(): a client component reading
// useSearchParams in an otherwise-static page is a hard Next 15 build error ("should be wrapped in
// a suspense boundary"). login/page.tsx's postLoginDest() already establishes the plain read as
// this codebase's answer — and useSearchParams could not see a fragment anyway.
//
// WHY THE useRef GUARD: the token is SINGLE USE. Under StrictMode React mounts, unmounts and
// remounts the effect on the same instance — a second POST would spend an already-spent token and
// paint the failure screen over a perfectly good link. The ref survives that cycle; the guard is
// the whole reason it exists.
//
// NO `next=` DESTINATION, deliberately. A magic link is routinely opened on a different device from
// the one that asked for it, so a destination captured at request time is wrong there — and a
// caller-supplied path baked into an emailed URL is an open-redirect surface. New sessions land on
// the app home, which is where signup sent people anyway.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PANEL_HOST } from "@/lib/host";
import { t } from "@/lib/i18n";
import { ErrorNote, Spinner } from "@/components/ui";
import { carryQuiz } from "@/components/auth/carryQuiz";
import type { User } from "@/lib/types";

// The link is delivered to the marketing apex (the app host's middleware gate would bounce an
// unauthenticated visitor to /login and drop the query string with the token in it). So the last
// step has to cross hosts, and a full-page assign is the only thing that can: router.push cannot
// leave the origin. The session cookie is scoped to .agradex.com, so it is already valid there.
// Same construction as Nav.tsx's APP_HREF; empty PANEL_HOST (local dev) means "/" is the app.
const APP_HOME = PANEL_HOST ? `https://${PANEL_HOST}/` : "/";

export default function MagicLinkPage() {
  const { setUser } = useAuth();
  const [failed, setFailed] = useState(false);
  // A callback, not a boolean: the unspent token lives only in the effect's closure now that the
  // URL has been cleared, so the retry has to carry the function that already holds it.
  const [retry, setRetry] = useState<(() => Promise<void>) | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // THE FRAGMENT, not the query string. A browser never transmits the part after `#`, so the
    // token is absent from the request line (and therefore from nginx's access log) and absent from
    // the Referer header this page sends with every same-origin `_next/static` fetch. As a query
    // parameter it was written to that log twice per sign-in. replaceState below still runs — it
    // clears the address bar and the back stack, which the fragment alone does not.
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    try {
      // Keep the path (it may carry a locale prefix); drop the fragment, which is the token.
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      /* nothing to do but continue — the POST below still has to happen */
    }
    if (!token) {
      setFailed(true);
      return;
    }

    const spend = async () => {
      try {
        const user = await api.post<User>("/api/auth/magic-login", { token });
        setUser(user);
        await carryQuiz();
        window.location.assign(APP_HOME);
      } catch (err) {
        // A REJECTED token and an UNREACHABLE server are not the same event, and only one of them
        // is final. ApiError means the backend answered and refused: the link is spent, expired or
        // invalid, and there is nothing to retry. Anything else is the network — the token is still
        // unspent, but it now exists only in this closure because the URL was cleared above, so
        // without a retry a single dropped request destroys a perfectly good link and the farmer is
        // told to request a new one for no reason.
        if (err instanceof ApiError) setFailed(true);
        else setRetry(() => spend);
      }
    };
    void spend();
  }, [setUser]);

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        {retry && !failed ? (
          <>
            {/* NOT the failure screen. The link is still good — we could not reach the server.
                Saying "this link does not work" here would send the farmer to burn a valid token. */}
            <h1 className="mb-3 text-xl font-bold text-slate-900">{t("auth.magic.verifyingTitle")}</h1>
            <ErrorNote message={t("auth.magic.networkBody")} />
            <button
              type="button"
              className="btn-primary mt-4 w-full"
              onClick={() => { setRetry(null); void retry(); }}
            >
              {t("common.retry")}
            </button>
          </>
        ) : failed ? (
          <>
            <h1 className="mb-3 text-xl font-bold text-slate-900">{t("auth.magic.failedTitle")}</h1>
            <ErrorNote message={t("auth.magic.failedBody")} />
            {/* .btn is already inline-flex + centred (globals.css), so w-full is the only addition. */}
            <Link href="/login" className="btn-primary mt-4 w-full">
              {t("auth.magic.requestNew")}
            </Link>
          </>
        ) : (
          <>
            <h1 className="mb-3 text-xl font-bold text-slate-900">{t("auth.magic.verifyingTitle")}</h1>
            <p className="mb-4 text-sm text-slate-500">{t("auth.magic.verifyingBody")}</p>
            <Spinner />
          </>
        )}
      </div>
    </div>
  );
}
