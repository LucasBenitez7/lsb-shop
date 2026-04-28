import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Isolated from `client.test.ts` so `vi.resetModules()` does not affect other suites.
 * Covers the silent JWT refresh + retry branch in `apiFetch`.
 */
describe("apiFetch silent refresh", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("401 on /users/me/ refreshes then retries and returns JSON", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 7, email: "a@b.com" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const { apiFetch } = await import("@/lib/api/client");
    await expect(apiFetch<{ id: number }>("/api/v1/users/me/")).resolves.toEqual({
      id: 7,
      email: "a@b.com",
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
