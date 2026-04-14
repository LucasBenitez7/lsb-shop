import { test, expect } from "@playwright/test";

// ─── LISTA DE PEDIDOS ─────────────────────────────────────────────────────────
test.describe("Admin — Lista de pedidos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/orders");
    await page.waitForLoadState("networkidle");
  });

  test("muestra la página de pedidos con cabecera y tabs de navegación", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Pedidos", exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    // Tabs de navegación rápida
    await expect(page.getByRole("link", { name: "Todos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "En Proceso" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Devoluciones/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Cancelados" })).toBeVisible();
  });

  test("el tab 'En Proceso' filtra pedidos activos y muestra el pedido de test", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "En Proceso" }).click();
    await page.waitForURL(/status=ACTIVE/, { timeout: 5_000 });

    // El seed crea un pedido PAID+UNFULFILLED con apellido "Fulfillment"
    await expect(
      page.getByRole("row").filter({ hasText: "Fulfillment" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("el buscador no devuelve resultados con un email inexistente", async ({
    page,
  }) => {
    const input = page.getByPlaceholder("Buscar por ID o email...");
    await input.fill("no-existe-jamas@e2e.test");
    // El SearchInput busca al pulsar Enter o el botón lupa (no tiene debounce)
    await input.press("Enter");

    // Esperar a que la URL incluya el parámetro query y la tabla se re-renderice
    await page.waitForURL(/query=no-existe/, { timeout: 10_000 });

    await expect(page.getByText("No se encontraron pedidos")).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ─── CICLO LOGÍSTICO ──────────────────────────────────────────────────────────
test.describe("Admin — Ciclo logístico completo", () => {
  test("mueve un pedido por el ciclo UNFULFILLED → PREPARING → SHIPPED → DELIVERED", async ({
    page,
  }) => {
    await page.goto("/admin/orders");
    await page.waitForLoadState("networkidle");

    // Localizar el pedido de test de ciclo logístico
    const row = page.getByRole("row").filter({ hasText: "Fulfillment" });
    await expect(row).toBeVisible({ timeout: 10_000 });

    // Navegar al detalle del pedido
    await row.getByRole("link", { name: "Ver detalles" }).click();
    await page.waitForURL(/\/admin\/orders\/.+/, { timeout: 10_000 });

    // ── Paso 1: UNFULFILLED → PREPARING ──────────────────────────────────────
    await expect(
      page.getByRole("button", { name: "Preparar Pedido" }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: "Preparar Pedido" }).click();

    // Los toasts de sonner se apilan — usar .first() para evitar strict mode violation
    await expect(
      page.getByText("Estado logístico actualizado").first(),
    ).toBeVisible({ timeout: 10_000 });

    // ── Paso 2: PREPARING → SHIPPED ───────────────────────────────────────────
    await expect(
      page.getByRole("button", { name: "Marcar como Enviado" }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: "Marcar como Enviado" }).click();

    await expect(
      page.getByText("Estado logístico actualizado").first(),
    ).toBeVisible({ timeout: 10_000 });

    // ── Paso 3: SHIPPED → DELIVERED ───────────────────────────────────────────
    await expect(
      page.getByRole("button", { name: "Confirmar Entrega" }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: "Confirmar Entrega" }).click();

    await expect(
      page.getByText("Estado logístico actualizado").first(),
    ).toBeVisible({ timeout: 10_000 });

    // ── Estado final: DELIVERED ───────────────────────────────────────────────
    // Cuando el pedido está entregado, la página muestra "Entregado el [fecha]"
    await expect(page.getByText(/Entregado el/)).toBeVisible({
      timeout: 5_000,
    });

    // Ya no debe haber ningún botón de avance de estado logístico
    await expect(
      page.getByRole("button", { name: "Preparar Pedido" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Marcar como Enviado" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar Entrega" }),
    ).not.toBeVisible();
  });
});

// ─── NAVEGACIÓN DESDE LISTA ───────────────────────────────────────────────────
test.describe("Admin — Navegación al detalle de pedido", () => {
  test("click en 'Ver detalles' navega correctamente al detalle del pedido", async ({
    page,
  }) => {
    await page.goto("/admin/orders");
    await page.waitForLoadState("networkidle");

    // Tomar el primer pedido de la tabla y navegar a su detalle
    const firstRow = page.getByRole("row").nth(1); // nth(0) es el <thead>
    await firstRow.getByRole("link", { name: "Ver detalles" }).click();

    await page.waitForURL(/\/admin\/orders\/.+/, { timeout: 10_000 });

    // La página de detalle siempre tiene el botón de "Historial / Incidencias"
    await expect(page.getByRole("link", { name: /Historial/i })).toBeVisible({
      timeout: 5_000,
    });
  });
});
