// Small fetch wrapper around the FastAPI backend.
// Auth is an httpOnly cookie set by the backend, so every request uses
// credentials: "include". Non-2xx responses throw an ApiError carrying the
// backend's JSON `detail`.

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

// Backend detail-code → plain Azerbaijani (D0.5). Keeps raw "HTTP 500"/snake_case off the screen.
const ERR_AZ: Record<string, string> = {
  email_taken: "Bu email artıq qeydiyyatdadır.",
  invalid_credentials: "Email və ya parol yanlışdır.",
  email_not_verified: "Email təsdiqlənməyib — kodu daxil edin.",
  invalid_otp: "Kod yanlışdır.",
  otp_expired: "Kodun vaxtı bitib — yenidən göndərin.",
  too_many_attempts: "Çox cəhd oldu — bir azdan yenidən yoxlayın.",
  field_limit_reached: "Paketinizin sahə limiti doldu — paketi yüksəldin.",
  field_too_small: "Sahə çox kiçikdir (minimum ~0.05 ha). Sərhədi yenidən çəkin.",
  not_a_polygon: "Sahə sərhədi düzgün deyil.",
  invalid_polygon_self_intersection: "Sərhəd özü ilə kəsişir — yenidən çəkin.",
  need_at_least_3_vertices: "Ən azı 3 nöqtə lazımdır.",
  farm_not_found: "Ferma tapılmadı.",
  field_not_found: "Sahə tapılmadı.",
  photo_not_in_plan: "Foto diaqnoz Paket 3-dədir.",
  photo_quota_exceeded: "Bu ay foto diaqnoz limiti doldu.",
  ai_not_configured: "AI hazırda əlçatan deyil.",
  unauthorized: "Sessiya bitib — yenidən daxil olun.",
};

/** Turn any thrown error into a friendly Azerbaijani message. */
export function azError(err: unknown): string {
  if (err instanceof ApiError) {
    if (ERR_AZ[err.detail]) return ERR_AZ[err.detail];
    if (err.status === 401) return "Sessiya bitib — yenidən daxil olun.";
    if (err.status === 403) return "Bu əməliyyata icazəniz yoxdur.";
    if (err.status === 404) return "Tapılmadı.";
    if (err.status >= 500) return "Server xətası — bir azdan yenidən cəhd edin.";
    // Never surface a raw snake_case code or "HTTP 500" to a farmer.
    return /^[a-z0-9_]+$/.test(err.detail) ? "Xəta baş verdi. Yenidən cəhd edin." : err.detail;
  }
  return "Xəta baş verdi. Yenidən cəhd edin.";
}

export function apiAsset(path: string): string {
  // Stored photos come back like "uploads/xxx.jpg"; prefix the base best-effort.
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}/${path.replace(/^\//, "")}`;
}
