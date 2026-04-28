import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelOrder,
  deleteAddress,
  getOrderSuccessDetails,
  getPaymentIntent,
  getUserAddresses,
  getUserOrders,
  requestReturn,
  requestVerificationEmail,
  setDefaultAddress,
  upsertAddress,
} from "@/lib/api/account";
import * as auth from "@/lib/api/auth";
import * as client from "@/lib/api/client";

import type { User } from "@/types/user";

function sampleUser(over: Partial<User> = {}): User {
  return {
    id: 1,
    email: "user@test.com",
    first_name: "T",
    last_name: "User",
    phone: "600000000",
    role: "user",
    is_staff: false,
    is_superuser: false,
    is_email_verified: true,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...over,
  };
}

const drfAddress = {
  id: 1,
  name: "",
  first_name: "A",
  last_name: "B",
  phone: "1",
  street: "S",
  details: "",
  city: "C",
  province: "P",
  postal_code: "28001",
  country: "ES",
  is_default: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("account index API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getUserAddresses maps apiGet results", async () => {
    vi.spyOn(client, "apiGet").mockResolvedValue({ results: [drfAddress] });
    const rows = await getUserAddresses();
    expect(rows).toHaveLength(1);
    expect(rows[0].firstName).toBe("A");
  });

  it("upsertAddress posts when no id", async () => {
    vi.spyOn(client, "apiPost").mockResolvedValue(drfAddress);
    const out = await upsertAddress({
      id: undefined,
      firstName: "A",
      lastName: "B",
      phone: "1",
      street: "S",
      details: null,
      city: "C",
      province: "P",
      postalCode: "28001",
      country: "ES",
      isDefault: false,
      name: null,
      userId: "",
      createdAt: "",
      updatedAt: "",
    });
    expect(out?.postalCode).toBe("28001");
    expect(client.apiPost).toHaveBeenCalledWith(
      "/api/v1/users/addresses/",
      expect.objectContaining({ first_name: "A" }),
    );
  });

  it("upsertAddress patches when id set", async () => {
    vi.spyOn(client, "apiPatch").mockResolvedValue(drfAddress);
    await upsertAddress({
      id: "5",
      firstName: "A",
      lastName: "B",
      phone: "1",
      street: "S",
      details: null,
      city: "C",
      province: "P",
      postalCode: "28001",
      country: "ES",
      isDefault: false,
      name: null,
      userId: "",
      createdAt: "",
      updatedAt: "",
    });
    expect(client.apiPatch).toHaveBeenCalledWith(
      "/api/v1/users/addresses/5/",
      expect.any(Object),
    );
  });

  it("upsertAddress returns null on error", async () => {
    vi.spyOn(client, "apiPost").mockRejectedValue(new Error("network"));
    const out = await upsertAddress({
      firstName: "A",
      lastName: "B",
      phone: "1",
      street: "S",
      details: null,
      city: "C",
      province: "P",
      postalCode: "28001",
      country: "ES",
      isDefault: false,
      name: null,
      userId: "",
      createdAt: "",
      updatedAt: "",
    });
    expect(out).toBeNull();
  });

  it("deleteAddress and setDefaultAddress", async () => {
    vi.spyOn(client, "apiDelete").mockResolvedValue(undefined);
    vi.spyOn(client, "apiPost").mockResolvedValue({});
    await expect(deleteAddress("3")).resolves.toBe(true);
    await expect(setDefaultAddress("3")).resolves.toBe(true);
  });

  it("deleteAddress returns false on error", async () => {
    vi.spyOn(client, "apiDelete").mockRejectedValue(new Error("x"));
    await expect(deleteAddress("3")).resolves.toBe(false);
  });

  it("getUserOrders maps pagination and query params", async () => {
    vi.spyOn(client, "apiGet").mockResolvedValue({
      count: 2,
      total_pages: 1,
      current_page: 1,
      page_size: 10,
      results: [
        {
          id: 1,
          email: "a@b.com",
          payment_status: "PAID",
          fulfillment_status: "NEW",
          is_cancelled: false,
          total_minor: 100,
          currency: "EUR",
          created_at: "2024-01-01T00:00:00Z",
          items_count: 0,
          items: [],
        },
      ],
    });
    const res = await getUserOrders({ page: 1, limit: 10, status: "PAID", q: "x" });
    expect(res.totalCount).toBe(2);
    expect(res.orders).toHaveLength(1);
    expect(client.apiGet).toHaveBeenCalledWith(
      expect.stringContaining("page=1"),
    );
  });

  it("getUserOrders returns empty on error", async () => {
    vi.spyOn(client, "apiGet").mockRejectedValue(new Error("x"));
    const res = await getUserOrders();
    expect(res.orders).toEqual([]);
    expect(res.totalCount).toBe(0);
  });

  it("getOrderSuccessDetails with and without payment_intent", async () => {
    vi.spyOn(client, "apiGet").mockResolvedValue({
      id: 9,
      user_id: null,
      email: "a@b.com",
      first_name: "A",
      last_name: "B",
      phone: "1",
      payment_status: "PAID",
      fulfillment_status: "NEW",
      is_cancelled: false,
      currency: "EUR",
      payment_method: "card",
      items_total_minor: 100,
      shipping_cost_minor: 0,
      tax_minor: 0,
      total_minor: 100,
      shipping_type: "home",
      store_location_id: null,
      pickup_location_id: null,
      pickup_search: null,
      street: "S",
      address_extra: "",
      postal_code: "28001",
      city: "M",
      province: "M",
      country: "ES",
      return_reason: null,
      delivered_at: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      stripe_payment_intent_id: null,
      items: [],
    });
    const a = await getOrderSuccessDetails("9");
    expect(a?.id).toBe("9");
    await getOrderSuccessDetails("9", "pi_abc");
    expect(client.apiGet).toHaveBeenLastCalledWith(
      "/api/v1/orders/9/?payment_intent=pi_abc",
    );
  });

  it("getOrderSuccessDetails returns null on error", async () => {
    vi.spyOn(client, "apiGet").mockRejectedValue(new Error("x"));
    await expect(getOrderSuccessDetails("1")).resolves.toBeNull();
  });

  it("cancelOrder success and APIError failure", async () => {
    vi.spyOn(client, "apiPost").mockResolvedValue({});
    await expect(cancelOrder("1", "reason")).resolves.toEqual({ success: true });
    vi.spyOn(client, "apiPost").mockRejectedValue(new client.APIError("nope", 400));
    await expect(cancelOrder("1")).resolves.toEqual({
      success: false,
      message: "nope",
    });
  });

  it("requestVerificationEmail", async () => {
    vi.spyOn(auth, "getMe").mockResolvedValue(sampleUser());
    vi.spyOn(auth, "resendVerificationEmail").mockResolvedValue({ detail: "sent" });
    await expect(requestVerificationEmail()).resolves.toEqual({ success: true });
    vi.spyOn(auth, "getMe").mockRejectedValue(new client.APIError("fail", 400));
    await expect(requestVerificationEmail()).resolves.toEqual({
      success: false,
      message: "fail",
    });
  });

  it("requestReturn success and failure", async () => {
    vi.spyOn(client, "apiPost").mockResolvedValue({});
    await expect(
      requestReturn({
        orderId: "1",
        items: [{ itemId: "2", qty: 1 }],
        reason: "size",
      }),
    ).resolves.toEqual({ success: true });
    vi.spyOn(client, "apiPost").mockRejectedValue(new Error("x"));
    await expect(
      requestReturn({
        orderId: "1",
        items: [],
        reason: "x",
      }),
    ).resolves.toMatchObject({ success: false });
  });

  it("getPaymentIntent success and error", async () => {
    vi.spyOn(client, "apiGet").mockResolvedValue({
      client_secret: "sec",
      amount_minor: 500,
      currency: "EUR",
    });
    await expect(getPaymentIntent("10")).resolves.toEqual({
      clientSecret: "sec",
      amount: 500,
      currency: "eur",
    });
    vi.spyOn(client, "apiGet").mockRejectedValue(new client.APIError("missing", 404));
    await expect(getPaymentIntent("10")).resolves.toMatchObject({
      clientSecret: "",
      error: "missing",
    });
  });
});
