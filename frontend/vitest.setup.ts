import "@testing-library/jest-dom";
import { vi } from "vitest";

// ─── Mock Next.js navigation ───────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: () => "/",
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
}));

// ─── Mock Next.js cache ─────────────────────────────────────────────────────
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

// ─── Mock Stripe ────────────────────────────────────────────────────────────
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
}));
