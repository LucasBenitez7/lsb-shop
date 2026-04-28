"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { GUEST_SESSION_COOKIE_NAME } from "@/lib/auth/guest-session-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const REQUEST_OTP_PATH = "/api/v1/users/guest/request-otp/";
const VERIFY_OTP_PATH = "/api/v1/users/guest/verify-otp/";

function normalizeOrderId(raw: string): number | null {
  const s = String(raw).trim().replace(/^#/, "");
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { detail: text };
  }
}

function extractErrorDetail(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "No se pudo completar la solicitud. Inténtalo de nuevo.";
  }
  const o = body as Record<string, unknown>;
  const d = o.detail;
  if (typeof d === "string" && d.trim()) return d;
  if (Array.isArray(d) && d.length && typeof d[0] === "string") return d[0];
  const nfe = o.non_field_errors;
  if (Array.isArray(nfe) && nfe.length && typeof nfe[0] === "string") {
    return nfe[0];
  }
  for (const [, val] of Object.entries(o)) {
    if (Array.isArray(val) && val.length) {
      const first = val[0];
      if (typeof first === "string") return first;
    }
  }
  return "No se pudo completar la solicitud. Inténtalo de nuevo.";
}

/**
 * For guest tracking pages without `payment_intent`, require the guest session cookie
 * set after OTP verification.
 */
export async function verifyGuestAccessOrRedirect(
  orderId: string,
  paymentIntent?: string | null,
): Promise<void> {
  if (paymentIntent?.trim()) return;
  const jar = await cookies();
  if (!jar.get(GUEST_SESSION_COOKIE_NAME)?.value) {
    redirect(`/tracking?orderId=${encodeURIComponent(orderId)}`);
  }
}

export async function requestGuestAccess(
  orderId: string,
  email: string,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const oid = normalizeOrderId(orderId);
  if (oid === null) {
    return {
      ok: false,
      error: "Introduce el número de pedido (solo dígitos).",
    };
  }
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const res = await fetch(`${API_BASE}${REQUEST_OTP_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: normalizedEmail, order_id: oid }),
      cache: "no-store",
    });
    const body = await parseResponseBody(res);
    if (!res.ok) {
      return { ok: false, error: extractErrorDetail(body) };
    }
    const detail = (body as { detail?: unknown })?.detail;
    const message =
      typeof detail === "string" && detail.trim()
        ? detail
        : "Te hemos enviado un código de verificación al email del pedido.";
    return { ok: true, message };
  } catch {
    return {
      ok: false,
      error:
        "No hay conexión con el servidor. Comprueba que la API está activa.",
    };
  }
}

export async function verifyGuestAccess(
  _orderId: string,
  email: string,
  otp: string,
): Promise<{ ok: boolean; error?: string }> {
  void _orderId;
  const normalizedEmail = email.trim().toLowerCase();
  const code = otp.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "El código debe ser de 6 dígitos." };
  }
  try {
    const res = await fetch(`${API_BASE}${VERIFY_OTP_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: normalizedEmail, otp: code }),
      cache: "no-store",
    });
    const body = await parseResponseBody(res);
    if (!res.ok) {
      return { ok: false, error: extractErrorDetail(body) };
    }
    const token = (body as { token?: string }).token;
    const expiresAt = (body as { expires_at?: string }).expires_at;
    if (!token) {
      return { ok: false, error: "Respuesta inválida del servidor." };
    }
    let maxAge = 60 * 60 * 24 * 7;
    if (expiresAt) {
      const ms = new Date(expiresAt).getTime() - Date.now();
      const sec = Math.floor(ms / 1000);
      if (Number.isFinite(sec) && sec > 300) maxAge = sec;
    }
    const jar = await cookies();
    jar.set(GUEST_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "No hay conexión con el servidor. Comprueba que la API está activa.",
    };
  }
}

export async function requestReturnGuestAction(
  orderId: string,
  reason: string,
  items: { itemId: string; qty: number }[],
): Promise<{ error?: string }> {
  void orderId;
  void reason;
  void items;
  return { error: "Guest return API not wired yet." };
}
