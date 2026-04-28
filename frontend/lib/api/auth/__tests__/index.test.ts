import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  changePassword,
  confirmPasswordReset,
  getMe,
  googleLogin,
  login,
  logout,
  register,
  requestGuestOTP,
  requestPasswordReset,
  resendVerificationEmail,
  updateMe,
  verifyEmail,
  verifyGuestOTP,
} from "@/lib/api/auth";
import * as client from "@/lib/api/client";

describe("auth API wrappers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getMe calls users/me", async () => {
    vi.spyOn(client, "apiGet").mockResolvedValue({ id: 1 });
    await expect(getMe()).resolves.toEqual({ id: 1 });
    expect(client.apiGet).toHaveBeenCalledWith("/api/v1/users/me/");
  });

  it("login and logout", async () => {
    vi.spyOn(client, "apiPost").mockResolvedValue({ user: {} });
    await login({ email: "a@b.com", password: "x" });
    expect(client.apiPost).toHaveBeenCalledWith("/api/v1/auth/login/", {
      email: "a@b.com",
      password: "x",
    });
    await logout();
    expect(client.apiPost).toHaveBeenCalledWith("/api/v1/auth/logout/", {});
  });

  it("register", async () => {
    vi.spyOn(client, "apiPost").mockResolvedValue({ detail: "verify" });
    await register({
      email: "a@b.com",
      password1: "x",
      password2: "x",
      first_name: "A",
      last_name: "B",
      phone: "1",
    });
    expect(client.apiPost).toHaveBeenCalledWith(
      "/api/v1/auth/registration/",
      expect.any(Object),
    );
  });

  it("password reset and confirm", async () => {
    vi.spyOn(client, "apiPost").mockResolvedValue({ detail: "ok" });
    await requestPasswordReset({ email: "a@b.com" });
    await confirmPasswordReset({
      uid: "1",
      token: "t",
      new_password1: "x",
      new_password2: "x",
    });
    expect(client.apiPost).toHaveBeenLastCalledWith(
      "/api/v1/auth/password/reset/confirm/",
      expect.any(Object),
    );
  });

  it("changePassword", async () => {
    vi.spyOn(client, "apiPost").mockResolvedValue({ detail: "changed" });
    await changePassword({
      old_password: "a",
      new_password1: "b",
      new_password2: "b",
    });
    expect(client.apiPost).toHaveBeenCalledWith(
      "/api/v1/auth/password/change/",
      expect.any(Object),
    );
  });

  it("verifyEmail and resendVerificationEmail", async () => {
    vi.spyOn(client, "apiPost").mockResolvedValue({ detail: "sent" });
    await verifyEmail("key-1");
    await resendVerificationEmail("a@b.com");
    expect(client.apiPost).toHaveBeenLastCalledWith(
      "/api/v1/auth/registration/resend-email/",
      { email: "a@b.com" },
    );
  });

  it("googleLogin", async () => {
    vi.spyOn(client, "apiPost").mockResolvedValue({ user: {} });
    await googleLogin("token");
    expect(client.apiPost).toHaveBeenCalledWith("/api/v1/auth/google/", {
      access_token: "token",
    });
  });

  it("guest OTP", async () => {
    vi.spyOn(client, "apiPost").mockResolvedValue({ detail: "ok" });
    await requestGuestOTP({ email: "g@b.com" });
    await verifyGuestOTP({ email: "g@b.com", otp: "123456" });
    expect(client.apiPost).toHaveBeenLastCalledWith(
      "/api/v1/users/guest/verify-otp/",
      expect.any(Object),
    );
  });

  it("updateMe patches profile", async () => {
    vi.spyOn(client, "apiPatch").mockResolvedValue({ id: 1 });
    await updateMe({ first_name: "N" });
    expect(client.apiPatch).toHaveBeenCalledWith("/api/v1/users/me/", {
      first_name: "N",
    });
  });
});
