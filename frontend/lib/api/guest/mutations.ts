"use server";

/**
 * Guest order tracking — OTP sessions and return requests.
 * Wire to Django guest OTP/session API when tracking is integrated.
 */

export async function verifyGuestAccessOrRedirect(
  _orderId: string,
): Promise<void> {
  void _orderId;
}

export async function requestGuestAccess(
  orderId: string,
  email: string,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  void orderId;
  void email;
  return { ok: true, message: "Paso 1 (stub): conecta el API de invitados." };
}

export async function verifyGuestAccess(
  orderId: string,
  email: string,
  otp: string,
): Promise<{ ok: boolean; error?: string }> {
  void orderId;
  void email;
  void otp;
  return { ok: true };
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
