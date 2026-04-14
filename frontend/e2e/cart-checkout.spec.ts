import { test, expect } from "@playwright/test";

async function setupCartAndGoToCheckout(page: any) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());

  await page.goto("/product/camiseta-test-e2e");
  await page.getByRole("button", { name: "Negro" }).click();
  await page.locator("button.w-11", { hasText: /^M$/ }).click();
  await page.getByRole("button", { name: "Añadir a la cesta" }).click();
  await page.goto("/cart");
  await page.getByRole("button", { name: "Tramitar pedido" }).click();
  await page.waitForURL("**/checkout**", { timeout: 15_000 });
}

async function fillStripeCard(page: any) {
  await expect(page.getByText("Introduce los datos de tu tarjeta")).toBeVisible(
    { timeout: 20_000 },
  );

  const stripeFrame = page.frameLocator("iframe").first();
  await stripeFrame
    .locator('[placeholder="1234 1234 1234 1234"]')
    .fill("4242424242424242");
  await stripeFrame.locator('[placeholder="MM / YY"]').fill("12 / 34");
  await stripeFrame.locator('[placeholder="CVC"]').fill("123");
}

// ─── CARRITO ──────────────────────────────────────────────────────────────────
test.describe("Carrito", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("carrito vacío muestra mensaje y botón al catálogo", async ({
    page,
  }) => {
    await page.goto("/cart");
    await expect(page.getByText("Tu cesta está vacía")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Explorar catálogo" }),
    ).toBeVisible();
  });

  test("añadir producto desde la página de detalle aparece en el carrito", async ({
    page,
  }) => {
    await page.goto("/product/camiseta-test-e2e");
    await page.getByRole("button", { name: "Negro" }).click();
    await page.locator("button.w-11", { hasText: /^M$/ }).click();
    await page.getByRole("button", { name: "Añadir a la cesta" }).click();

    await expect(page.getByText("Añadido correctamente")).toBeVisible();

    await page.goto("/cart");

    await expect(
      page.getByRole("main").getByRole("link", { name: "Camiseta Test E2E" }),
    ).toBeVisible();
    await expect(page.getByRole("main").getByText("M / Negro")).toBeVisible();
  });

  test("actualizar cantidad en el carrito", async ({ page }) => {
    await page.goto("/product/camiseta-test-e2e");
    await page.getByRole("button", { name: "Negro" }).click();
    await page.locator("button.w-11", { hasText: /^M$/ }).click();
    await page.getByRole("button", { name: "Añadir a la cesta" }).click();

    await page.goto("/cart");

    await page.getByRole("main").getByRole("button", { name: "+" }).click();
    await expect(
      page.getByRole("main").locator("span.tabular-nums", { hasText: "2" }),
    ).toBeVisible();

    await page.getByRole("main").getByRole("button", { name: "-" }).click();
    await expect(
      page.getByRole("main").locator("span.tabular-nums", { hasText: "1" }),
    ).toBeVisible();
  });

  test("eliminar producto del carrito", async ({ page }) => {
    await page.goto("/product/camiseta-test-e2e");
    await page.getByRole("button", { name: "Negro" }).click();
    await page.locator("button.w-11", { hasText: /^M$/ }).click();
    await page.getByRole("button", { name: "Añadir a la cesta" }).click();

    await page.goto("/cart");
    await expect(
      page.getByRole("main").getByRole("link", { name: "Camiseta Test E2E" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Quitar de la cesta" }).click();

    await expect(page.getByText("Tu cesta está vacía")).toBeVisible();
  });

  test("botón 'Tramitar pedido' redirige a /checkout con items en el carrito", async ({
    page,
  }) => {
    await page.goto("/product/camiseta-test-e2e");
    await page.getByRole("button", { name: "Negro" }).click();
    await page.locator("button.w-11", { hasText: /^M$/ }).click();
    await page.getByRole("button", { name: "Añadir a la cesta" }).click();

    await page.goto("/cart");
    await page.getByRole("button", { name: "Tramitar pedido" }).click();

    await page.waitForURL("**/checkout**", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/checkout/);
  });
});

// ─── CHECKOUT ─────────────────────────────────────────────────────────────────
test.describe("Checkout", () => {
  test("muestra la dirección por defecto confirmada", async ({ page }) => {
    await setupCartAndGoToCheckout(page);

    await expect(page.getByText("Dirección confirmada")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Calle Test 1")).toBeVisible();
    await expect(page.getByText("Madrid")).toBeVisible();
  });

  test("sección de pago visible con dirección ya confirmada", async ({
    page,
  }) => {
    await setupCartAndGoToCheckout(page);

    await expect(page.getByText("Dirección confirmada")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Método de pago")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("Introduce los datos de tu tarjeta"),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("flujo completo de checkout con tarjeta de test Stripe", async ({
    page,
  }) => {
    test.skip(!!process.env.CI, "Requiere Stripe CLI webhook listener");

    await setupCartAndGoToCheckout(page);

    await expect(page.getByText("Dirección confirmada")).toBeVisible({
      timeout: 10_000,
    });

    await fillStripeCard(page);

    await page.getByRole("button", { name: "Pagar ahora" }).click();

    await page.waitForURL("**/checkout/success**", { timeout: 30_000 });
    await expect(page.getByText("Pedido realizado con éxito")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("página de éxito muestra el resumen del pedido", async ({ page }) => {
    test.skip(!!process.env.CI, "Requiere Stripe CLI webhook listener");

    await setupCartAndGoToCheckout(page);

    await expect(page.getByText("Dirección confirmada")).toBeVisible({
      timeout: 10_000,
    });

    await fillStripeCard(page);

    await page.getByRole("button", { name: "Pagar ahora" }).click();
    await page.waitForURL("**/checkout/success**", { timeout: 30_000 });

    await expect(
      page.getByText(process.env.E2E_USER_EMAIL!).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("link", { name: "Ver detalles del pedido" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Volver a la tienda" }),
    ).toBeVisible();
  });
});
