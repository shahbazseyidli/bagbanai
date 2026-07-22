// D2.2 — per-field "today" summary for the Bu gün home feed. Reuses the same deterministic
// insight engine as the İcmal page (buildInsights → one health verdict), plus the FAO-56 water
// balance's latest recommended-irrigation figure, so the home tells each farmer, per field, "what
// state is it in and does it need water" — no LLM, instant, always available.
import { api } from "@/lib/api";
import { buildInsights, type InsightsResponse, type Verdict } from "@/lib/insights";
import type { IndexNorms } from "@/lib/indexStatus";
import type { Field } from "@/lib/types";

export interface FieldToday {
  field: Field;
  status: string; // data_status: none|queued|processing|partial|ready|failed
  verdict: Verdict | null;
  waterReco: number | null; // latest FAO-56 recommended irrigation (mm), if computed
  usedSensor: "s2" | "hls" | null;
}

export async function fetchFieldToday(field: Field): Promise<FieldToday> {
  const [ins, nm, wb] = await Promise.all([
    api.get<InsightsResponse>(`/api/fields/${field.id}/insights`).catch(() => null),
    api.get<{ norms: IndexNorms }>(`/api/fields/${field.id}/norms`).catch(() => null),
    api
      .get<{ days: { reco_mm: number | null }[] }>(`/api/fields/${field.id}/water-balance`)
      .catch(() => null),
  ]);
  const built = buildInsights(ins, nm?.norms ?? null);
  const days = wb?.days ?? [];
  const last = days.length ? days[days.length - 1] : null;
  return {
    field,
    status: ins?.data_status ?? "none",
    verdict: built.verdict,
    waterReco: last && last.reco_mm != null && last.reco_mm > 0 ? last.reco_mm : null,
    usedSensor: built.usedSensor,
  };
}
