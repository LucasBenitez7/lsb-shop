import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useShippingAddressForm } from "@/features/checkout/hooks/use-address-form";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockSetValue = vi.fn();
const mockTrigger = vi.fn();
const mockGetValues = vi.fn();
const mockUpsertAddressAction = vi.fn();

vi.mock("react-hook-form", () => ({
  useFormContext: vi.fn(() => ({
    setValue: mockSetValue,
    trigger: mockTrigger,
    getValues: mockGetValues,
  })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api/account", () => ({
  upsertAddress: (...args: unknown[]) => mockUpsertAddressAction(...args),
}));

// ─── Fixtures ──────────────────────────────────────────────────────────────────
const validValues = {
  email: "lucas@test.com",
  firstName: "Lucas",
  lastName: "García",
  phone: "600000000",
  street: "Calle Mayor 1",
  postalCode: "28001",
  city: "Madrid",
  province: "Madrid",
  country: "España",
  details: "Piso 2A",
  isDefault: false,
};

const mockSavedAddress = {
  id: "addr-1",
  userId: "user-1",
  firstName: "Lucas",
  lastName: "García",
  phone: "600000000",
  street: "Calle Mayor 1",
  details: "Piso 2A",
  postalCode: "28001",
  city: "Madrid",
  province: "Madrid",
  country: "España",
  isDefault: false,
  name: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

const defaultProps = {
  initialData: null,
  onCancel: vi.fn(),
  onSuccess: vi.fn(),
  isGuest: false,
};

// ─── useShippingAddressForm ───────────────────────────────────────────────────
describe("useShippingAddressForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrigger.mockResolvedValue(true);
    mockGetValues.mockReturnValue(validValues);
  });

  it("inicializa isPending en false", () => {
    const { result } = renderHook(() => useShippingAddressForm(defaultProps));
    expect(result.current.isPending).toBe(false);
  });

  it("carga initialData en el formulario al montar", () => {
    renderHook(() =>
      useShippingAddressForm({
        ...defaultProps,
        initialData: mockSavedAddress,
      }),
    );
    expect(mockSetValue).toHaveBeenCalledWith("firstName", "Lucas");
    expect(mockSetValue).toHaveBeenCalledWith("street", "Calle Mayor 1");
    expect(mockSetValue).toHaveBeenCalledWith("city", "Madrid");
  });

  it("establece isDefault a false si no hay initialData", () => {
    renderHook(() => useShippingAddressForm(defaultProps));
    expect(mockSetValue).toHaveBeenCalledWith("isDefault", false);
  });

  it("no llama a trigger ni a onSuccess si la validación falla", async () => {
    mockTrigger.mockResolvedValue(false);
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useShippingAddressForm({ ...defaultProps, onSuccess }),
    );
    await act(() => result.current.handleSaveAndUse());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // ─── Flujo invitado ─────────────────────────────────────────────────────────
  describe("flujo invitado (isGuest: true)", () => {
    it("llama a onSuccess con la dirección temporal sin tocar la BD", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useShippingAddressForm({ ...defaultProps, isGuest: true, onSuccess }),
      );
      await act(() => result.current.handleSaveAndUse());
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ id: "guest-temp-id", userId: "guest" }),
      );
      expect(mockUpsertAddressAction).not.toHaveBeenCalled();
    });

    it("la dirección de invitado tiene los datos del formulario", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useShippingAddressForm({ ...defaultProps, isGuest: true, onSuccess }),
      );
      await act(() => result.current.handleSaveAndUse());
      const saved = onSuccess.mock.calls[0][0];
      expect(saved.firstName).toBe("Lucas");
      expect(saved.street).toBe("Calle Mayor 1");
      expect(saved.city).toBe("Madrid");
    });
  });

  // ─── Flujo usuario registrado ───────────────────────────────────────────────
  describe("flujo usuario registrado (isGuest: false)", () => {
    it("llama a upsertAddress con los datos del formulario", async () => {
      mockUpsertAddressAction.mockResolvedValue(mockSavedAddress);
      const { result } = renderHook(() => useShippingAddressForm(defaultProps));
      await act(() => result.current.handleSaveAndUse());
      expect(mockUpsertAddressAction).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Lucas",
          street: "Calle Mayor 1",
        }),
      );
    });

    it("llama a onSuccess con la dirección devuelta por la API", async () => {
      mockUpsertAddressAction.mockResolvedValue(mockSavedAddress);
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useShippingAddressForm({ ...defaultProps, onSuccess }),
      );
      await act(() => result.current.handleSaveAndUse());
      expect(onSuccess).toHaveBeenCalledWith(mockSavedAddress);
    });

    it("no llama a onSuccess si upsertAddress lanza un error", async () => {
      mockUpsertAddressAction.mockRejectedValue(new Error("Error al guardar"));
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useShippingAddressForm({ ...defaultProps, onSuccess }),
      );
      await act(() => result.current.handleSaveAndUse());
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("pasa el id de initialData si se está editando una dirección existente", async () => {
      mockUpsertAddressAction.mockResolvedValue(mockSavedAddress);
      const { result } = renderHook(() =>
        useShippingAddressForm({
          ...defaultProps,
          initialData: mockSavedAddress,
        }),
      );
      await act(() => result.current.handleSaveAndUse());
      expect(mockUpsertAddressAction).toHaveBeenCalledWith(
        expect.objectContaining({ id: "addr-1" }),
      );
    });

    it("no pasa id si se está creando una nueva dirección", async () => {
      mockUpsertAddressAction.mockResolvedValue(mockSavedAddress);
      const { result } = renderHook(() =>
        useShippingAddressForm({ ...defaultProps, initialData: null }),
      );
      await act(() => result.current.handleSaveAndUse());
      expect(mockUpsertAddressAction).toHaveBeenCalledWith(
        expect.objectContaining({ id: undefined }),
      );
    });
  });
});
