"use client";

// Registers the en/tr/de dictionaries and sets the active locale (from the server, via middleware's
// x-locale header / cookie) BEFORE any child renders — so t() returns the right language on both the
// SSR pass and the client, with no hydration mismatch. Language changes navigate/reload (see
// LanguageSwitcher), so no reactive re-render machinery is needed here.
import { useState } from "react";
import { registerDict, setLocale, type Locale } from "@/lib/i18n";
import { en } from "@/lib/locales/en";
import { tr } from "@/lib/locales/tr";
import { de } from "@/lib/locales/de";

let registered = false;

export default function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  useState(() => {
    if (!registered) {
      registerDict("en", en);
      registerDict("tr", tr);
      registerDict("de", de);
      registered = true;
    }
    setLocale(initialLocale);
    return null;
  });
  return <>{children}</>;
}
