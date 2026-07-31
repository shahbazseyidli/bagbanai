"use client";

// D0.9 — one shared satellite-processing-status poller. Replaces the duplicated 6s pollers in
// SatelliteGlance + SatelliteTab. Polls /data-status every 6s while the field is still
// queued/processing/partial, then stops. Returns the latest status (or null before first load).
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FieldDataStatus } from "@/lib/types";

export function useFieldDataStatus(fieldId: string): FieldDataStatus | null {
  const [status, setStatus] = useState<FieldDataStatus | null>(null);
  useEffect(() => {
    // Callers may mount before the field itself has loaded (the field page calls this above its
    // own `if (!field) return` so the hook order stays stable). No id, no request.
    if (!fieldId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const s = await api.get<FieldDataStatus>(`/api/fields/${fieldId}/data-status`);
        if (!active) return;
        setStatus(s);
        // Keep polling through 'partial' too (HLS shown, S2 still processing).
        if (s.status === "queued" || s.status === "processing" || s.status === "partial")
          timer = setTimeout(poll, 6000);
      } catch {
        /* keep last known status */
      }
    }
    poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [fieldId]);
  return status;
}
