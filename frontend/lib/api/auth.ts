import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  User,
  LoginInput,
  RegisterInput,
  PasswordResetInput,
  PasswordResetConfirmInput,
  PasswordChangeInput,
  GuestSession,
  GuestOTPRequestInput,
  GuestOTPVerifyInput,
} from "@/types/user";

// ─── Session ──────────────────────────────────────────────────────────────────

export async function getMe(): Promise<User> {
  return apiGet<User>("/api/v1/users/me/");
}

// ─── Login / Logout ───────────────────────────────────────────────────────────

export async function login(data: LoginInput): Promise<{ user: User }> {
  return apiPost("/api/v1/auth/login/", data);
}

export async function logout(): Promise<void> {
  return apiPost("/api/v1/auth/logout/", {});
}

// ─── Register ─────────────────────────────────────────────────────────────────

/** Mandatory email verification returns `{ detail }` only; otherwise JWT fields. */
export type RegisterApiResponse = {
  detail?: string;
  access?: string;
  refresh?: string;
  user?: unknown;
};

export async function register(data: RegisterInput): Promise<RegisterApiResponse> {
  return apiPost<RegisterApiResponse>("/api/v1/auth/registration/", data);
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function requestPasswordReset(
  data: PasswordResetInput,
): Promise<{ detail: string }> {
  return apiPost("/api/v1/auth/password/reset/", data);
}

export async function confirmPasswordReset(
  data: PasswordResetConfirmInput,
): Promise<{ detail: string }> {
  return apiPost("/api/v1/auth/password/reset/confirm/", data);
}

// ─── Password change (authenticated) ─────────────────────────────────────────

export async function changePassword(
  data: PasswordChangeInput,
): Promise<{ detail: string }> {
  return apiPost("/api/v1/auth/password/change/", data);
}

// ─── Email verification ───────────────────────────────────────────────────────

export async function verifyEmail(key: string): Promise<{ detail: string }> {
  return apiPost("/api/v1/auth/registration/verify-email/", { key });
}

export async function resendVerificationEmail(
  email: string,
): Promise<{ detail: string }> {
  return apiPost("/api/v1/auth/registration/resend-email/", { email });
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function googleLogin(
  access_token: string,
): Promise<{ user: User }> {
  return apiPost("/api/v1/auth/google/", { access_token });
}

// ─── Guest OTP ────────────────────────────────────────────────────────────────

export async function requestGuestOTP(
  data: GuestOTPRequestInput,
): Promise<{ detail: string }> {
  return apiPost("/api/v1/users/guest/request-otp/", data);
}

export async function verifyGuestOTP(
  data: GuestOTPVerifyInput,
): Promise<GuestSession> {
  return apiPost<GuestSession>("/api/v1/users/guest/verify-otp/", data);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function updateMe(
  data: Partial<Pick<User, "first_name" | "last_name" | "phone">>,
): Promise<User> {
  return apiPatch("/api/v1/users/me/", data);
}
