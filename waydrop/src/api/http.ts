/**
 * Thin fetch wrapper following the contract conventions:
 * Bearer auth, JSON bodies, `{ error: { code, message } }` errors, Idempotency-Key on money POSTs.
 */
import { getAccessToken } from "@/store/session";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export async function http<T>(method: string, path: string, body?: unknown, opts: { multipartFile?: string; idempotent?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.idempotent) headers["Idempotency-Key"] = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let payload: BodyInit | undefined;
  if (opts.multipartFile) {
    const form = new FormData();
    form.append("photo", { uri: opts.multipartFile, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
    payload = form;
  } else if (body !== undefined && method !== "GET") {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(BASE + path, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "NETWORK", "No internet connection. Check your data or Wi-Fi and try again.");
  }
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error ?? {};
    throw new ApiError(res.status, e.code ?? "UNKNOWN", e.message ?? "Something went wrong. Try again.", e.details);
  }
  return json as T;
}
