import { expect, test } from "@playwright/test";

test("renderiza o shell autenticado com navegacao mobile-first", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByLabel("Navegacao inferior")).toBeVisible();
  await expect(page.getByRole("link", { name: "Identificar" })).toBeVisible();
});

test("registra rota de login", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});
