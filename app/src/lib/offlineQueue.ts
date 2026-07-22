// Offline outbox for scouting notes (T12). When the device is offline, a text scouting note is
// queued in localStorage and flushed automatically on reconnect. Photos are skipped offline (they
// need a live upload) — the note syncs, the farmer can add the photo later.

const KEY = "bagban.outbox.scouting";

export interface QueuedScouting {
  fieldId: string;
  body: Record<string, unknown>;
  ts: number;
}

export function getQueue(): QueuedScouting[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function setQueue(q: QueuedScouting[]) {
  window.localStorage.setItem(KEY, JSON.stringify(q));
}

export function queueScouting(item: QueuedScouting) {
  const q = getQueue();
  q.push(item);
  setQueue(q);
}

/** Try to POST every queued note; keep the ones that still fail. Returns how many synced. */
export async function flushQueue(
  post: (fieldId: string, body: Record<string, unknown>) => Promise<void>,
): Promise<number> {
  const q = getQueue();
  if (!q.length) return 0;
  const remaining: QueuedScouting[] = [];
  let sent = 0;
  for (const item of q) {
    try {
      await post(item.fieldId, item.body);
      sent += 1;
    } catch {
      remaining.push(item);
    }
  }
  setQueue(remaining);
  return sent;
}
