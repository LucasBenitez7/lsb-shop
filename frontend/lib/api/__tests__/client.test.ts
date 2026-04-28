import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { APIError, apiDelete, apiFetch, apiGet, apiPatch, apiPost, formatAPIErrorBody } from "@/lib/api/client";

describe("formatAPIErrorBody", () => {
  it("returns string detail", () => {
    expect(formatAPIErrorBody({ detail: "Not found" })).toBe("Not found");
  });

  it("joins string array detail", () => {
    expect(formatAPIErrorBody({ detail: ["a", "b"] })).toBe("a b");
  });

  it("reads non_field_errors", () => {
    expect(
      formatAPIErrorBody({ non_field_errors: ["Invalid credentials"] }),
    ).toBe("Invalid credentials");
  });

  it("reads first field error list entry", () => {
    expect(formatAPIErrorBody({ email: ["Enter a valid email."] })).toBe(
      "Enter a valid email.",
    );
  });

  it("returns null when nothing matches", () => {
    expect(formatAPIErrorBody({})).toBeNull();
  });
});

describe("APIError", () => {
  it("carries status and optional detail", () => {
    const err = new APIError("msg", 403, { code: 1 });
    expect(err.message).toBe("msg");
    expect(err.status).toBe(403);
    expect(err.detail).toEqual({ code: 1 });
    expect(err.name).toBe("APIError");
  });
});

describe("apiFetch and helpers", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("parses JSON on 200", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(apiFetch<{ ok: boolean }>("/api/v1/ping")).resolves.toEqual({
      ok: true,
    });
  });

  it("returns undefined on 204", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiFetch("/api/v1/ping")).resolves.toBeUndefined();
  });

  it("401 on auth-login path throws immediately", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Invalid" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(
      apiFetch("/api/v1/auth/login/", { method: "POST", body: "{}" }),
    ).rejects.toMatchObject({
      name: "APIError",
      status: 401,
      message: "Invalid",
    });
  });

  it("non-OK uses formatAPIErrorBody when JSON present", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ password: ["Too short."] }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(apiFetch("/api/v1/auth/registration/")).rejects.toMatchObject({
      status: 400,
      message: "Too short.",
    });
  });

  it("non-JSON error uses fallback message", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("upstream error", { status: 502 }),
    );
    await expect(apiFetch("/api/v1/x")).rejects.toMatchObject({
      status: 502,
      message: "Something went wrong. Please try again.",
    });
  });

  it("does not set Content-Type when body is FormData", async () => {
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      const headers = new Headers(init?.headers as HeadersInit);
      expect(headers.has("Content-Type")).toBe(false);
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const fd = new FormData();
    fd.append("file", new Blob(["x"]), "a.txt");
    await apiFetch("/api/v1/upload", { method: "POST", body: fd });
  });

  it("apiGet delegates to GET", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ n: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await apiGet<{ n: number }>("/api/v1/me");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/me"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("apiPost serializes JSON body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await apiPost("/api/v1/x", { a: 1 });
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ a: 1 }));
  });

  it("apiPatch serializes JSON body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await apiPatch("/api/v1/x", { b: 2 });
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ b: 2 }));
  });

  it("apiDelete sends DELETE", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await apiDelete("/api/v1/x");
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(init?.method).toBe("DELETE");
  });
});
