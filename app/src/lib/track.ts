// D3.6 — fire-and-forget funnel/activation event beacon. Never awaited, never throws, never blocks
// the UI. Also stamps a localStorage flag for the steps the onboarding checklist can't re-derive
// from server state (advice viewed, Telegram connected).
export function track(name: string, meta?: Record<string, unknown>): void {
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, meta }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

/** Mark a checklist step done locally (for steps not derivable from the API). */
export function markDone(flag: string): void {
  try {
    localStorage.setItem(`bagban_done_${flag}`, "1");
  } catch {
    /* noop */
  }
}
