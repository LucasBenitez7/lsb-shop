import path from "path";

import { test as setup } from "@playwright/test";

const userAuthFile = path.join(__dirname, ".auth/user.json");
const adminAuthFile = path.join(__dirname, ".auth/admin.json");

setup("authenticate as user", async ({ page }) => {
  console.log("EMAIL:", process.env.E2E_USER_EMAIL);
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");

  await page.locator("#email").fill(process.env.E2E_USER_EMAIL ?? "");
  await page.locator("#password").fill(process.env.E2E_USER_PASSWORD ?? "");
  await page.getByRole("button", { name: /iniciar sesión/i }).click();

  await page.waitForURL("/", { timeout: 60_000 });
  await page.context().storageState({ path: userAuthFile });
});

setup("authenticate as admin", async ({ page }) => {
  console.log("EMAIL:", process.env.E2E_ADMIN_EMAIL);
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");

  await page.locator("#email").fill(process.env.E2E_ADMIN_EMAIL ?? "");
  await page.locator("#password").fill(process.env.E2E_ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: /iniciar sesión/i }).click();

  await page.waitForURL("/", { timeout: 60_000 });
  await page.goto("/admin");
  await page.waitForURL("**/admin", { timeout: 15_000 });
  await page.context().storageState({ path: adminAuthFile });
});
