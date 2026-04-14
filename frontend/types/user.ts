// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "user" | "demo";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  is_staff: boolean;
  is_superuser: boolean;
  is_email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Admin user list row — extends API user with aggregate from backend (e.g. order count). */
export interface AdminUserListItem extends User {
  orders_count: number;
}

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password1: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface PasswordResetInput {
  email: string;
}

export interface PasswordResetConfirmInput {
  uid: string;
  token: string;
  new_password1: string;
  new_password2: string;
}

export interface PasswordChangeInput {
  old_password: string;
  new_password1: string;
  new_password2: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

// ─── Guest ───────────────────────────────────────────────────────────────────

export interface GuestSession {
  token: string;
  email: string;
  expires_at: string;
}

export interface GuestOTPRequestInput {
  email: string;
}

export interface GuestOTPVerifyInput {
  email: string;
  otp: string;
}