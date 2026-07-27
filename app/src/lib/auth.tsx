"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "./api";
import { clearAreaUnitCache } from "./units";
import { LOCALES, getLocale } from "./i18n";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Once per page load — reconciling is a repair, not a heartbeat.
let localeSynced = false;

/**
 * Keep `users.locale` equal to the language the farmer is actually being shown.
 *
 * LanguageSwitcher is the ONLY writer of that column, but it is not the only way the UI language
 * changes: the middleware sets the locale from a route prefix, so bookmarking /ru/fields — or
 * following a Russian share link once — switches the interface permanently without the account ever
 * hearing about it. Everything that renders inside a request survives that (api.ts sends X-Locale on
 * every call), but the surfaces with NO request to read a header from go by `users.locale` alone:
 * the advice generated after each satellite scene, and the weekly digest. Observed live on the
 * owner account — interface Russian, `users.locale` still 'az', so every auto-generated advice was
 * written in a language the reader had stopped using. That is the same defect 0049 was added to fix,
 * arriving through a different door.
 *
 * ONLY reconciles from an EXPLICIT signal — a route prefix or a stored cookie. detectLocale() also
 * falls back to `navigator.language`, and letting a browser guess overwrite a language the account
 * deliberately chose would trade this bug for a worse one.
 */
function reconcileLocale(me: User) {
  if (localeSynced || typeof window === "undefined") return;
  localeSynced = true;
  try {
    const prefixed = /^\/([a-z]{2})(?=\/|$)/.exec(window.location.pathname)?.[1];
    const explicit =
      (prefixed && (LOCALES as readonly string[]).includes(prefixed)) ||
      document.cookie.includes("bagban_locale=");
    const shown = getLocale();
    // Expire a leftover HOST-ONLY bagban_locale. LanguageSwitcher writes a domain-scoped cookie and
    // now clears this one too, but only for people who switch language again — everyone carrying a
    // pre-panel-split cookie stays shadowed forever otherwise, and the two servers read the pair in
    // opposite orders (Next takes the first, Starlette the last), so the interface and the API can
    // disagree about the language indefinitely. Deleting needs the same domain-less scope it was
    // written with. Safe here: the domain cookie is the deliberate one, and `shown` — what the page
    // actually rendered, hence what we just persisted — survives either way.
    if (document.cookie.split("; ").filter((c) => c.startsWith("bagban_locale=")).length > 1) {
      document.cookie = "bagban_locale=; path=/; max-age=0; samesite=lax";
    }
    if (!explicit || me.locale === shown) return;
    void api.post("/api/auth/locale", { locale: shown }).catch(() => {});
  } catch {
    // private mode / exotic URL — never let a preference repair break sign-in
  }
}

// Last-known user, cached so a page RELOAD can paint the signed-in chrome (rail, account nav)
// immediately instead of flashing the signed-out marketing chrome while /me is in flight — the
// "menu bar sometimes disappears" flicker. /me still runs and reconciles (e.g. clears it if the
// session has expired).
const CACHE_KEY = "agradex_user";
function readCache(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage.getItem(CACHE_KEY);
    return s ? (JSON.parse(s) as User) : null;
  } catch {
    return null;
  }
}
function writeCache(u: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (u) window.localStorage.setItem(CACHE_KEY, JSON.stringify(u));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore (private mode / quota)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    writeCache(u);
  }, []);

  // Revalidate against /me. Deliberately does NOT flip `loading` back to true: once the UI has
  // painted a state, a background revalidation must not blink it away to a spinner/signed-out.
  const refresh = useCallback(async () => {
    try {
      const me = await api.get<User>("/api/auth/me");
      setUserState(me);
      writeCache(me);
      void reconcileLocale(me);
    } catch (err) {
      // 401 = not logged in; any other error (incl. network) also resolves to logged out.
      if (!(err instanceof ApiError)) {
        // network error — still resolve to logged out so the UI stays usable
      }
      setUserState(null);
      writeCache(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // ignore
    }
    setUserState(null);
    writeCache(null);
    // P1.2 — the area unit is a per-account preference; forget it so the next account that signs in
    // on this device does not inherit the previous farmer's dönüm/sot choice.
    clearAreaUnitCache();
  }, []);

  useEffect(() => {
    // Optimistically paint the last-known user (set in an effect, not the initial state, to avoid
    // an SSR/hydration mismatch), then reconcile with the server.
    const cached = readCache();
    if (cached) {
      setUserState(cached);
      setLoading(false);
    }
    void refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
