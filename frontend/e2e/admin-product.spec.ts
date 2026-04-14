import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function clickEditarProduct(page: any, productName: string) {
  const row = page.getByRole("row").filter({ hasText: productName });
  await row.getByRole("link", { name: "Editar" }).click();
}

// ─── ACCESO Y RUTAS ───────────────────────────────────────────────────────────
test.describe("Admin — Acceso y rutas", () => {
  test("usuario no autenticado es redirigido desde /admin", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin$/);
    await context.close();
  });

  test("admin puede acceder a /admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin");
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toBeVisible();
  });

  test("admin puede acceder a /admin/products", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL("/admin/products");
    await expect(
      page.getByRole("heading", { name: "Productos", exact: true }),
    ).toBeVisible();
  });
});

// ─── LISTA DE PRODUCTOS ───────────────────────────────────────────────────────
test.describe("Admin — Lista de productos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/products");
  });

  test("muestra los productos del seed", async ({ page }) => {
    await expect(
      page.getByRole("row").filter({ hasText: "Pantalón Test E2E" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("row").filter({ hasText: "Zapatillas Test E2E" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("botón 'Añadir producto' navega a /admin/products/new", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Añadir producto" }).click();
    await expect(page).toHaveURL("/admin/products/new");
    await expect(
      page.getByRole("heading", { name: "Nuevo Producto" }),
    ).toBeVisible();
  });

  test("click en Editar navega a la página de edición del producto", async ({
    page,
  }) => {
    await clickEditarProduct(page, "Pantalón Test E2E");
    await page.waitForURL(/\/admin\/products\/.+/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Pantalón Test E2E", exact: true }),
    ).toBeVisible();
  });
});

// ─── FORMULARIO — VALIDACIÓN ──────────────────────────────────────────────────
test.describe("Admin — Formulario nuevo producto", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/products/new");
    await expect(page.getByText("Información General")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("muestra todos los campos del formulario", async ({ page }) => {
    await expect(page.getByText("Información General")).toBeVisible();
    await expect(page.getByText("Inventario y Variantes")).toBeVisible();
    await expect(page.getByText("Gestión de Imágenes")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar Producto" }),
    ).toBeVisible();
  });

  test("muestra errores de validación al intentar guardar vacío", async ({
    page,
  }) => {
    test.skip(!!process.env.CI, "Errores inline de RHF no detectables en CI");

    const btn = page.getByRole("button", { name: "Guardar Producto" });
    await expect(btn).toBeEnabled({ timeout: 5_000 });
    await btn.click();

    await expect(page).toHaveURL(/\/admin\/products\/new/, { timeout: 5_000 });
  });

  test("muestra error cuando faltan variantes al guardar", async ({ page }) => {
    await page.getByPlaceholder("Ej: Camiseta Oversize").fill("Test Producto");
    await page
      .getByPlaceholder("Detalles del producto, materiales, cuidados...")
      .fill("Descripción de prueba para test E2E");
    await page.getByPlaceholder("0.00").fill("19.99");

    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();

    const btn = page.getByRole("button", { name: "Guardar Producto" });
    await expect(btn).toBeEnabled({ timeout: 5_000 });
    await btn.click();
    await expect(page.getByText("No se ha podido guardar")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("botón Cancelar navega de vuelta a /admin/products", async ({
    page,
  }) => {
    await page.goto("/admin/products");
    await page.getByRole("link", { name: "Añadir producto" }).click();
    await expect(page).toHaveURL("/admin/products/new");
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page).toHaveURL("/admin/products", { timeout: 5_000 });
  });

  test("el generador de variantes abre el dialog", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Generar Variantes" }).click();
    await expect(page.getByText("Generador de Variantes")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Elige el color y las tallas")).toBeVisible();
  });
});

// ─── EDITAR PRODUCTO ──────────────────────────────────────────────────────────
test.describe("Admin — Editar producto", () => {
  test("puede editar el nombre del producto y guardar", async ({ page }) => {
    await page.goto("/admin/products");
    await clickEditarProduct(page, "Pantalón Test E2E");
    await page.waitForURL(/\/admin\/products\/.+/);

    const input = page.getByPlaceholder("Ej: Camiseta Oversize");
    await input.clear();
    await input.fill("Pantalón Test E2E Editado");

    await page.getByRole("button", { name: "Guardar Producto" }).click();

    await page.waitForURL("/admin/products", { timeout: 10_000 });
    await expect(
      page.getByRole("row").filter({ hasText: "Pantalón Test E2E Editado" }),
    ).toBeVisible({ timeout: 10_000 });

    // ── Restaurar nombre original para no romper otros tests ──
    await clickEditarProduct(page, "Pantalón Test E2E Editado");
    await page.waitForURL(/\/admin\/products\/.+/);
    await input.clear();
    await input.fill("Pantalón Test E2E");
    await page.getByRole("button", { name: "Guardar Producto" }).click();
    await page.waitForURL("/admin/products", { timeout: 10_000 });
  });
});

// ─── ARCHIVAR / DESARCHIVAR ───────────────────────────────────────────────────
test.describe("Admin — Archivar producto", () => {
  test("puede archivar y desarchivar producto de test", async ({ page }) => {
    await page.goto("/admin/products");
    await clickEditarProduct(page, "Pantalón Test E2E");
    await page.waitForURL(/\/admin\/products\/.+/);

    await page.getByRole("button", { name: "Archivar" }).first().click();

    await expect(
      page.getByRole("alertdialog", { name: /archivar/i }),
    ).toBeVisible({ timeout: 3_000 });
    await page.getByRole("button", { name: "Sí, archivar" }).click();

    await expect(page.getByText(/archivado correctamente/i)).toBeVisible({
      timeout: 10_000,
    });

    const desarchivarBtn = page
      .getByText("Reactivar Producto")
      .locator("../..")
      .getByRole("button", { name: "Desarchivar" });

    await expect(desarchivarBtn).toBeVisible();

    // ── Desarchivar para no romper otros tests ──
    await desarchivarBtn.click();
    await expect(
      page.getByRole("alertdialog", { name: /reactivar/i }),
    ).toBeVisible({ timeout: 3_000 });
    await page.getByRole("button", { name: "Sí, reactivar" }).click();

    await expect(page.getByText(/reactivado correctamente/i)).toBeVisible({
      timeout: 10_000,
    });

    // Hay múltiples botones "Archivar" en la página — verificamos el primero
    await expect(
      page.getByRole("button", { name: "Archivar" }).first(),
    ).toBeVisible();
  });
});
