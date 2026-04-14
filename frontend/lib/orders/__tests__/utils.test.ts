import { describe, it, expect, vi } from "vitest";

// ─── Mock de dependencias externas ───────────────────────────────────────────
vi.mock("@/lib/locations", () => ({
  getShippingLabel: vi.fn((type: string) => {
    const map: Record<string, string> = {
      home: "Envío a domicilio",
      store: "Recogida en tienda",
      pickup: "Punto de recogida",
    };
    return map[type] ?? "Envío";
  }),
  findStoreLocation: vi.fn(),
  findPickupLocation: vi.fn(),
}));


vi.mock("react-icons/fa6", () => ({
  FaUser: "FaUser",
  FaUserShield: "FaUserShield",
  FaTriangleExclamation: "FaTriangleExclamation",
  FaCheck: "FaCheck",
  FaBan: "FaBan",
}));

// ─── Importamos las constantes REALES para que los valores string sean exactos
import { findStoreLocation, findPickupLocation } from "@/lib/locations";
import { SYSTEM_MSGS, SPECIAL_STATUS_CONFIG } from "@/lib/orders/constants";
import {
  formatHistoryReason,
  canOrderBeReturned,
  shouldShowHistoryButton,
  calculateDiscounts,
  getReturnableItems,
  getReturnStatusBadge,
  getOrderCancellationDetails,
  getOrderCancellationDetailsUser,
  getOrderTotals,
  getOrderShippingDetails,
  formatOrderForDisplay,
  getEventVisuals,
} from "@/lib/orders/utils";

// ─── formatHistoryReason ──────────────────────────────────────────────────────
describe("formatHistoryReason", () => {
  it("devuelve texto mapeado para ORDER_CREATED", () => {
    expect(formatHistoryReason(SYSTEM_MSGS.ORDER_CREATED)).toBe(
      "Pedido realizado con éxito",
    );
  });

  it("devuelve texto mapeado para CANCELLED_BY_USER", () => {
    expect(formatHistoryReason(SYSTEM_MSGS.CANCELLED_BY_USER)).toBe(
      "Cancelaste el pedido",
    );
  });

  it("devuelve texto mapeado para CANCELLED_BY_ADMIN", () => {
    expect(formatHistoryReason(SYSTEM_MSGS.CANCELLED_BY_ADMIN)).toBe(
      "Cancelado por administración",
    );
  });

  it("devuelve texto mapeado para ORDER_EXPIRED", () => {
    expect(formatHistoryReason(SYSTEM_MSGS.ORDER_EXPIRED)).toBe(
      "Expirado por falta de pago (Tiempo límite excedido)",
    );
  });

  it("devuelve texto mapeado para RETURN_ACCEPTED", () => {
    expect(formatHistoryReason(SYSTEM_MSGS.RETURN_ACCEPTED)).toBe(
      "Reembolso procesado",
    );
  });

  it("devuelve texto mapeado para RETURN_REJECTED", () => {
    expect(formatHistoryReason(SYSTEM_MSGS.RETURN_REJECTED)).toBe(
      "Solicitud de devolución rechazada",
    );
  });

  it("devuelve el mismo string si no está en el mapa", () => {
    expect(formatHistoryReason("Texto personalizado")).toBe(
      "Texto personalizado",
    );
  });

  it("devuelve texto por defecto para null/undefined", () => {
    expect(formatHistoryReason(null)).toBe("Evento registrado");
    expect(formatHistoryReason(undefined)).toBe("Evento registrado");
  });
});

// ─── canOrderBeReturned ───────────────────────────────────────────────────────
describe("canOrderBeReturned", () => {
  it("devuelve true para pedido pagado y entregado no cancelado", () => {
    expect(
      canOrderBeReturned({
        paymentStatus: "PAID",
        fulfillmentStatus: "DELIVERED",
        isCancelled: false,
      }),
    ).toBe(true);
  });

  it("devuelve false si el pedido está cancelado", () => {
    expect(
      canOrderBeReturned({
        paymentStatus: "PAID",
        fulfillmentStatus: "DELIVERED",
        isCancelled: true,
      }),
    ).toBe(false);
  });

  it("devuelve false si el pago no es PAID", () => {
    expect(
      canOrderBeReturned({
        paymentStatus: "PENDING",
        fulfillmentStatus: "DELIVERED",
        isCancelled: false,
      }),
    ).toBe(false);
  });

  it("devuelve false si el fulfillment no es DELIVERED", () => {
    expect(
      canOrderBeReturned({
        paymentStatus: "PAID",
        fulfillmentStatus: "PENDING",
        isCancelled: false,
      }),
    ).toBe(false);
  });
});

// ─── shouldShowHistoryButton ──────────────────────────────────────────────────
describe("shouldShowHistoryButton", () => {
  it("devuelve true si hay reembolso completo", () => {
    expect(
      shouldShowHistoryButton({
        paymentStatus: "REFUNDED",
        isCancelled: false,
      }),
    ).toBe(true);
  });

  it("devuelve true si hay reembolso parcial", () => {
    expect(
      shouldShowHistoryButton({
        paymentStatus: "PARTIALLY_REFUNDED",
        isCancelled: false,
      }),
    ).toBe(true);
  });

  it("devuelve true si hay returnReason activo", () => {
    expect(
      shouldShowHistoryButton({
        paymentStatus: "PAID",
        returnReason: "Producto defectuoso",
        isCancelled: false,
      }),
    ).toBe(true);
  });

  it("devuelve true si hay incidentes en el historial y no está cancelado", () => {
    expect(
      shouldShowHistoryButton({
        paymentStatus: "PAID",
        history: [{ type: "INCIDENT" }],
        isCancelled: false,
      }),
    ).toBe(true);
  });

  it("devuelve false para pedido normal sin incidentes", () => {
    expect(
      shouldShowHistoryButton({
        paymentStatus: "PAID",
        isCancelled: false,
        history: [],
      }),
    ).toBe(false);
  });
});

// ─── calculateDiscounts ───────────────────────────────────────────────────────
describe("calculateDiscounts", () => {
  it("usa compareAtPrice cuando es mayor que el precio actual", () => {
    const items = [
      {
        priceMinorSnapshot: 1000,
        quantity: 2,
        product: { compareAtPrice: 1500 },
      },
    ];
    expect(calculateDiscounts(items)).toBe(3000); // 1500 * 2
  });

  it("usa priceMinorSnapshot cuando compareAtPrice es null", () => {
    const items = [
      {
        priceMinorSnapshot: 1000,
        quantity: 3,
        product: { compareAtPrice: null },
      },
    ];
    expect(calculateDiscounts(items)).toBe(3000);
  });

  it("usa priceMinorSnapshot cuando compareAtPrice es menor", () => {
    const items = [
      {
        priceMinorSnapshot: 1500,
        quantity: 1,
        product: { compareAtPrice: 1000 },
      },
    ];
    expect(calculateDiscounts(items)).toBe(1500);
  });

  it("suma múltiples items correctamente", () => {
    const items = [
      {
        priceMinorSnapshot: 1000,
        quantity: 2,
        product: { compareAtPrice: null },
      },
      {
        priceMinorSnapshot: 500,
        quantity: 1,
        product: { compareAtPrice: null },
      },
    ];
    expect(calculateDiscounts(items)).toBe(2500);
  });

  it("devuelve 0 para array vacío", () => {
    expect(calculateDiscounts([])).toBe(0);
  });
});

// ─── getReturnableItems ───────────────────────────────────────────────────────
describe("getReturnableItems", () => {
  it("devuelve items que se pueden devolver", () => {
    const order = {
      items: [
        {
          id: "item1",
          nameSnapshot: "Camiseta",
          sizeSnapshot: "M",
          colorSnapshot: "Rojo",
          quantity: 2,
          quantityReturned: 0,
          quantityReturnRequested: 0,
          product: { images: [{ url: "img.jpg", color: "Rojo" }] },
        },
      ],
    } as any;
    const result = getReturnableItems(order);
    expect(result).toHaveLength(1);
    expect(result[0].maxQuantity).toBe(2);
  });

  it("excluye items ya devueltos completamente", () => {
    const order = {
      items: [
        {
          id: "item1",
          nameSnapshot: "Camiseta",
          sizeSnapshot: "M",
          colorSnapshot: "Rojo",
          quantity: 1,
          quantityReturned: 1,
          quantityReturnRequested: 0,
          product: { images: [] },
        },
      ],
    } as any;
    expect(getReturnableItems(order)).toHaveLength(0);
  });

  it("calcula maxQuantity restando devueltos y solicitados", () => {
    const order = {
      items: [
        {
          id: "item1",
          nameSnapshot: "Pantalón",
          sizeSnapshot: "L",
          colorSnapshot: "Azul",
          quantity: 3,
          quantityReturned: 1,
          quantityReturnRequested: 1,
          product: { images: [{ url: "img.jpg", color: "Azul" }] },
        },
      ],
    } as any;
    expect(getReturnableItems(order)[0].maxQuantity).toBe(1); // 3 - 1 - 1
  });
});

// ─── getReturnStatusBadge ─────────────────────────────────────────────────────
describe("getReturnStatusBadge", () => {
  it("devuelve badge Reembolsado para REFUNDED", () => {
    expect(
      getReturnStatusBadge({
        paymentStatus: "REFUNDED",
        fulfillmentStatus: "DELIVERED",
      })?.label,
    ).toBe("Reembolsado");
  });

  it("devuelve badge Reembolsado para PARTIALLY_REFUNDED", () => {
    expect(
      getReturnStatusBadge({
        paymentStatus: "PARTIALLY_REFUNDED",
        fulfillmentStatus: "DELIVERED",
      })?.label,
    ).toBe("Reembolsado");
  });

  it("devuelve badge Devuelto para RETURNED", () => {
    expect(
      getReturnStatusBadge({
        paymentStatus: "PAID",
        fulfillmentStatus: "RETURNED",
      })?.label,
    ).toBe("Devuelto");
  });

  it("devuelve badge Solicitud Pendiente si hay request sin cerrar", () => {
    const result = getReturnStatusBadge({
      paymentStatus: "PAID",
      fulfillmentStatus: "DELIVERED",
      history: [{ snapshotStatus: SYSTEM_MSGS.RETURN_REQUESTED }],
    });
    expect(result?.label).toBe("Solicitud Pendiente");
  });

  it("no muestra Solicitud Pendiente si la devolución ya fue aceptada", () => {
    const result = getReturnStatusBadge({
      paymentStatus: "PAID",
      fulfillmentStatus: "DELIVERED",
      history: [
        { snapshotStatus: SYSTEM_MSGS.RETURN_REQUESTED },
        { snapshotStatus: "Devolución Aceptada" },
      ],
    });
    expect(result?.label).not.toBe("Solicitud Pendiente");
  });

  it("no muestra Solicitud Pendiente si la devolución fue rechazada", () => {
    const result = getReturnStatusBadge({
      paymentStatus: "PAID",
      fulfillmentStatus: "DELIVERED",
      history: [
        { snapshotStatus: SYSTEM_MSGS.RETURN_REQUESTED },
        { snapshotStatus: "Solicitud Rechazada" },
      ],
    });
    expect(result?.label).not.toBe("Solicitud Pendiente");
  });

  it("devuelve null para pedido normal", () => {
    expect(
      getReturnStatusBadge({
        paymentStatus: "PAID",
        fulfillmentStatus: "DELIVERED",
        history: [],
      }),
    ).toBeNull();
  });
});

// ─── getOrderCancellationDetails ─────────────────────────────────────────────
describe("getOrderCancellationDetails", () => {
  it("devuelve null si el pedido no está cancelado", () => {
    expect(
      getOrderCancellationDetails({ isCancelled: false, history: [] }),
    ).toBeNull();
  });

  it("detecta cancelación por usuario", () => {
    const result = getOrderCancellationDetails({
      isCancelled: true,
      history: [
        {
          snapshotStatus: SPECIAL_STATUS_CONFIG.CANCELLED.label,
          actor: "user",
          reason: SYSTEM_MSGS.CANCELLED_BY_USER,
          createdAt: new Date(),
        },
      ],
    });
    expect(result?.bannerTitle).toContain("el Cliente");
    expect(result?.isExpired).toBe(false);
  });

  it("detecta pedido expirado", () => {
    const result = getOrderCancellationDetails({
      isCancelled: true,
      history: [
        {
          snapshotStatus: SPECIAL_STATUS_CONFIG.EXPIRED.label,
          actor: "system",
          reason: SYSTEM_MSGS.ORDER_EXPIRED,
          createdAt: new Date(),
        },
      ],
    });
    expect(result?.isExpired).toBe(true);
    expect(result?.bannerTitle).toBe("El pedido ha expirado");
  });
});

// ─── getOrderCancellationDetailsUser ─────────────────────────────────────────
describe("getOrderCancellationDetailsUser", () => {
  it("devuelve null si el pedido no está cancelado", () => {
    expect(
      getOrderCancellationDetailsUser({ isCancelled: false, history: [] }),
    ).toBeNull();
  });

  it("muestra mensaje para usuario que canceló", () => {
    const result = getOrderCancellationDetailsUser({
      isCancelled: true,
      history: [
        {
          snapshotStatus: SPECIAL_STATUS_CONFIG.CANCELLED.label,
          actor: "user",
          reason: SYSTEM_MSGS.CANCELLED_BY_USER,
          createdAt: new Date(),
        },
      ],
    });
    expect(result?.bannerTitle).toBe("Has cancelado este pedido");
  });

  it("muestra mensaje cuando canceló el admin", () => {
    const result = getOrderCancellationDetailsUser({
      isCancelled: true,
      history: [
        {
          snapshotStatus: SPECIAL_STATUS_CONFIG.CANCELLED.label,
          actor: "admin",
          reason: SYSTEM_MSGS.CANCELLED_BY_ADMIN,
          createdAt: new Date(),
        },
      ],
    });
    expect(result?.bannerTitle).toBe("Pedido cancelado por el administrador");
  });
});

// ─── getOrderTotals ───────────────────────────────────────────────────────────
describe("getOrderTotals", () => {
  const makeOrder = (overrides: Record<string, any> = {}) => ({
    id: "order_1",
    userId: "user_1",
    email: "test@test.com",
    createdAt: new Date(),
    paymentStatus: "PAID",
    fulfillmentStatus: "DELIVERED",
    isCancelled: false,
    currency: "EUR",
    paymentMethod: "card",
    itemsTotalMinor: 2000,
    shippingCostMinor: 500,
    taxMinor: 0,
    totalMinor: 2500,
    street: null,
    addressExtra: null,
    postalCode: null,
    city: null,
    province: null,
    country: null,
    phone: null,
    firstName: null,
    lastName: null,
    shippingType: "HOME",
    storeLocationId: null,
    pickupLocationId: null,
    pickupSearch: null,
    returnReason: null,
    history: [],
    items: [
      {
        id: "item_1",
        priceMinorSnapshot: 1000,
        quantity: 2,
        quantityReturned: 0,
        quantityReturnRequested: 0,
        nameSnapshot: "Camiseta",
        sizeSnapshot: "M",
        colorSnapshot: "Rojo",
        product: {
          slug: "camiseta",
          compareAtPrice: null,
          images: [],
        },
      },
    ],
    ...overrides,
  });

  it("calcula originalSubtotal y totalDiscount correctamente sin compareAtPrice", () => {
    const order = makeOrder();
    const result = getOrderTotals(order as any);

    expect(result.originalSubtotal).toBe(2000); // 1000 * 2
    expect(result.totalDiscount).toBe(0); // 2000 - 2000
  });

  it("calcula totalDiscount cuando compareAtPrice es mayor", () => {
    const order = makeOrder({
      itemsTotalMinor: 2000,
      items: [
        {
          id: "item_1",
          priceMinorSnapshot: 1000,
          quantity: 2,
          quantityReturned: 0,
          product: { slug: "camiseta", compareAtPrice: 1500, images: [] },
        },
      ],
    });
    const result = getOrderTotals(order as any);

    expect(result.originalSubtotal).toBe(3000); // 1500 * 2
    expect(result.totalDiscount).toBe(1000); // 3000 - 2000
  });

  it("calcula refundedAmountMinor sumando items devueltos", () => {
    const order = makeOrder({
      items: [
        {
          id: "item_1",
          priceMinorSnapshot: 1000,
          quantity: 2,
          quantityReturned: 1,
          product: { slug: "camiseta", compareAtPrice: null, images: [] },
        },
      ],
    });
    const result = getOrderTotals(order as any);

    expect(result.refundedAmountMinor).toBe(1000); // 1000 * 1
  });

  it("usa totalMinor como refundedAmount si status es REFUNDED y quantityReturned es 0", () => {
    const order = makeOrder({ paymentStatus: "REFUNDED", totalMinor: 2500 });
    const result = getOrderTotals(order as any);

    expect(result.refundedAmountMinor).toBe(2500);
  });

  it("calcula netTotalMinor restando el reembolso", () => {
    const order = makeOrder({
      totalMinor: 2500,
      items: [
        {
          id: "item_1",
          priceMinorSnapshot: 1000,
          quantity: 2,
          quantityReturned: 1,
          product: { slug: "camiseta", compareAtPrice: null, images: [] },
        },
      ],
    });
    const result = getOrderTotals(order as any);

    expect(result.netTotalMinor).toBe(1500); // 2500 - 1000
  });
});

// ─── getOrderShippingDetails ──────────────────────────────────────────────────
describe("getOrderShippingDetails", () => {
  it("HOME: construye líneas de dirección completas", () => {
    const order = {
      shippingType: "HOME",
      street: "Calle Mayor 1",
      addressExtra: "2ºA",
      postalCode: "28001",
      city: "Madrid",
      province: "Madrid",
      country: "España",
      storeLocationId: null,
      pickupLocationId: null,
      pickupSearch: null,
    };

    const result = getOrderShippingDetails(order as any);

    expect(result.label).toBeTruthy();
    expect(result.addressLines[0]).toContain("Calle Mayor 1");
    expect(result.addressLines[0]).toContain("2ºA");
    expect(result.addressLines[1]).toContain("28001");
    expect(result.addressLines[1]).toContain("Madrid");
  });

  it("HOME: omite addressExtra si es null", () => {
    const order = {
      shippingType: "HOME",
      street: "Calle Mayor 1",
      addressExtra: null,
      postalCode: "28001",
      city: "Madrid",
      province: "Madrid",
      country: "España",
      storeLocationId: null,
      pickupLocationId: null,
      pickupSearch: null,
    };

    const result = getOrderShippingDetails(order as any);

    expect(result.addressLines[0]).toBe("Calle Mayor 1");
    expect(result.addressLines[0]).not.toContain(",");
  });

  it("STORE: muestra 'Ubicación desconocida' si findStoreLocation devuelve undefined", () => {
    vi.mocked(findStoreLocation).mockReturnValue(undefined);

    const order = {
      shippingType: "STORE",
      storeLocationId: "store_unknown",
      street: null,
      addressExtra: null,
      postalCode: null,
      city: null,
      province: null,
      country: null,
      pickupLocationId: null,
      pickupSearch: null,
    };

    const result = getOrderShippingDetails(order as any);
    expect(result.addressLines.join(" ")).toContain("store_unknown");
  });

  it("STORE: muestra nombre y dirección de la tienda si findStoreLocation la encuentra", () => {
    vi.mocked(findStoreLocation).mockReturnValue({
      name: "Tienda Centro",
      addressLine1: "Gran Vía 10",
    } as any);

    const order = {
      shippingType: "STORE",
      storeLocationId: "store_1",
      street: null,
      addressExtra: null,
      postalCode: null,
      city: null,
      province: null,
      country: null,
      pickupLocationId: null,
      pickupSearch: null,
    };

    const result = getOrderShippingDetails(order as any);
    expect(result.addressLines).toContain("Tienda Centro");
    expect(result.addressLines).toContain("Gran Vía 10");
  });

  it("PICKUP: muestra nombre del punto si findPickupLocation lo encuentra", () => {
    vi.mocked(findPickupLocation).mockReturnValue({
      name: "Punto Correos A",
    } as any);

    const order = {
      shippingType: "PICKUP",
      pickupLocationId: "pickup_1",
      pickupSearch: null,
      street: null,
      addressExtra: null,
      postalCode: null,
      city: null,
      province: null,
      country: null,
      storeLocationId: null,
    };

    const result = getOrderShippingDetails(order as any);
    expect(result.addressLines).toContain("Punto Correos A");
  });

  it("PICKUP: muestra pickupSearch si no encuentra la ubicación", () => {
    vi.mocked(findPickupLocation).mockReturnValue(undefined);

    const order = {
      shippingType: "PICKUP",
      pickupLocationId: null,
      pickupSearch: "Correos Madrid Centro",
      street: null,
      addressExtra: null,
      postalCode: null,
      city: null,
      province: null,
      country: null,
      storeLocationId: null,
    };

    const result = getOrderShippingDetails(order as any);
    expect(result.addressLines.join(" ")).toContain("Correos Madrid Centro");
  });
});

// ─── formatOrderForDisplay ────────────────────────────────────────────────────
describe("formatOrderForDisplay", () => {
  const makeFullOrder = (overrides: Record<string, any> = {}) => ({
    id: "order_1",
    userId: "user_1",
    email: "cliente@test.com",
    createdAt: new Date("2024-06-01"),
    paymentStatus: "PAID",
    fulfillmentStatus: "DELIVERED",
    isCancelled: false,
    currency: "EUR",
    paymentMethod: "card",
    itemsTotalMinor: 1999,
    shippingCostMinor: 399,
    taxMinor: 0,
    totalMinor: 2398,
    firstName: "Juan",
    lastName: "García",
    phone: "600000000",
    street: "Calle Test 1",
    addressExtra: null,
    postalCode: "28001",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    shippingType: "HOME",
    storeLocationId: null,
    pickupLocationId: null,
    pickupSearch: null,
    returnReason: null,
    history: [],
    items: [
      {
        id: "item_1",
        nameSnapshot: "Camiseta Roja",
        sizeSnapshot: "M",
        colorSnapshot: "Rojo",
        quantity: 1,
        priceMinorSnapshot: 1999,
        quantityReturned: 0,
        quantityReturnRequested: 0,
        product: {
          slug: "camiseta-roja",
          compareAtPrice: null,
          images: [{ url: "img.jpg", color: "Rojo" }],
        },
      },
    ],
    ...overrides,
  });

  it("mapea los campos básicos del pedido correctamente", () => {
    const result = formatOrderForDisplay(makeFullOrder() as any);

    expect(result.id).toBe("order_1");
    expect(result.email).toBe("cliente@test.com");
    expect(result.paymentStatus).toBe("PAID");
    expect(result.isCancelled).toBe(false);
  });

  it("construye totals con subtotal, shipping, tax y total", () => {
    const result = formatOrderForDisplay(makeFullOrder() as any);

    expect(result.totals.subtotal).toBe(1999);
    expect(result.totals.shipping).toBe(399);
    expect(result.totals.total).toBe(2398);
    expect(result.totals.tax).toBe(0);
  });

  it("totalDiscount es 0 cuando no hay compareAtPrice", () => {
    const result = formatOrderForDisplay(makeFullOrder() as any);
    expect(result.totals.totalDiscount).toBe(0);
  });

  it("totalDiscount refleja el descuento cuando compareAtPrice es mayor", () => {
    const order = makeFullOrder({
      itemsTotalMinor: 1999,
      items: [
        {
          id: "item_1",
          nameSnapshot: "Camiseta",
          sizeSnapshot: "M",
          colorSnapshot: "Rojo",
          quantity: 1,
          priceMinorSnapshot: 1999,
          quantityReturned: 0,
          product: {
            slug: "camiseta-roja",
            compareAtPrice: 2999,
            images: [],
          },
        },
      ],
    });
    const result = formatOrderForDisplay(order as any);

    expect(result.totals.originalSubtotal).toBe(2999);
    expect(result.totals.totalDiscount).toBe(1000);
  });

  it("construye contact con nombre completo, teléfono y email", () => {
    const result = formatOrderForDisplay(makeFullOrder() as any);

    expect(result.contact.name).toBe("Juan García");
    expect(result.contact.phone).toBe("600000000");
    expect(result.contact.email).toBe("cliente@test.com");
  });

  it("contact.name es string vacío si firstName y lastName son null", () => {
    const order = makeFullOrder({ firstName: null, lastName: null });
    const result = formatOrderForDisplay(order as any);
    expect(result.contact.name).toBe("");
  });

  it("mapea items con slug, cantidad, precio e imagen correcta por color", () => {
    const result = formatOrderForDisplay(makeFullOrder() as any);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Camiseta Roja");
    expect(result.items[0].slug).toBe("camiseta-roja");
    expect(result.items[0].quantity).toBe(1);
    expect(result.items[0].price).toBe(1999);
    expect(result.items[0].image).toBe("img.jpg");
  });

  it("item.subtitle combina talla y color con ' / '", () => {
    const result = formatOrderForDisplay(makeFullOrder() as any);
    expect(result.items[0].subtitle).toBe("M / Rojo");
  });

  it("item.image usa primera imagen si no hay match por color", () => {
    const order = makeFullOrder({
      items: [
        {
          id: "item_1",
          nameSnapshot: "Camiseta",
          sizeSnapshot: "M",
          colorSnapshot: "Verde",
          quantity: 1,
          priceMinorSnapshot: 1999,
          quantityReturned: 0,
          product: {
            slug: "camiseta",
            compareAtPrice: null,
            images: [{ url: "fallback.jpg", color: "Rojo" }],
          },
        },
      ],
    });
    const result = formatOrderForDisplay(order as any);
    expect(result.items[0].image).toBe("fallback.jpg");
  });

  it("item.image es null si no hay imágenes", () => {
    const order = makeFullOrder({
      items: [
        {
          id: "item_1",
          nameSnapshot: "Camiseta",
          sizeSnapshot: "M",
          colorSnapshot: "Rojo",
          quantity: 1,
          priceMinorSnapshot: 1999,
          quantityReturned: 0,
          product: { slug: "camiseta", compareAtPrice: null, images: [] },
        },
      ],
    });
    const result = formatOrderForDisplay(order as any);
    expect(result.items[0].image).toBeNull();
  });
});

// ─── getEventVisuals ──────────────────────────────────────────────────────────
describe("getEventVisuals", () => {
  it("actor admin/sistema usa config naranja", () => {
    const result = getEventVisuals("admin", "STATUS", "Enviado");
    expect(result.isAdmin).toBe(true);
    expect(result.actorConfig.bg).toContain("orange");
    expect(result.actorConfig.label).toBe("Soporte / Sistema");
  });

  it("actor system usa config naranja", () => {
    const result = getEventVisuals("system", "STATUS", "Creado");
    expect(result.isAdmin).toBe(true);
  });

  it("actor usuario usa config azul", () => {
    const result = getEventVisuals("user", "STATUS", "Pedido realizado");
    expect(result.isAdmin).toBe(false);
    expect(result.actorConfig.bg).toContain("blue");
    expect(result.actorConfig.label).toBe("Cliente");
  });

  it("tipo INCIDENT activa statusIcon de alerta", () => {
    const result = getEventVisuals("admin", "INCIDENT", "Incidencia");
    expect(result.isIncident).toBe(true);
    expect(result.statusIcon).not.toBeNull();
    expect(result.statusColor).toContain("red");
  });

  it("INCIDENT con 'Aceptada' usa icono check verde", () => {
    const result = getEventVisuals("admin", "INCIDENT", "Devolución Aceptada");
    expect(result.statusColor).toContain("green");
  });

  it("INCIDENT con 'Rechazada' usa icono ban rojo", () => {
    const result = getEventVisuals("admin", "INCIDENT", "Solicitud Rechazada");
    expect(result.statusColor).toContain("red");
  });

  it("tipo STATUS sin INCIDENT devuelve statusIcon null", () => {
    const result = getEventVisuals("user", "STATUS", "Pedido realizado");
    expect(result.isIncident).toBe(false);
    expect(result.statusIcon).toBeNull();
  });
});
