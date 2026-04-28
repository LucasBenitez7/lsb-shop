import { describe, expect, it } from "vitest";

import {
  mapOrderDetailDRF,
  mapOrderListItemDRF,
  mapUserAddressDRF,
} from "@/lib/api/account/mappers";

import type { UserAddressDRFResponse } from "@/types/address";
import type {
  OrderDetailDRFResponse,
  OrderListItemDRFResponse,
} from "@/types/order";

describe("account mappers", () => {
  it("mapUserAddressDRF maps snake_case to camelCase", () => {
    const raw: UserAddressDRFResponse = {
      id: 5,
      name: "Home",
      first_name: "Ada",
      last_name: "Lovelace",
      phone: "+34000",
      street: "Main 1",
      details: "",
      city: "Madrid",
      province: "M",
      postal_code: "28001",
      country: "ES",
      is_default: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    };
    const out = mapUserAddressDRF(raw);
    expect(out.id).toBe("5");
    expect(out.firstName).toBe("Ada");
    expect(out.postalCode).toBe("28001");
    expect(out.isDefault).toBe(true);
  });

  it("mapOrderListItemDRF maps list item and nested lines", () => {
    const raw: OrderListItemDRFResponse = {
      id: 1,
      email: "a@b.com",
      payment_status: "PAID",
      fulfillment_status: "FULFILLED",
      is_cancelled: false,
      total_minor: 5000,
      currency: "EUR",
      created_at: "2024-01-01T00:00:00Z",
      items_count: 1,
      items: [
        {
          id: 10,
          name_snapshot: "Tee",
          size_snapshot: "M",
          color_snapshot: "black",
          quantity: 1,
          price_minor_snapshot: 5000,
          subtotal_minor: 5000,
          image_url: "https://cdn.example/img.jpg",
          product_slug: "tee",
          compare_at_unit_minor_snapshot: null,
        },
      ],
    };
    const out = mapOrderListItemDRF(raw);
    expect(out.id).toBe("1");
    expect(out.items).toHaveLength(1);
    expect(out.items[0].nameSnapshot).toBe("Tee");
    expect(out.items[0].product?.slug).toBe("tee");
  });

  it("mapOrderDetailDRF maps order, items, history and summary", () => {
    const raw: OrderDetailDRFResponse = {
      id: 99,
      user_id: 3,
      email: "u@x.com",
      first_name: "U",
      last_name: "Ser",
      phone: "1",
      payment_status: "PAID",
      fulfillment_status: "NEW",
      is_cancelled: false,
      currency: "EUR",
      payment_method: "card",
      items_total_minor: 2000,
      shipping_cost_minor: 0,
      tax_minor: 0,
      total_minor: 2000,
      shipping_type: "home",
      store_location_id: null,
      pickup_location_id: null,
      pickup_search: null,
      street: "S",
      address_extra: "",
      postal_code: "28001",
      city: "Madrid",
      province: "M",
      country: "ES",
      return_reason: null,
      delivered_at: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      stripe_payment_intent_id: "pi_x",
      items: [
        {
          id: 1,
          variant_id: 2,
          product_id: 3,
          product_slug: "p",
          name_snapshot: "Item",
          price_minor_snapshot: 2000,
          size_snapshot: "M",
          color_snapshot: "black",
          quantity: 1,
          quantity_returned: 0,
          subtotal_minor: 2000,
          image_url: null,
          compare_at_unit_minor_snapshot: null,
        },
      ],
      history: [
        {
          id: 1,
          type: "created",
          snapshot_status: "NEW",
          reason: "",
          actor: "system",
          details: {},
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
    };
    const out = mapOrderDetailDRF(raw);
    expect(out.id).toBe("99");
    expect(out.userId).toBe("3");
    expect(out.items).toHaveLength(1);
    expect(out.history).toHaveLength(1);
    expect(out.summary.originalQty).toBe(1);
    expect(out.summary.netTotalMinor).toBe(2000);
  });
});
