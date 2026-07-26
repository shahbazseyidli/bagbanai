"use client";

// Web Push (H-push) — the browser half of the fourth delivery channel.
//
// THE ONE INVARIANT: reading the state NEVER asks for permission. `readPushState()` runs on mount,
// and a permission prompt fired on page load is the pattern browsers penalise and people refuse out
// of reflex — once refused, the channel is dead on that device until someone digs through site
// settings. Permission is requested from `enablePush()` alone, which is wired to an onClick and
// nothing else. If a future caller needs "just check", it calls readPushState.
import { api } from "@/lib/api";

export type PushReason = "ok" | "unsupported" | "ios_needs_install" | "blocked" | "dormant" | "error";

export type PushState = {
  supported: boolean;
  reason: PushReason;
  subscribed: boolean;
  configured: boolean;
  devices: number;
};

/**
 * base64url → ArrayBuffer for `applicationServerKey`.
 *
 * Returns ArrayBuffer rather than the Uint8Array every tutorial uses, deliberately: newer TS DOM
 * lib versions type Uint8Array with an ArrayBufferLike generic that does not always satisfy
 * BufferSource, and this workstation has no type checker — the error would first appear in the
 * server's `docker build web`, which is a slow way to learn it. ArrayBuffer sidesteps the whole
 * question. Do not "simplify" this back.
 */
function vapidKey(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buf;
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { platform?: string; maxTouchPoints?: number };
  // The second clause is iPadOS, which reports itself as a Mac and is otherwise indistinguishable
  // from a desktop Safari that does support push perfectly well.
  return /iPad|iPhone|iPod/.test(nav.userAgent || "")
    || (nav.platform === "MacIntel" && (nav.maxTouchPoints || 0) > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)")?.matches === true
    || nav.standalone === true;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined"
    && typeof navigator !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

/**
 * The active service-worker registration, or null.
 *
 * `navigator.serviceWorker.ready` never rejects — if registration failed or is disabled, it simply
 * never settles. Awaiting it bare would leave the settings card in its loading state (rendering
 * nothing) forever, which looks exactly like a broken page. Bounded, so the card always reaches a
 * state it can render honestly.
 */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4000)),
    ]);
  } catch {
    return null;
  }
}

export async function readPushState(): Promise<PushState> {
  let configured = false;
  let devices = 0;
  try {
    const r = await api.get<{ configured?: boolean; devices?: number }>("/api/push/status");
    configured = r?.configured === true;
    devices = typeof r?.devices === "number" ? r.devices : 0;
  } catch {
    // Signed out, offline, or the endpoint is not deployed yet — treat as dormant, never as broken.
    configured = false;
  }

  if (!pushSupported()) {
    // iOS exposes PushManager ONLY inside an installed PWA, so "unsupported" on an iPhone is
    // usually "not installed yet" — a solvable problem, and a different sentence.
    const reason: PushReason = isIos() && !isStandalone() ? "ios_needs_install" : "unsupported";
    return { supported: false, reason, subscribed: false, configured, devices };
  }

  if (Notification.permission === "denied") {
    return { supported: true, reason: "blocked", subscribed: false, configured, devices };
  }

  let subscribed = false;
  const reg = await registration();
  if (reg) {
    try {
      subscribed = !!(await reg.pushManager.getSubscription());
    } catch {
      subscribed = false;
    }
  }
  // Note what is deliberately NOT here: auto-subscribing when permission is already "granted".
  // Someone who tapped "turn off for this device" keeps the browser permission — re-subscribing
  // them on their next visit would make the off switch a lie.
  return { supported: true, reason: "ok", subscribed, configured, devices };
}

/** Subscribe THIS device. Call from an onClick only — it prompts for permission. */
export async function enablePush(): Promise<PushReason> {
  if (!pushSupported()) return isIos() && !isStandalone() ? "ios_needs_install" : "unsupported";

  let key = "";
  try {
    const cfg = await api.get<{ configured?: boolean; key?: string | null }>(
      "/api/push/vapid-public-key");
    const served = cfg?.key;
    if (cfg?.configured !== true || !served) return "dormant";
    key = served;
  } catch {
    return "error";
  }

  // Seeded rather than left for definite-assignment analysis to work out across a try/catch —
  // there is no type checker on this workstation, and a "used before assigned" would first appear
  // in the server's docker build.
  let permission: NotificationPermission = "default";
  try {
    permission = await Notification.requestPermission();
  } catch {
    return "error";
  }
  if (permission !== "granted") return "blocked";

  const reg = await registration();
  if (!reg) return "error";

  let sub: PushSubscription | null = null;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey(key),
    });
  } catch {
    return "error";
  }
  if (!sub) return "error";
  // Re-bound to a const so the narrowing survives into the catch block below, where TypeScript's
  // control flow is conservative about anything declared with `let`.
  const subscription = sub;

  // PushSubscriptionJSON types every field as optional, so both hops are checked rather than
  // asserted — a subscription without keys cannot be encrypted to and must not be stored.
  const j = subscription.toJSON();
  const endpoint = j?.endpoint;
  const p256dh = j?.keys?.p256dh;
  const auth = j?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    try {
      await subscription.unsubscribe();
    } catch {
      /* nothing to recover — the row was never created */
    }
    return "error";
  }

  try {
    await api.post("/api/push/subscribe", {
      endpoint,
      keys: { p256dh, auth },
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    });
  } catch {
    // Roll the browser back, so the two sides never disagree about whether this device is
    // subscribed. Left as-is, the browser would hold a live subscription the server has never heard
    // of: the card would say "off", the button would re-subscribe to the same endpoint, and the
    // farmer would have no way to tell why nothing arrives.
    try {
      await subscription.unsubscribe();
    } catch {
      /* best effort */
    }
    return "error";
  }
  return "ok";
}

/** Unsubscribe THIS device. */
export async function disablePush(): Promise<boolean> {
  const reg = await registration();
  if (!reg) return false;
  try {
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true; // already off — the button did what it promised
    // SERVER FIRST. If the browser dropped the subscription and then the POST failed, the row would
    // survive holding an endpoint nobody can ever unsubscribe again, and this device would keep
    // being pushed until the push service finally 410s it.
    await api.post("/api/push/unsubscribe", { endpoint: sub.endpoint });
    await sub.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

/** Ask the server to push this device. The prose is resolved by the caller, in the reader's locale. */
export async function sendTestPush(title: string, body: string): Promise<boolean> {
  try {
    const r = await api.post<{ ok?: boolean; sent?: number }>("/api/push/test", { title, body });
    return r?.ok === true;
  } catch {
    return false;
  }
}
