import { headers } from "next/headers";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { POST } from "@/app/webhooks/stripe/route";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

const { mockConstructEvent } = vi.hoisted(() => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  process.env.STRIPE_SECRET_KEY = "sk_test_key";

  return {
    mockConstructEvent: vi.fn(),
  };
});

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      webhooks: { constructEvent: mockConstructEvent },
    };
  }),
}));

const mockHeaders = vi.mocked(headers);

function makeHeadersList(sig: string | null = "valid-signature") {
  return {
    get: vi.fn((key: string) => (key === "stripe-signature" ? sig : null)),
  };
}

function makeRequest(body = "{}") {
  return { text: vi.fn().mockResolvedValue(body) } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /webhooks/stripe", () => {
  it("devuelve 400 si no hay firma", async () => {
    mockHeaders.mockResolvedValue(
      makeHeadersList(null) as unknown as Awaited<ReturnType<typeof headers>>,
    );

    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si la firma es inválida", async () => {
    mockHeaders.mockResolvedValue(
      makeHeadersList(
        "bad-signature",
      ) as unknown as Awaited<ReturnType<typeof headers>>,
    );
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it("devuelve 200 con { received: true } cuando la firma es válida", async () => {
    mockHeaders.mockResolvedValue(
      makeHeadersList(
        "valid-sig",
      ) as unknown as Awaited<ReturnType<typeof headers>>,
    );
    mockConstructEvent.mockReturnValue({ type: "payment_intent.succeeded" });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true });
  });
});
