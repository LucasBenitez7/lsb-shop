import path from "path";

import { test, expect } from "@playwright/test";

// El seed crea este pedido con ID fijo: PAID + DELIVERED + Zapatillas Test E2E
const RETURN_ORDER_ID = "e2e-order-return";

// ─── FLUJO COMPLETO: SOLICITAR + RECHAZAR ─────────────────────────────────────
test.describe("Devoluciones — Flujo completo (usuario + admin)", () => {
  test("usuario solicita devolución y admin la rechaza (restaura estado)", async ({
    page,
    browser,
  }) => {
    // ── PARTE 1: Usuario autenticado solicita devolución ─────────────────────
    const userContext = await browser.newContext({
      storageState: path.join(__dirname, ".auth/user.json"),
    });
    const userPage = await userContext.newPage();

    // Navegar directamente al detalle del pedido con ID fijo del seed
    await userPage.goto(`/account/orders/${RETURN_ORDER_ID}`);
    await userPage.waitForLoadState("networkidle");

    // El pedido es PAID + DELIVERED → debe mostrar el botón "Solicitar Devolución"
    await expect(
      userPage.getByRole("link", { name: "Solicitar Devolución" }),
    ).toBeVisible({ timeout: 10_000 });

    await userPage.getByRole("link", { name: "Solicitar Devolución" }).click();
    await userPage.waitForURL(/\/account\/orders\/.+\/return/, {
      timeout: 10_000,
    });

    // Verificar que la página de devolución carga correctamente
    await expect(
      userPage.getByRole("heading", { name: "Solicitar devolución" }),
    ).toBeVisible();
    await expect(userPage.getByText("Zapatillas Test E2E")).toBeVisible();
    await expect(userPage.getByText("Seleccionar Productos")).toBeVisible();

    // Seleccionar el producto marcando el checkbox
    await userPage.getByRole("checkbox").first().check();

    // Seleccionar motivo de devolución
    await userPage.getByRole("combobox").click();
    await userPage.getByRole("option", { name: "Ya no lo quiero" }).click();

    // Confirmar solicitud
    await expect(
      userPage.getByRole("button", { name: "Confirmar Solicitud" }),
    ).toBeEnabled();
    await userPage.getByRole("button", { name: "Confirmar Solicitud" }).click();

    // Tras el éxito el hook hace router.push("/account/orders") → lista de pedidos
    await userPage.waitForURL("/account/orders", { timeout: 15_000 });

    await userContext.close();

    // ── PARTE 2: Admin ve la solicitud pendiente y la rechaza ─────────────────
    // `page` usa la sesión de admin (storageState de chromium-admin)
    await page.goto("/admin/orders?status=RETURNS");
    await page.waitForLoadState("networkidle");

    // El pedido del usuario "Test Return" debe aparecer en el tab de devoluciones
    const returnRow = page.getByRole("row").filter({ hasText: "Return" });
    await expect(returnRow).toBeVisible({ timeout: 10_000 });

    // Navegar al detalle del pedido
    await returnRow.getByRole("link", { name: "Ver detalles" }).click();
    await page.waitForURL(/\/admin\/orders\/.+/, { timeout: 10_000 });

    // El botón "Rechazar Devolución" aparece porque hay quantityReturnRequested > 0
    await expect(
      page.getByRole("button", { name: "Rechazar Devolución" }),
    ).toBeVisible({ timeout: 10_000 });

    // Abrir el dialog de rechazo
    await page.getByRole("button", { name: "Rechazar Devolución" }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });

    // Seleccionar motivo de rechazo
    await page.getByRole("dialog").getByRole("combobox").click();
    await page
      .getByRole("option", {
        name: "El producto está usado o sin etiquetas",
      })
      .click();

    // Confirmar rechazo
    await page.getByRole("button", { name: "Confirmar Rechazo" }).click();

    await expect(page.getByText("Devolución rechazada.")).toBeVisible({
      timeout: 10_000,
    });

    // Tras el rechazo el botón desaparece (quantityReturnRequested vuelve a 0)
    await expect(
      page.getByRole("button", { name: "Rechazar Devolución" }),
    ).not.toBeVisible({ timeout: 5_000 });
  });
});

// ─── ACCESO SIN AUTENTICACIÓN ─────────────────────────────────────────────────
test.describe("Devoluciones — Protección de rutas", () => {
  test("usuario no autenticado es redirigido desde la página de devolución", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto(`/account/orders/${RETURN_ORDER_ID}/return`);

    // Debe redirigir a login, nunca quedarse en la página de devolución
    await expect(page).not.toHaveURL(/\/account\/orders\/.+\/return/);

    await context.close();
  });
});
