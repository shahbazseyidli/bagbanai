"use client";

// Hesabatlar — prepared report library (HYBRID_PLAN W7, B9). The backend renders every report on
// the fly (no PDF library in the image), so the buttons are plain same-origin anchors: the httpOnly
// auth cookie rides along, the HTML opens in a new tab ("Çap et / PDF kimi saxla" inside it) and the
// CSV downloads with a Content-Disposition filename. Inline AZ copy (T18 extracts later).
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Coins, Download, ExternalLink, FileText, Printer, RefreshCw } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote, Field as FormField, Placeholder, Spinner } from "@/components/ui";
import type { Org } from "@/lib/types";

interface CatalogParam {
  name: string;
  label: string;
  type: string;
  required: boolean;
}
interface CatalogItem {
  id: string;
  title: string;
  description: string;
  scope: "field" | "org";
  path: string;
  params: CatalogParam[];
  formats: string[];
}
interface ScopeField {
  id: string;
  name: string;
  area_ha: number | null;
}
interface ScopeResp {
  fields: ScopeField[];
  seasons: number[];
}
interface LibraryRow {
  id: string;
  type: string;
  title: string;
  field_name: string | null;
  season_year: number | null;
  period_from: string | null;
  period_to: string | null;
  generated_at: string | null;
  url: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const FALLBACK: Record<string, { title: string; description: string }> = {
  season: {
    title: "Mövsüm hesabatı",
    description:
      "Bir sahənin bir mövsümü: məhsul, peyk xülasəsi, əməliyyatlar və xərc, məhsuldarlıq, tapşırıqlar və son AI məsləhəti.",
  },
  journal: {
    title: "Əməliyyat jurnalı",
    description:
      "Seçilmiş tarix aralığında sahədə baş verən hər şey bir xronoloji cədvəldə: əməliyyatlar, tapşırıqlar və skautinq.",
  },
  cost: {
    title: "Xərc xülasəsi",
    description: "Təsərrüfat üzrə xərc: sahə-sahə xərc/gəlir/mənfəət və kateqoriya üzrə bölgü.",
  },
};

const TYPE_AZ: Record<string, string> = {
  season: "Mövsüm hesabatı",
  journal: "Əməliyyat jurnalı",
  cost: "Xərc xülasəsi",
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [scope, setScope] = useState<ScopeResp | null>(null);
  const [library, setLibrary] = useState<LibraryRow[]>([]);
  const [error, setError] = useState("");

  // report parameters
  const [fieldId, setFieldId] = useState("");
  const [season, setSeason] = useState<string>(String(new Date().getFullYear()));
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return isoDay(d);
  });
  const [dateTo, setDateTo] = useState(() => isoDay(new Date()));

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    api
      .get<Org[]>("/api/orgs")
      .then((l) => {
        setOrgs(l);
        if (l[0]) setOrgId(l[0].id);
      })
      .catch((e) => setError(azError(e)));
    api
      .get<{ reports: CatalogItem[] }>("/api/reports/catalog")
      .then((r) => setCatalog(r.reports || []))
      .catch(() => setCatalog([]));
  }, [user, loading, router]);

  function loadLibrary(id: string) {
    api
      .get<{ reports: LibraryRow[] }>(`/api/orgs/${id}/reports`)
      .then((r) => setLibrary(r.reports || []))
      .catch(() => setLibrary([]));
  }

  useEffect(() => {
    if (!orgId) return;
    setScope(null);
    setFieldId("");
    api
      .get<ScopeResp>(`/api/orgs/${orgId}/reports/scope`)
      .then((s) => {
        setScope(s);
        if (s.fields[0]) setFieldId(s.fields[0].id);
        if (s.seasons[0]) setSeason(String(s.seasons[0]));
      })
      .catch((e) => setError(azError(e)));
    loadLibrary(orgId);
  }, [orgId]);

  const meta = useMemo(() => {
    const byId: Record<string, CatalogItem> = {};
    catalog.forEach((c) => {
      byId[c.id] = c;
    });
    return byId;
  }, [catalog]);

  function title(id: string): string {
    return meta[id]?.title || FALLBACK[id].title;
  }
  function description(id: string): string {
    return meta[id]?.description || FALLBACK[id].description;
  }

  const seasonUrl = (fmt: string) =>
    `${API_BASE}/api/fields/${fieldId}/reports/season?season=${encodeURIComponent(season)}&format=${fmt}`;
  const journalUrl = (fmt: string) =>
    `${API_BASE}/api/fields/${fieldId}/reports/journal?from=${encodeURIComponent(dateFrom)}&to=${encodeURIComponent(dateTo)}&format=${fmt}`;
  const costUrl = (fmt: string) =>
    `${API_BASE}/api/orgs/${orgId}/reports/cost?season=${encodeURIComponent(season)}&format=${fmt}`;

  const seasons = scope?.seasons?.length ? scope.seasons : [new Date().getFullYear()];
  const hasField = Boolean(fieldId);
  const periodOk = Boolean(dateFrom && dateTo && dateFrom <= dateTo);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Hesabatlar</h1>
        {orgs.length > 1 && (
          <select
            className="input max-w-xs"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            aria-label="Təsərrüfat"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="text-sm text-slate-500">
        Hazır hesabatlar platformadakı qeydlərdən dərhal yaradılır. HTML variantını açıb brauzerin
        <span className="font-medium text-slate-700"> “Çap et / PDF kimi saxla” </span>
        düyməsi ilə PDF-ə çevirə, CSV variantını isə Excel-də aça bilərsiniz.
      </p>

      <ErrorNote message={error} />

      {orgId && scope === null ? (
        <Spinner label="Yüklənir…" />
      ) : (
        <div className="space-y-4">
          {/* ---------- Mövsüm hesabatı ---------- */}
          <ReportCard
            Icon={FileText}
            title={title("season")}
            description={description("season")}
            ready={hasField}
            notReadyNote="Əvvəlcə sahə əlavə edin."
            htmlHref={seasonUrl("html")}
            csvHref={seasonUrl("csv")}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Sahə">
                <select className="input" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
                  {(scope?.fields || []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                  {(scope?.fields || []).length === 0 && <option value="">Sahə yoxdur</option>}
                </select>
              </FormField>
              <FormField label="Mövsüm">
                <select className="input" value={season} onChange={(e) => setSeason(e.target.value)}>
                  {seasons.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </ReportCard>

          {/* ---------- Əməliyyat jurnalı ---------- */}
          <ReportCard
            Icon={ClipboardList}
            title={title("journal")}
            description={description("journal")}
            ready={hasField && periodOk}
            notReadyNote={hasField ? "Tarix aralığı düzgün deyil." : "Əvvəlcə sahə əlavə edin."}
            htmlHref={journalUrl("html")}
            csvHref={journalUrl("csv")}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Sahə">
                <select className="input" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
                  {(scope?.fields || []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                  {(scope?.fields || []).length === 0 && <option value="">Sahə yoxdur</option>}
                </select>
              </FormField>
              <FormField label="Başlanğıc">
                <input
                  type="date"
                  className="input"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </FormField>
              <FormField label="Son">
                <input
                  type="date"
                  className="input"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </FormField>
            </div>
          </ReportCard>

          {/* ---------- Xərc xülasəsi ---------- */}
          <ReportCard
            Icon={Coins}
            title={title("cost")}
            description={description("cost")}
            ready={Boolean(orgId)}
            notReadyNote="Təsərrüfat seçin."
            htmlHref={costUrl("html")}
            csvHref={costUrl("csv")}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Mövsüm">
                <select className="input" value={season} onChange={(e) => setSeason(e.target.value)}>
                  {seasons.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </ReportCard>

          {/* ---------- Son hazırlanan hesabatlar ---------- */}
          <div className="card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Son hazırlanan hesabatlar</h2>
              <button
                type="button"
                onClick={() => orgId && loadLibrary(orgId)}
                className="btn-secondary inline-flex min-h-11 items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Yenilə
              </button>
            </div>
            {library.length === 0 ? (
              <Placeholder>Hələ hesabat yaradılmayıb. Yuxarıdan birini açın.</Placeholder>
            ) : (
              <ul className="space-y-2">
                {library.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-[1.5px] border-slate-200 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{r.title}</div>
                      <div className="text-xs text-slate-500">
                        {TYPE_AZ[r.type] || r.type}
                        {r.field_name ? ` · ${r.field_name}` : ""}
                        {r.generated_at ? ` · ${r.generated_at.slice(0, 16).replace("T", " ")}` : ""}
                      </div>
                    </div>
                    {r.url && (
                      <a
                        href={`${API_BASE}${r.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary inline-flex min-h-11 items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Aç
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportCard({
  Icon,
  title,
  description,
  ready,
  notReadyNote,
  htmlHref,
  csvHref,
  children,
}: {
  Icon: typeof FileText;
  title: string;
  description: string;
  ready: boolean;
  notReadyNote: string;
  htmlHref: string;
  csvHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      {children}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {ready ? (
          <>
            <a
              href={htmlHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex min-h-11 items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              HTML aç
            </a>
            <a href={csvHref} download className="btn-secondary inline-flex min-h-11 items-center gap-2">
              <Download className="h-4 w-4" aria-hidden="true" />
              CSV yüklə
            </a>
          </>
        ) : (
          <>
            <span className="btn-primary pointer-events-none inline-flex min-h-11 items-center gap-2 opacity-50" aria-disabled="true">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              HTML aç
            </span>
            <span className="text-sm text-slate-500">{notReadyNote}</span>
          </>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          Çap et / PDF kimi saxla
        </span>
      </div>
    </div>
  );
}
