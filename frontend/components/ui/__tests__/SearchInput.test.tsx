import { render, screen, fireEvent } from "@testing-library/react";
import * as nextNavigation from "next/navigation";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SearchInput } from "@/components/ui/SearchInput";

const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));

  vi.spyOn(nextNavigation, "useRouter").mockReturnValue({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  } as ReturnType<typeof nextNavigation.useRouter>);

  vi.spyOn(nextNavigation, "usePathname").mockReturnValue("/admin/orders");
  vi.spyOn(nextNavigation, "useSearchParams").mockReturnValue(
    mockSearchParams as ReturnType<typeof nextNavigation.useSearchParams>,
  );
});

describe("SearchInput", () => {
  it("preserves userId in the URL when searching if omitParamsOnSearch is empty", () => {
    mockSearchParams.set("userId", "1");
    mockSearchParams.set("page", "2");

    render(<SearchInput paramName="query" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "12" } });
    fireEvent.click(screen.getByTitle("Buscar"));

    const url = mockReplace.mock.calls[0][0] as string;
    expect(url).toContain("userId=1");
    expect(url).toContain("query=12");
    expect(url).toContain("page=1");
  });

  it("drops userId from the URL when searching with omitParamsOnSearch", () => {
    mockSearchParams.set("userId", "1");
    mockSearchParams.set("page", "2");

    render(
      <SearchInput paramName="query" omitParamsOnSearch={["userId"]} />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "12" } });
    fireEvent.click(screen.getByTitle("Buscar"));

    const url = mockReplace.mock.calls[0][0] as string;
    expect(url).not.toContain("userId=");
    expect(url).toContain("query=12");
    expect(url).toContain("page=1");
  });
});
