"use client";

// A10 — "Sahəni paylaş": mint a public, read-only link to this field. The farmer sends it over
// WhatsApp to a buyer / bank / agronomist; the recipient needs no account. Links can be revoked
// at any time and each one carries its own view counter.
import { useCallback, useEffect, useState } from "react";
import { Share2, Copy, Check, Trash2, Eye, Plus, Loader2 } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote, Placeholder, Spinner } from "@/components/ui";

interface ShareLink {
  id: string;
  token: string;
  path: string;
  url: string;
  scope: string;
  include_ndvi: boolean;
  label: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
}

const EXPIRY_OPTIONS: { label: string; days: number | null }[] = [
  { label: "7 gün", days: 7 },
  { label: "30 gün", days: 30 },
  { label: "Müddətsiz", days: null },
];

/** Absolute link the farmer actually sends. The browser origin is the source of truth — the
 * server-side NEXT_PUBLIC_APP_URL may still be the dev default in some deployments. */
function absUrl(s: ShareLink): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${s.path}`;
  }
  return s.url || s.path;
}

function isActive(s: ShareLink): boolean {
  if (s.revoked_at) return false;
  if (s.expires_at && new Date(s.expires_at).getTime() <= Date.now()) return false;
  return true;
}

function statusText(s: ShareLink): string {
  if (s.revoked_at) return "Ləğv edilib";
  if (s.expires_at && new Date(s.expires_at).getTime() <= Date.now()) return "Vaxtı bitib";
  if (s.expires_at) return `Bitir: ${s.expires_at.slice(0, 10)}`;
  return "Müddətsiz";
}

export default function ShareButton({ fieldId }: { fieldId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [expiryIdx, setExpiryIdx] = useState(1); // default 30 gün
  const [includeNdvi, setIncludeNdvi] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const d = await api.get<{ items: ShareLink[] }>(`/api/fields/${fieldId}/shares`);
      setItems(d.items || []);
    } catch (e) {
      setErr(azError(e));
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function create() {
    setCreating(true);
    setErr("");
    try {
      const created = await api.post<ShareLink>(`/api/fields/${fieldId}/shares`, {
        scope: "card",
        include_ndvi: includeNdvi,
        expires_days: EXPIRY_OPTIONS[expiryIdx].days,
      });
      setItems((prev) => [created, ...prev]);
      await copy(created);
    } catch (e) {
      setErr(azError(e));
    } finally {
      setCreating(false);
    }
  }

  async function copy(s: ShareLink) {
    const url = absUrl(s);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(s.id);
      window.setTimeout(() => setCopiedId((c) => (c === s.id ? null : c)), 2000);
    } catch {
      // Clipboard blocked (http origin / old webview) — select-and-copy fallback.
      window.prompt("Keçidi kopyalayın:", url);
    }
  }

  async function revoke(s: ShareLink) {
    setBusyId(s.id);
    setErr("");
    try {
      await api.del(`/api/shares/${s.id}`);
      setItems((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, revoked_at: new Date().toISOString() } : x)),
      );
    } catch (e) {
      setErr(azError(e));
    } finally {
      setBusyId(null);
    }
  }

  function waHref(s: ShareLink): string {
    const text = `Sahəmin peyk hesabatı (Agradex): ${absUrl(s)}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" /> Sahəni paylaş
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Share2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Sahəni paylaş
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Keçidi açan şəxs yalnız sahənin adını, sahəsini, məhsulunu və son peyk göstəricisini
            görür. Xərcləriniz, qeydləriniz və digər sahələriniz görünmür.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded px-2 py-1 text-sm text-slate-500 hover:text-slate-800"
        >
          Bağla
        </button>
      </div>

      {err && <ErrorNote message={err} />}

      {/* Create */}
      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div>
          <span className="label">Keçidin müddəti</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {EXPIRY_OPTIONS.map((o, i) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setExpiryIdx(i)}
                className={`min-h-11 rounded-lg border px-3 text-sm font-medium ${
                  expiryIdx === i
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeNdvi}
            onChange={(e) => setIncludeNdvi(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-emerald-600"
          />
          Peyk NDVI təbəqəsi də görünsün
        </label>
        <button
          type="button"
          onClick={create}
          disabled={creating}
          className="btn-primary flex min-h-11 w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Yaradılır…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden="true" /> Yeni keçid yarat
            </>
          )}
        </button>
      </div>

      {/* Existing links */}
      {loading ? (
        <Spinner label="Keçidlər yüklənir…" />
      ) : items.length === 0 ? (
        <Placeholder>Hələ paylaşım keçidi yaratmamısınız.</Placeholder>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => {
            const active = isActive(s);
            return (
              <li
                key={s.id}
                className={`rounded-lg border p-3 ${
                  active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${
                      active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {statusText(s)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" /> {s.view_count} baxış
                  </span>
                  {s.include_ndvi && <span className="text-slate-400">· NDVI təbəqəsi ilə</span>}
                </div>

                <p className="mt-2 break-all rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600">
                  {absUrl(s)}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copy(s)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {copiedId === s.id ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Kopyalandı
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" aria-hidden="true" /> Kopyala
                      </>
                    )}
                  </button>
                  {active && (
                    <a
                      href={waHref(s)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      WhatsApp ilə göndər
                    </a>
                  )}
                  {active && (
                    <button
                      type="button"
                      onClick={() => revoke(s)}
                      disabled={busyId === s.id}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {busyId === s.id ? "Ləğv edilir…" : "Ləğv et"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
