import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useShippingSection } from "@/features/checkout/hooks/use-shipping-section";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockSetValue = vi.fn();
const mockWatch = vi.fn();
const mockResetField = vi.fn();
const mockClearErrors = vi.fn();
const mockSaveGuestAddress = vi.fn();
const mockLoadGuestAddress = vi.fn();

vi.mock("react-hook-form", () => ({
  useFormContext: vi.fn(() => ({
    setValue: mockSetValue,
    watch: mockWatch,
    resetField: mockResetField,
    clearErrors: mockClearErrors,
  })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/checkout/guest-address-storage", () => ({
  loadGuestAddress: () => mockLoadGuestAddress(),
  saveGuestAddress: (...args: unknown[]) => mockSaveGuestAddress(...args),
  clearGuestAddress: vi.fn(),
}));

// ─── Fixtures ──────────────────────────────────────────────────────────────────
const makeSavedAddress = (overrides = {}) =>
  ({
    id: "addr-1",
    userId: "user-1",
    firstName: "Lucas",
    lastName: "García",
    phone: "600000000",
    street: "Calle Mayor 1",
    details: null,
    postalCode: "28001",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    isDefault: false,
    name: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as any;

const guestAddress = makeSavedAddress({ id: "guest-temp-id", userId: "guest" });

const defaultHookArgs = () => ({
  savedAddresses: [makeSavedAddress()],
  selectedAddressId: "",
  setSelectedAddressId: vi.fn(),
  isAddressConfirmed: false,
  onConfirmAddress: vi.fn(),
  onChangeAddress: vi.fn(),
  isGuest: false,
});

// ─── useShippingSection ───────────────────────────────────────────────────────
describe("useShippingSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWatch.mockReturnValue("home");
    mockLoadGuestAddress.mockReturnValue(null);
  });

  it("isFormOpen empieza en false", () => {
    const args = defaultHookArgs();
    const { result } = renderHook(() =>
      useShippingSection(
        args.savedAddresses,
        args.selectedAddressId,
        args.setSelectedAddressId,
        args.isAddressConfirmed,
        args.onConfirmAddress,
        args.onChangeAddress,
        args.isGuest,
      ),
    );
    expect(result.current.isFormOpen).toBe(false);
  });

  it("handleAddNewClick abre el formulario sin dirección a editar", () => {
    const args = defaultHookArgs();
    const { result } = renderHook(() =>
      useShippingSection(
        args.savedAddresses,
        args.selectedAddressId,
        args.setSelectedAddressId,
        args.isAddressConfirmed,
        args.onConfirmAddress,
        args.onChangeAddress,
        args.isGuest,
      ),
    );
    act(() => result.current.handleAddNewClick());
    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.addressToEdit).toBeNull();
  });

  it("handleEditClick abre el formulario con la dirección correcta", () => {
    const args = defaultHookArgs();
    const addr = makeSavedAddress();
    const { result } = renderHook(() =>
      useShippingSection(
        args.savedAddresses,
        args.selectedAddressId,
        args.setSelectedAddressId,
        args.isAddressConfirmed,
        args.onConfirmAddress,
        args.onChangeAddress,
        args.isGuest,
      ),
    );
    const fakeEvent = { stopPropagation: vi.fn() } as any;
    act(() => result.current.handleEditClick(fakeEvent, addr));
    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.addressToEdit).toEqual(addr);
    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
  });

  it("handleCancelForm cierra el formulario y resetea addressToEdit", () => {
    const args = defaultHookArgs();
    const { result } = renderHook(() =>
      useShippingSection(
        args.savedAddresses,
        args.selectedAddressId,
        args.setSelectedAddressId,
        args.isAddressConfirmed,
        args.onConfirmAddress,
        args.onChangeAddress,
        args.isGuest,
      ),
    );
    act(() => result.current.handleAddNewClick());
    act(() => result.current.handleCancelForm());
    expect(result.current.isFormOpen).toBe(false);
    expect(result.current.addressToEdit).toBeNull();
  });

  it("handleSelectMethod actualiza shippingType y cierra la selección", () => {
    mockWatch.mockReturnValue(null);
    const args = defaultHookArgs();
    const { result } = renderHook(() =>
      useShippingSection(
        args.savedAddresses,
        args.selectedAddressId,
        args.setSelectedAddressId,
        args.isAddressConfirmed,
        args.onConfirmAddress,
        args.onChangeAddress,
        args.isGuest,
      ),
    );
    act(() => result.current.handleSelectMethod("home"));
    expect(mockSetValue).toHaveBeenCalledWith("shippingType", "home");
    expect(mockClearErrors).toHaveBeenCalled();
    expect(args.onChangeAddress).toHaveBeenCalled();
  });

  it("handleSelectAddress actualiza la selección si la dirección no está confirmada", () => {
    const setSelectedAddressId = vi.fn();
    const args = { ...defaultHookArgs(), setSelectedAddressId };
    const { result } = renderHook(() =>
      useShippingSection(
        args.savedAddresses,
        args.selectedAddressId,
        setSelectedAddressId,
        false,
        args.onConfirmAddress,
        args.onChangeAddress,
        args.isGuest,
      ),
    );
    act(() => result.current.handleSelectAddress("addr-1"));
    expect(setSelectedAddressId).toHaveBeenCalledWith("addr-1");
  });

  it("handleSelectAddress no actualiza si la dirección ya está confirmada", () => {
    const setSelectedAddressId = vi.fn();
    const args = defaultHookArgs();
    const { result } = renderHook(() =>
      useShippingSection(
        args.savedAddresses,
        args.selectedAddressId,
        setSelectedAddressId,
        true,
        args.onConfirmAddress,
        args.onChangeAddress,
        args.isGuest,
      ),
    );
    act(() => result.current.handleSelectAddress("addr-1"));
    expect(setSelectedAddressId).not.toHaveBeenCalled();
  });

  it("handleFormSuccess cierra el formulario y llama a onConfirmAddress", () => {
    const onConfirmAddress = vi.fn();
    const setSelectedAddressId = vi.fn();
    const args = defaultHookArgs();
    const { result } = renderHook(() =>
      useShippingSection(
        args.savedAddresses,
        args.selectedAddressId,
        setSelectedAddressId,
        args.isAddressConfirmed,
        onConfirmAddress,
        args.onChangeAddress,
        args.isGuest,
      ),
    );
    act(() => result.current.handleFormSuccess(makeSavedAddress()));
    expect(result.current.isFormOpen).toBe(false);
    expect(onConfirmAddress).toHaveBeenCalled();
    expect(setSelectedAddressId).toHaveBeenCalledWith("addr-1");
  });

  it("handleFormSuccess guarda en sessionStorage si es dirección de invitado", () => {
    const args = defaultHookArgs();
    const { result } = renderHook(() =>
      useShippingSection(
        args.savedAddresses,
        args.selectedAddressId,
        args.setSelectedAddressId,
        args.isAddressConfirmed,
        args.onConfirmAddress,
        args.onChangeAddress,
        args.isGuest,
      ),
    );
    act(() => result.current.handleFormSuccess(guestAddress));
    expect(mockSaveGuestAddress).toHaveBeenCalledWith(guestAddress);
  });

  it("restaura la dirección de invitado desde storage al montar si isGuest es true", () => {
    mockLoadGuestAddress.mockReturnValue(guestAddress);
    const onConfirmAddress = vi.fn();
    const setSelectedAddressId = vi.fn();
    const args = defaultHookArgs();
    renderHook(() =>
      useShippingSection(
        args.savedAddresses,
        args.selectedAddressId,
        setSelectedAddressId,
        args.isAddressConfirmed,
        onConfirmAddress,
        args.onChangeAddress,
        true,
      ),
    );
    expect(setSelectedAddressId).toHaveBeenCalledWith("guest-temp-id");
    expect(mockSetValue).toHaveBeenCalledWith("street", guestAddress.street);
    expect(onConfirmAddress).toHaveBeenCalled();
  });

  it("no restaura dirección de invitado si isGuest es false", () => {
    mockLoadGuestAddress.mockReturnValue(guestAddress);
    const onConfirmAddress = vi.fn();
    const args = defaultHookArgs();
    renderHook(() =>
      useShippingSection(
        args.savedAddresses,
        args.selectedAddressId,
        args.setSelectedAddressId,
        args.isAddressConfirmed,
        onConfirmAddress,
        args.onChangeAddress,
        false,
      ),
    );
    expect(onConfirmAddress).not.toHaveBeenCalled();
  });
});
