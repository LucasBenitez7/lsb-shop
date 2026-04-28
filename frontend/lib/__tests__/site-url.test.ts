import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicSiteUrl } from "@/lib/site-url";

describe("getPublicSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trims trailing slashes from env", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example.com/");
    expect(getPublicSiteUrl()).toBe("https://shop.example.com");
  });

  it("falls back to localhost when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getPublicSiteUrl()).toBe("http://localhost:3000");
  });
});
