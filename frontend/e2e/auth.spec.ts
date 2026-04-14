import { test, expect } from "@playwright/test";

// ─── LOGIN ────────────────────────────────────────────────────────────────────
test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
  });

  test("muestra el formulario de login correctamente", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
  });

  test("muestra error con credenciales incorrectas", async ({ page }) => {
    await page.locator("#email").fill("noexiste@test.com");
    await page.locator("#password").fill("WrongPass123!");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(
      page.getByText("Email o contraseña incorrectos."),
    ).toBeVisible();
  });

  test("usuario normal inicia sesión y redirige a /", async ({ page }) => {
    await page.locator("#email").fill(process.env.E2E_USER_EMAIL!);
    await page.locator("#password").fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
  });

  test("admin inicia sesión y puede acceder a /admin", async ({ page }) => {
    await page.locator("#email").fill(process.env.E2E_ADMIN_EMAIL!);
    await page.locator("#password").fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await page.waitForURL("/");
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin");
    // Verifica que no redirige a login (el admin tiene acceso)
    await expect(page).not.toHaveURL("/auth/login");
  });

  test("redirige a la URL del parámetro redirectTo tras login", async ({
    page,
  }) => {
    await page.goto("/auth/login?redirectTo=/account/orders");
    await page.locator("#email").fill(process.env.E2E_USER_EMAIL!);
    await page.locator("#password").fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await page.waitForURL("/account/orders");
    await expect(page).toHaveURL("/account/orders");
  });

  test("usuario ya autenticado es redirigido desde /auth/login", async ({
    page,
  }) => {
    // Login primero
    await page.locator("#email").fill(process.env.E2E_USER_EMAIL!);
    await page.locator("#password").fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL("/");

    // Intenta volver a login
    await page.goto("/auth/login");
    await expect(page).not.toHaveURL("/auth/login");
  });

  test("link 'Crear cuenta' navega a /auth/register", async ({ page }) => {
    await page.getByRole("link", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test("link de contraseña olvidada navega a /forgot-password", async ({
    page,
  }) => {
    await page
      .getByRole("link", { name: "¿Has olvidado tu contraseña?" })
      .click();
    await expect(page).toHaveURL("/forgot-password");
  });
});

// ─── REGISTRO ─────────────────────────────────────────────────────────────────
test.describe("Registro", () => {
  // Email único por ejecución para evitar conflictos
  const uniqueEmail = () => `test_${Date.now()}@playwright.com`;

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/register");
  });

  test("muestra el formulario de registro correctamente", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Crear cuenta" }),
    ).toBeVisible();
    await expect(page.locator("#firstName")).toBeVisible();
    await expect(page.locator("#lastName")).toBeVisible();
    await expect(page.locator("#phone")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Crear cuenta" }),
    ).toBeVisible();
  });

  test("muestra error si el email ya está registrado", async ({ page }) => {
    await page.locator("#firstName").fill("Test");
    await page.locator("#lastName").fill("User");
    await page.locator("#phone").fill("600000000");
    await page.locator("#email").fill(process.env.E2E_USER_EMAIL!);
    await page.locator("#password").fill("Test1234!");
    await page.locator("#confirmPassword").fill("Test1234!");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(
      page.getByText("Ya existe una cuenta con este email."),
    ).toBeVisible();
  });

  test("muestra error de validación si las contraseñas no coinciden", async ({
    page,
  }) => {
    await page.locator("#firstName").fill("Test");
    await page.locator("#lastName").fill("User");
    await page.locator("#phone").fill("600000000");
    await page.locator("#email").fill(uniqueEmail());
    await page.locator("#password").fill("Test1234!");
    await page.locator("#confirmPassword").fill("OtraPass123!");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    // El schema de Zod devuelve error en confirmPassword
    await expect(
      page.locator("#confirmPassword[aria-invalid='true']"),
    ).toBeVisible();
  });

  test("registro exitoso hace auto-login y redirige a /", async ({ page }) => {
    await page.locator("#firstName").fill("Nuevo");
    await page.locator("#lastName").fill("Usuario");
    await page.locator("#phone").fill("611222333");
    await page.locator("#email").fill(uniqueEmail());
    await page.locator("#password").fill("Test1234!");
    await page.locator("#confirmPassword").fill("Test1234!");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    // Auto-login exitoso → redirige a /
    await page.waitForURL("/", { timeout: 30_000 });
    await expect(page).toHaveURL("/");
  });

  test("link 'Iniciar sesión' navega a /auth/login", async ({ page }) => {
    await page.getByRole("link", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
