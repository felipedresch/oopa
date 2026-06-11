import { expect, test } from "@playwright/test";

test("redireciona adocao para login sem autenticacao", async ({ page }) => {
  await page.goto("/adoptions/new");
  await expect(page).toHaveURL(/\/login/);
});

test("redireciona devolucao para login sem autenticacao", async ({ page }) => {
  await page.goto("/returns/new");
  await expect(page).toHaveURL(/\/login/);
});
