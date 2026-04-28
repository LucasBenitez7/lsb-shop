import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SuccessClient } from "@/features/checkout/components/SuccessClient";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockClearCart = vi.fn();
const mockClearCartApi = vi.fn();
const mockClearGuestAddress = vi.fn();

vi.mock("@/store/useCartStore", () => ({
  useCartStore: vi.fn((selector: (s: { clearCart: typeof mockClearCart; replaceItems: typeof vi.fn }) => unknown) =>
    selector({ clearCart: mockClearCart, replaceItems: vi.fn() }),
  ),
}));

vi.mock("@/lib/api/cart", () => ({
  clearCart: () => mockClearCartApi(),
}));

vi.mock("@/lib/checkout/guest-address-storage", () => ({
  clearGuestAddress: () => mockClearGuestAddress(),
  saveGuestAddress: vi.fn(),
  loadGuestAddress: vi.fn(),
}));

vi.mock("@/features/orders/components/OrderSummaryCard", () => ({
  OrderSummaryCard: ({ id }: { id: string }) => (
    <div data-testid="order-summary">{id}</div>
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

// ─── Fixtures ──────────────────────────────────────────────────────────────────
const makeOrder = (overrides = {}) =>
  ({
    id: "order-123",
    userId: "user-1",
    email: "lucas@test.com",
    currency: "EUR",
    createdAt: new Date(),
    paymentMethod: "Tarjeta",
    paymentStatus: "PAID",
    contact: { name: "Lucas García", phone: "600000000" },
    shippingInfo: { type: "home", address: "Calle Mayor 1" },
    items: [],
    totals: {
      subtotal: "19,99 €",
      shipping: "0,00 €",
      tax: "0,00 €",
      total: "19,99 €",
      originalSubtotal: "19,99 €",
      totalDiscount: "0,00 €",
    },
    ...overrides,
  }) as any;

// ─── SuccessClient ────────────────────────────────────────────────────────────
describe("SuccessClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(
      "checkout_session",
      JSON.stringify({ orderId: "order-123", timestamp: Date.now() }),
    );
  });

  it("llama a la API de clearCart al montar", async () => {
    mockClearCartApi.mockResolvedValue([]);
    render(<SuccessClient order={makeOrder()} />);
    await waitFor(() => expect(mockClearCartApi).toHaveBeenCalledTimes(1));
  });

  it("elimina checkout_session de localStorage al montar", () => {
    render(<SuccessClient order={makeOrder()} />);
    expect(localStorage.getItem("checkout_session")).toBeNull();
  });

  it("llama a clearGuestAddress al montar", () => {
    render(<SuccessClient order={makeOrder()} />);
    expect(mockClearGuestAddress).toHaveBeenCalledTimes(1);
  });

  it("muestra el título de confirmación", () => {
    render(<SuccessClient order={makeOrder()} />);
    expect(screen.getByText("Pedido realizado con éxito")).toBeInTheDocument();
  });

  it("muestra el email del pedido", () => {
    render(<SuccessClient order={makeOrder()} />);
    expect(screen.getByText("lucas@test.com")).toBeInTheDocument();
  });

  it("renderiza el OrderSummaryCard con el id de la orden", () => {
    render(<SuccessClient order={makeOrder()} />);
    expect(screen.getByTestId("order-summary")).toHaveTextContent("order-123");
  });

  it("muestra enlace a detalles del pedido para usuario autenticado", () => {
    render(<SuccessClient order={makeOrder({ userId: "user-1" })} />);
    const link = screen.getByRole("link", { name: /ver detalles del pedido/i });
    expect(link).toHaveAttribute("href", "/account/orders/order-123");
  });

  it("muestra enlace de tracking para usuario invitado (userId null)", () => {
    render(<SuccessClient order={makeOrder({ userId: null })} />);
    const link = screen.getByRole("link", { name: /ver detalles del pedido/i });
    expect(link).toHaveAttribute("href", "/tracking?orderId=order-123");
  });

  it("incluye payment_intent en tracking cuando hay stripePaymentIntentId", () => {
    render(
      <SuccessClient
        order={makeOrder({
          userId: null,
          stripePaymentIntentId: "pi_test_abc",
        })}
      />,
    );
    const link = screen.getByRole("link", { name: /ver detalles del pedido/i });
    expect(link).toHaveAttribute(
      "href",
      "/tracking/order-123?payment_intent=pi_test_abc",
    );
  });

  it("muestra enlace para volver a la tienda", () => {
    render(<SuccessClient order={makeOrder()} />);
    const link = screen.getByRole("link", { name: /volver a la tienda/i });
    expect(link).toHaveAttribute("href", "/catalogo");
  });
});
