"use client";

import { useEffect, useState } from "react";
import { BookOpen, Droplets, Mountain, Bug, CalendarDays, Wind, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

// The research worker fills these blocks (knowledge layer M3/M8). This panel makes them
// visible to the farmer so the "passport" isn't just fuel for the AI advice — degrades to
// nothing until research has run.
interface Block { content: unknown; sources?: { url: string; name: string }[] }
interface Passport {
  crop_type: string | null;
  zone_id: string | null;
  zone: Record<string, Block>;
  field: Record<string, Block>;
}

function Sources({ sources }: { sources?: { url: string; name: string }[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {sources.slice(0, 3).map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-emerald-700 underline decoration-dotted hover:text-emerald-900"
        >
          {s.name || "mənbə"}
        </a>
      ))}
    </div>
  );
}

export default function KnowledgePassport({ fieldId }: { fieldId: string }) {
  const [p, setP] = useState<Passport | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setP(await api.get<Passport>(`/api/fields/${fieldId}/knowledge`));
      } catch {
        /* no passport yet */
      }
    })();
  }, [fieldId]);

  if (!p) return null;
  const soil = p.field?.soil_profile;
  const water = p.field?.water_requirements;
  const spray = p.field?.spray_window;
  const pests = p.zone?.pest_disease ?? p.zone?.pest_disease_eppo;
  const phen = p.zone?.phenology;
  const hasAny = soil || water || pests || phen || spray;
  if (!hasAny) return null;

  const soilC = soil?.content as
    | (Record<string, { value: number; unit: string }> & { water_params?: { taw_mm: number; raw_mm: number } })
    | undefined;
  const waterC = water?.content as { net_irrigation_mm?: number; recommendation?: string } | undefined;
  const sprayC = spray?.content as
    | { best_window?: { start: string; end: string } | null; alerts?: { type: string; severity: string; detail: string }[] }
    | undefined;
  const fmtHour = (ts?: string) => (ts && ts.length >= 16 ? ts.slice(5, 16).replace("T", " ") : ts ?? "");
  const pestsC = pests?.content as
    | { pests?: { name: string; type: string }[]; summary?: string; details?: string[] }
    | undefined;
  const phenC = phen?.content as { summary?: string; details?: string[] } | undefined;

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-slate-800">Bilik Pasportu</h3>
        {p.zone_id && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
            {p.zone_id.replace("az-", "")}
          </span>
        )}
      </div>

      {/* Weather alerts (E2) — frost/heat/wind — shown prominently above the block grid. */}
      {sprayC?.alerts && sprayC.alerts.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {sprayC.alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                a.severity === "critical"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-amber-300 bg-amber-50 text-amber-800"
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{a.detail}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {soilC && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Mountain className="h-4 w-4 text-amber-600" /> Torpaq profili
            </div>
            <ul className="text-xs text-slate-600">
              {soilC.ph && <li>pH: {soilC.ph.value}</li>}
              {soilC.texture_class && <li>Tekstura: {String((soilC.texture_class as unknown) ?? "")}</li>}
              {soilC.organic_carbon && <li>Üzvi karbon: {soilC.organic_carbon.value} {soilC.organic_carbon.unit}</li>}
              {soilC.cec && <li>CEC: {soilC.cec.value} {soilC.cec.unit}</li>}
              {soilC.water_params && (
                <li>Su tutumu: TAW {soilC.water_params.taw_mm} mm · RAW {soilC.water_params.raw_mm} mm</li>
              )}
            </ul>
            <Sources sources={soil?.sources} />
          </div>
        )}

        {sprayC?.best_window && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Wind className="h-4 w-4 text-teal-600" /> Çiləmə pəncərəsi
            </div>
            <p className="text-xs text-slate-600">
              Ən uyğun: {fmtHour(sprayC.best_window.start)} – {fmtHour(sprayC.best_window.end)}
            </p>
            <Sources sources={spray?.sources} />
          </div>
        )}

        {waterC && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Droplets className="h-4 w-4 text-sky-600" /> Su tələbatı (7 gün)
            </div>
            <p className="text-xs text-slate-600">{waterC.recommendation}</p>
            <Sources sources={water?.sources} />
          </div>
        )}

        {phenC && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <CalendarDays className="h-4 w-4 text-emerald-600" /> Fenologiya
            </div>
            <p className="text-xs text-slate-600">{phenC.summary}</p>
            <Sources sources={phen?.sources} />
          </div>
        )}

        {pestsC && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Bug className="h-4 w-4 text-red-600" /> Zərərvericilər
            </div>
            {pestsC.summary && <p className="text-xs text-slate-600">{pestsC.summary}</p>}
            {pestsC.pests && pestsC.pests.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {pestsC.pests.slice(0, 6).map((x) => x.name).join(", ")}
              </p>
            )}
            <Sources sources={pests?.sources} />
          </div>
        )}
      </div>
    </div>
  );
}
