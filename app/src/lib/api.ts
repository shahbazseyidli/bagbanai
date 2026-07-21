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

export function apiAsset(path: string): string {
  // Stored photos come back like "uploads/xxx.jpg"; prefix the base best-effort.
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}/${path.replace(/^\//, "")}`;
}
