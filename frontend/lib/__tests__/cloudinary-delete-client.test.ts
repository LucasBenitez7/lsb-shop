import { afterEach, describe, expect, it, vi } from "vitest";

import { deleteCloudinaryAsset } from "@/lib/cloudinary-delete-client";

describe("deleteCloudinaryAsset", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("no hace petición si publicId está vacío", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await deleteCloudinaryAsset("   ");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("envía POST a /api/cloudinary/delete con publicId", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ result: "ok" }), { status: 200 }),
    );

    await deleteCloudinaryAsset("banners/hero_abc");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/cloudinary/delete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ publicId: "banners/hero_abc" }),
        credentials: "same-origin",
      }),
    );
  });
});
