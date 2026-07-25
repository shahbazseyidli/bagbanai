// Small fetch wrapper around the FastAPI backend.
// Auth is an httpOnly cookie set by the backend, so every request uses
// credentials: "include". Non-2xx responses throw an ApiError carrying the
// backend's JSON `detail`.

import { t, type I18nKey } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function url(path: string): string {
  if (path.startsWith("http")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function handle<T>(res: Response): Promise<T> {
  const body = await parse(res);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    if (body && typeof body === "object" && "detail" in body) {
      const d = (body as { detail: unknown }).detail;
      detail = typeof d === "string" ? d : JSON.stringify(d);
    } else if (typeof body === "string" && body) {
      detail = body;
    }
    throw new ApiError(res.status, detail);
  }
  return body as T;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(url(path), {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return handle<T>(res);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(url(path), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return handle<T>(res);
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(url(path), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return handle<T>(res);
  },

  async del<T>(path: string): Promise<T> {
    const res = await fetch(url(path), {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return handle<T>(res);
  },

  async upload<T>(path: string, file: File, fieldName = "file"): Promise<T> {
    const form = new FormData();
    form.append(fieldName, file);
    const res = await fetch(url(path), {
      method: "POST",
      credentials: "include",
      body: form,
    });
    return handle<T>(res);
  },
};

// Backend detail-code → i18n key (D0.5). Resolved at call time in azError() so the message
// follows the user's locale — t() must NOT be evaluated at module load, where only the az dict
// is registered. Keeps raw "HTTP 500"/snake_case off the screen.
const ERR_KEYS: Record<string, I18nKey> = {
  email_taken: "app.err.emailTaken",
  invalid_credentials: "app.err.invalidCredentials",
  email_not_verified: "app.err.emailNotVerified",
  invalid_otp: "app.err.invalidOtp",
  otp_expired: "app.err.otpExpired",
  too_many_attempts: "app.err.tooManyAttempts",
  field_limit_reached: "app.err.fieldLimitReached",
  field_too_small: "app.err.fieldTooSmall",
  not_a_polygon: "app.err.notAPolygon",
  invalid_polygon_self_intersection: "app.err.selfIntersection",
  need_at_least_3_vertices: "app.err.needThreeVertices",
  farm_not_found: "app.err.farmNotFound",
  field_not_found: "app.err.fieldNotFound",
  photo_not_in_plan: "app.err.photoNotInPlan",
  photo_quota_exceeded: "app.err.photoQuotaExceeded",
  ai_not_configured: "app.err.aiNotConfigured",
  unauthorized: "app.err.sessionExpired",
};

/** Turn any thrown error into a friendly Azerbaijani message. */
export function azError(err: unknown): string {
  if (err instanceof ApiError) {
    const k = ERR_KEYS[err.detail];
    if (k) return t(k);
    if (err.status === 401) return t("app.err.sessionExpired");
    if (err.status === 403) return t("app.err.forbidden");
    if (err.status === 404) return t("app.err.notFound");
    // FastAPI 422 detail is a LIST of Pydantic errors; handle() stringifies it, so without this
    // branch a raw JSON array would be rendered into the UI.
    if (err.status === 422) return t("app.err.invalidValue");
    if (err.status >= 500) return t("app.err.serverError");
    // Never surface a raw snake_case code or "HTTP 500" to a farmer.
    return /^[a-z0-9_]+$/.test(err.detail) ? t("app.err.generic") : err.detail;
  }
  return t("app.err.generic");
}

export function apiAsset(path: string): string {
  // Server-issued asset URLs are already absolute app paths ("/api/documents/<id>/download").
  // Legacy stored paths look like "uploads/xxx.jpg" — those have NO route and are only kept
  // working for callers that still pass them; prefer the authenticated /api/... serve routes.
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/api/")) return `${API_BASE}${path}`;
  return `${API_BASE}/${path.replace(/^\//, "")}`;
}
