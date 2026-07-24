"use client";

// Field document dossier (HYBRID_PLAN W6 / B15) + receipt photo → expense (W7 / B17).
// Every stored file is read back through the authenticated serve route
// GET /api/documents/{id}/download — never a raw storage path.
import { useEffect, useRef, useState } from "react";
import { Download, FileText, Image as ImageIcon, Receipt, Sparkles, Trash2, Upload } from "lucide-react";
import { api, azError } from "@/lib/api";
import { ErrorNote, Field as FormField, Placeholder, Spinner } from "@/components/ui";
import ChoiceChips from "@/components/field/ChoiceChips";

interface FieldDoc {
  id: string;
  kind: string;
  title: string | null;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  parsed: ReceiptParsed | null;
  operation_id: string | null;
  created_at: string;
  download_url: string;
}

interface ReceiptItem {
  name?: string | null;
  qty?: number | null;
  unit?: string | null;
  price?: number | null;
}

interface ReceiptParsed {
  vendor?: string | null;
  purchase_date?: string | null;
  total?: number | null;
  currency?: string | null;
  category?: string | null;
  items?: ReceiptItem[] | null;
  confidence?: string | null;
}

interface ExpenseDraft {
  type: string;
  performed_on: string;
  cost: number | null;
  currency: string;
  vendor: string | null;
  notes: string;
}

interface ReceiptResponse {
  document: FieldDoc;
  parsed: ReceiptParsed | null;
  draft: ExpenseDraft | null;
  operation: { id: string } | null;
  message: string | null;
}

const KINDS = [
  { value: "lab", label: "Lab analizi" },
  { value: "cadastre", label: "Kadastr" },
  { value: "receipt", label: "Qəbz" },
  { value: "contract", label: "Müqavilə" },
  { value: "other", label: "Digər" },
];

const KIND_LABEL: Record<string, string> = {
  lab: "Lab analizi",
  cadastre: "Kadastr",
  receipt: "Qəbz",
  contract: "Müqavilə",
  photo: "Foto",
  other: "Digər",
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,application/pdf";

// Same origin resolution the shared api helper uses (empty in prod — nginx proxies /api/).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

/** Absolute URL for a server-issued path such as "/api/documents/<id>/download". */
function abs(path: string): string {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function fmtSize(n: number | null): string {
  if (!n || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return (iso || "").slice(0, 10);
}

function isImage(mime: string | null): boolean {
  return !!mime && mime.startsWith("image/");
}

/** Multipart POST (the shared api helper only sends a bare file, we also send kind/title). */
async function postForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(abs(path), { method: "POST", credentials: "include", body: form });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    if (body && typeof body === "object" && "detail" in body) {
      const d = (body as { detail: unknown }).detail;
      detail = typeof d === "string" ? d : JSON.stringify(d);
    }
    if (detail === "unsupported_media_type") detail = "Bu fayl növü qəbul edilmir (şəkil və ya PDF).";
    else if (detail === "file_too_large") detail = "Fayl çox böyükdür (maksimum 15 MB).";
    else if (detail === "empty_file") detail = "Fayl boşdur.";
    else if (res.status === 403) detail = "Bu əməliyyata icazəniz yoxdur.";
    else if (res.status >= 500) detail = "Server xətası — bir azdan yenidən cəhd edin.";
    throw new Error(detail);
  }
  return body as T;
}

export default function DocumentsTab({ fieldId }: { fieldId: string }) {
  const [items, setItems] = useState<FieldDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [kind, setKind] = useState("other");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptResponse | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmNote, setConfirmNote] = useState("");

  async function load() {
    try {
      setItems(await api.get<FieldDoc[]>(`/api/fields/${fieldId}/documents`));
      setError("");
    } catch (err) {
      setError(azError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      if (title.trim()) form.append("title", title.trim());
      await postForm<FieldDoc>(`/api/fields/${fieldId}/documents`, form);
      setFile(null);
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fayl yüklənmədi.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setError("");
    try {
      await api.del(`/api/documents/${id}`);
      setItems((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(azError(err));
    }
  }

  async function onReadReceipt() {
    if (!receiptFile) return;
    setReceiptBusy(true);
    setReceiptError("");
    setConfirmNote("");
    setReceipt(null);
    try {
      const form = new FormData();
      form.append("file", receiptFile);
      const res = await postForm<ReceiptResponse>(`/api/fields/${fieldId}/receipt`, form);
      setReceipt(res);
      await load();
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : "Qəbz oxunmadı.");
    } finally {
      setReceiptBusy(false);
    }
  }

  async function onConfirmExpense() {
    if (!receipt?.document?.id) return;
    setConfirmBusy(true);
    setReceiptError("");
    try {
      const res = await api.post<ReceiptResponse>(
        `/api/fields/${fieldId}/receipt?create_operation=true&document_id=${receipt.document.id}`,
      );
      setReceipt(res);
      setConfirmNote(res.operation ? "Xərc əməliyyatlara yazıldı." : res.message ?? "Xərc yazılmadı.");
      await load();
    } catch (err) {
      setReceiptError(azError(err));
    } finally {
      setConfirmBusy(false);
    }
  }

  const draft = receipt?.draft ?? null;
  const parsed = receipt?.parsed ?? null;

  return (
    <div className="space-y-6">
      {/* B15 — upload */}
      <form onSubmit={onUpload} className="card space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Sənəd yüklə</h3>
        </div>
        <p className="text-xs text-slate-500">
          Lab analizi, kadastr çıxarışı, qəbz və ya müqavilə — şəkil (JPG/PNG) və ya PDF, maksimum 15 MB.
          Sənədlər yalnız təşkilatınızın üzvlərinə görünür.
        </p>

        <FormField label="Sənəd növü">
          <ChoiceChips value={kind} onChange={setKind} options={KINDS} />
        </FormField>
        <FormField label="Başlıq (istəyə bağlı)">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Məs. 2026 torpaq analizi"
          />
        </FormField>
        <FormField label="Fayl">
          <input
            ref={fileRef}
            className="input"
            type="file"
            accept={ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </FormField>

        <ErrorNote message={error} />
        <button className="btn-primary" type="submit" disabled={!file || busy}>
          <Upload className="h-4 w-4" /> {busy ? "Yüklənir…" : "Yüklə"}
        </button>
      </form>

      {/* B17 — receipt → expense */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Qəbz oxut</h3>
        </div>
        <p className="text-xs text-slate-500">
          Mağaza qəbzinin şəklini çəkin — AI satıcını, tarixi və məbləği oxusun, siz təsdiqləyin,
          xərc avtomatik əməliyyat kimi yazılsın.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input max-w-xs"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(e) => {
              setReceiptFile(e.target.files?.[0] ?? null);
              setReceipt(null);
              setReceiptError("");
              setConfirmNote("");
            }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={onReadReceipt}
            disabled={!receiptFile || receiptBusy}
          >
            <Sparkles className="h-4 w-4" /> {receiptBusy ? "Oxunur…" : "Qəbzi oxu"}
          </button>
        </div>

        <ErrorNote message={receiptError} />

        {receipt && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            {parsed ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-slate-800">Oxunan qəbz</h4>
                  {parsed.confidence && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      əminlik: {parsed.confidence}
                    </span>
                  )}
                </div>
                <dl className="mt-2 grid gap-x-4 sm:grid-cols-2">
                  <div className="flex justify-between gap-2 border-b border-slate-100 py-1 text-sm">
                    <dt className="text-slate-500">Satıcı</dt>
                    <dd className="font-medium text-slate-800">{parsed.vendor ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-slate-100 py-1 text-sm">
                    <dt className="text-slate-500">Tarix</dt>
                    <dd className="font-medium text-slate-800">
                      {draft?.performed_on ?? parsed.purchase_date ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-slate-100 py-1 text-sm">
                    <dt className="text-slate-500">Məbləğ</dt>
                    <dd className="font-medium text-slate-800">
                      {parsed.total != null ? `${parsed.total} ${parsed.currency ?? "AZN"}` : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-slate-100 py-1 text-sm">
                    <dt className="text-slate-500">Xərc növü</dt>
                    <dd className="font-medium text-slate-800">{draft?.type ?? "—"}</dd>
                  </div>
                </dl>
                {parsed.items && parsed.items.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                    {parsed.items.slice(0, 8).map((it, i) => (
                      <li key={i}>
                        {it.name ?? "—"}
                        {it.qty != null ? ` · ${it.qty} ${it.unit ?? ""}` : ""}
                        {it.price != null ? ` · ${it.price}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={onConfirmExpense}
                    disabled={confirmBusy || !!receipt.document.operation_id || draft?.cost == null}
                  >
                    {confirmBusy ? "Yazılır…" : "Xərc kimi yaz"}
                  </button>
                  {receipt.document.operation_id && (
                    <span className="text-sm text-emerald-700">Xərc yazılıb ✓</span>
                  )}
                </div>
                {confirmNote && <p className="mt-2 text-sm text-slate-600">{confirmNote}</p>}
              </>
            ) : (
              <p className="text-sm text-slate-600">
                {receipt.message ?? "Qəbz saxlanıldı, amma məlumat oxunmadı — xərci əl ilə daxil edin."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* dossier list */}
      <div>
        <h3 className="mb-3 font-semibold text-slate-800">Sənədlər</h3>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Placeholder>
            Hələ sənəd yoxdur — lab analizi, kadastr çıxarışı və ya qəbzi bura yükləyin.
          </Placeholder>
        ) : (
          <ul className="space-y-2">
            {items.map((doc) => (
              <li key={doc.id} className="card">
                <div className="flex items-start gap-3">
                  {isImage(doc.mime_type) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={abs(doc.download_url)}
                      alt={doc.title ?? doc.original_name ?? "sənəd"}
                      className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                      {doc.mime_type === "application/pdf" ? (
                        <FileText className="h-6 w-6 text-slate-400" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-slate-400" />
                      )}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {doc.title || doc.original_name || "Sənəd"}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                        {KIND_LABEL[doc.kind] ?? doc.kind}
                      </span>
                      <span>{fmtDate(doc.created_at)}</span>
                      {fmtSize(doc.size_bytes) && <span>{fmtSize(doc.size_bytes)}</span>}
                      {doc.operation_id && <span className="text-emerald-700">xərc yazılıb</span>}
                    </p>
                    {doc.title && doc.original_name && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">{doc.original_name}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={abs(doc.download_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                      aria-label="Yüklə"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      className="btn-ghost text-red-600"
                      aria-label="Sil"
                      onClick={() => onDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
