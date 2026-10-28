/**
 * Thin fetch wrapper following the contract conventions:
 * Bearer auth, JSON bodies, `{ error: { code, message } }` errors, Idempotency-Key on money POSTs.
 */
import { getAccessToken, useSession } from "@/store/session";
import { Platform } from "react-native";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}
import { getApiBaseUrl } from "./baseUrl";

export async function http<T>(method: string, path: string, body?: unknown, opts: { multipartFile?: string; idempotent?: boolean; timeoutMs?: number } = {}): Promise<T> {
  const base = getApiBaseUrl();
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.idempotent) headers["Idempotency-Key"] = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let payload: BodyInit | undefined;
  if (opts.multipartFile) {
    const form = new FormData();
    if (Platform.OS === "web") {
      try {
        const fileResponse = await fetch(opts.multipartFile);
        const blob = await fileResponse.blob();
        const extension = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        form.append("photo", blob, `photo.${extension}`);
      } catch {
        throw new ApiError(0, "PHOTO_READ", "Could not read that photo. Try taking it again.");
      }
    } else {
      form.append("photo", { uri: opts.multipartFile, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
    }
    payload = form;
  } else if (body !== undefined && method !== "GET") {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res: Response;
  const timeoutMs = opts.timeoutMs ?? (opts.multipartFile ? 60000 : 12000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    res = await fetch(base + path, { method, headers, body: payload, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(
        0,
        "TIMEOUT",
        opts.multipartFile
          ? "The photo upload took too long. Try a smaller photo or check your connection."
          : "The request took too long. Check your connection and try again."
      );
    }
    throw new ApiError(0, "NETWORK", "No internet connection. Check your data or Wi-Fi and try again.");
  } finally {
    clearTimeout(timeoutId);
  }
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error ?? json ?? {};
    if (res.status === 401 && !path.startsWith("/auth/")) {
      useSession.getState().signOut().catch(() => {});
    }
    throw new ApiError(res.status, e.code ?? "UNKNOWN", e.message ?? "Something went wrong. Try again.", e.details);
  }
  return json as T;
}
