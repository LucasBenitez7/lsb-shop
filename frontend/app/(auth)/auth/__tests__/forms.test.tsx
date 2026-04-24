import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { APIError } from "@/lib/api/client";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

const { mockLogin, mockRegister, mockUpdateMe, mockRefreshAuth } = vi.hoisted(
  () => ({
    mockLogin: vi.fn(),
    mockRegister: vi.fn(),
    mockUpdateMe: vi.fn(),
    mockRefreshAuth: vi.fn(),
  }),
);

vi.mock("@/lib/api/auth", () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  register: (...args: unknown[]) => mockRegister(...args),
  updateMe: (...args: unknown[]) => mockUpdateMe(...args),
}));

vi.mock("@/features/auth/components/AuthProvider", () => ({
  useAuth: () => ({
    user: null,
    status: "unauthenticated" as const,
    refresh: mockRefreshAuth,
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui", () => ({
  Button: ({
    children,
    type,
    disabled,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    type?: "button" | "submit";
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type={type} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Input: ({
    id,
    name,
    type,
    ...props
  }: {
    id?: string;
    name?: string;
    type?: string;
  }) => <input id={id} name={name} type={type ?? "text"} {...props} />,
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  PasswordInput: ({
    id,
    name,
    ...props
  }: {
    id?: string;
    name?: string;
  }) => <input id={id} name={name} type="password" {...props} />,
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockLogin.mockResolvedValue({ user: { id: 1, email: "user@test.com" } });
  mockRegister.mockResolvedValue({ detail: "ok" });
  mockUpdateMe.mockResolvedValue({});
  mockRefreshAuth.mockResolvedValue(undefined);

  vi.mocked(useRouter).mockReturnValue({
    push: mockPush,
    replace: vi.fn(),
    refresh: mockRefresh,
    back: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  } as ReturnType<typeof useRouter>);

  vi.mocked(useSearchParams).mockReturnValue({
    get: vi.fn(() => null),
  } as unknown as ReturnType<typeof useSearchParams>);
});

// ─── LoginForm ────────────────────────────────────────────────────────────────
describe("LoginForm", () => {
  it("renderiza los campos de email y contraseña", () => {
    render(<LoginForm redirectTo="/" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
  });

  it("muestra mensaje de éxito cuando ?success=registered", () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => (key === "success" ? "registered" : null)),
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<LoginForm redirectTo="/" />);
    expect(
      screen.getByText("Cuenta creada correctamente. Inicia sesión."),
    ).toBeInTheDocument();
  });

  it("muestra error de validación si se envía el email vacío", async () => {
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/" />);

    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => {
      expect(screen.queryAllByText(/./)).toBeDefined();
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  it("llama a login con las credenciales introducidas", async () => {
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/" />);

    await user.type(screen.getByLabelText("Email"), "user@test.com");
    await user.type(screen.getByLabelText("Contraseña"), "Password1");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "Password1",
      });
    });
  });

  it("muestra error si login devuelve 401", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new APIError("Unauthorized", 401));

    render(<LoginForm redirectTo="/" />);

    await user.type(screen.getByLabelText("Email"), "user@test.com");
    await user.type(screen.getByLabelText("Contraseña"), "WrongPass1");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Email o contraseña no coinciden\./),
      ).toBeInTheDocument();
    });
  });

  it("muestra el mismo mensaje amigable si login devuelve 400 (credenciales django-rest)", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(
      new APIError(
        "No puede iniciar sesión con las credenciales proporcionadas.",
        400,
      ),
    );

    render(<LoginForm redirectTo="/" />);

    await user.type(screen.getByLabelText("Email"), "nadie@test.com");
    await user.type(screen.getByLabelText("Contraseña"), "WrongPass1");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Email o contraseña no coinciden\./),
      ).toBeInTheDocument();
    });
  });

  it("redirige tras login exitoso", async () => {
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/account" />);

    await user.type(screen.getByLabelText("Email"), "user@test.com");
    await user.type(screen.getByLabelText("Contraseña"), "Password1");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => {
      expect(mockRefreshAuth).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it("muestra botón 'Continuar como invitado' si redirectTo incluye checkout", () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => (key === "redirectTo" ? "/checkout" : null)),
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<LoginForm redirectTo="/checkout" />);
    expect(
      screen.getByRole("button", { name: "Continuar como invitado" }),
    ).toBeInTheDocument();
  });

  it("NO muestra 'Continuar como invitado' en login normal", () => {
    render(<LoginForm redirectTo="/" />);
    expect(
      screen.queryByRole("button", { name: "Continuar como invitado" }),
    ).not.toBeInTheDocument();
  });

  it("redirige a /checkout al pulsar Continuar como invitado", async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => (key === "redirectTo" ? "/checkout" : null)),
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<LoginForm redirectTo="/checkout" />);
    await user.click(
      screen.getByRole("button", { name: "Continuar como invitado" }),
    );

    expect(mockPush).toHaveBeenCalledWith("/checkout?guest=1");
  });
});

// ─── RegisterForm ─────────────────────────────────────────────────────────────
describe("RegisterForm", () => {
  async function fillForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Nombre"), "Juan");
    await user.type(screen.getByLabelText("Apellidos"), "García");
    await user.type(screen.getByLabelText("Teléfono"), "612345678");
    await user.type(screen.getByLabelText("Email"), "juan@test.com");
    await user.type(screen.getByLabelText("Contraseña"), "Password1");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Password1");
  }

  it("renderiza todos los campos del formulario", () => {
    render(<RegisterForm redirectTo="/" />);

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Apellidos")).toBeInTheDocument();
    expect(screen.getByLabelText("Teléfono")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar contraseña")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Crear cuenta" }),
    ).toBeInTheDocument();
  });

  it("no llama a register si hay errores de validación", async () => {
    const user = userEvent.setup();
    render(<RegisterForm redirectTo="/" />);

    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  it("muestra error si las contraseñas no coinciden", async () => {
    const user = userEvent.setup();
    render(<RegisterForm redirectTo="/" />);

    await user.type(screen.getByLabelText("Nombre"), "Juan");
    await user.type(screen.getByLabelText("Apellidos"), "García");
    await user.type(screen.getByLabelText("Teléfono"), "612345678");
    await user.type(screen.getByLabelText("Email"), "juan@test.com");
    await user.type(screen.getByLabelText("Contraseña"), "Password1");
    await user.type(
      screen.getByLabelText("Confirmar contraseña"),
      "OtherPass1",
    );
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(
        screen.getByText("Las contraseñas no coinciden"),
      ).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("llama a register con datos válidos", async () => {
    const user = userEvent.setup();
    render(<RegisterForm redirectTo="/" />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: "juan@test.com",
        password1: "Password1",
        password2: "Password1",
        first_name: "Juan",
        last_name: "García",
        phone: "612345678",
      });
    });
  });

  it("muestra error 'Ya existe una cuenta' cuando register devuelve email duplicado", async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(
      new APIError("Bad Request", 400, {
        email: ["user with this email already exists."],
      }),
    );

    render(<RegisterForm redirectTo="/" />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(
        screen.getByText("Ya existe una cuenta con este email."),
      ).toBeInTheDocument();
    });
  });

  it("hace auto-login tras registro exitoso", async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({
      access: "fake-access",
      refresh: "fake-refresh",
    });
    render(<RegisterForm redirectTo="/" />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "juan@test.com",
        password: "Password1",
      });
    });
  });

  it("redirige a /auth/login?success=registered si el auto-login falla", async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({
      access: "fake-access",
      refresh: "fake-refresh",
    });
    mockLogin.mockRejectedValueOnce(new APIError("Unauthorized", 401));

    render(<RegisterForm redirectTo="/" />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/auth/login?success=registered");
    });
  });

  it("redirige al redirectTo si el auto-login es exitoso", async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({
      access: "fake-access",
      refresh: "fake-refresh",
    });
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => (key === "redirectTo" ? "/account" : null)),
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<RegisterForm redirectTo="/account" />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(mockRefreshAuth).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/account");
    });
  });
});
