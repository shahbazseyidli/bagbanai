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
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

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
