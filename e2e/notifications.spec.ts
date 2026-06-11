import { expect, test } from "@playwright/test";

test("redireciona notificacoes para login sem autenticacao", async ({ page }) => {
  await page.goto("/notifications");
  await expect(page).toHaveURL(/\/login/);
});

test("redireciona auditoria para login sem autenticacao", async ({ page }) => {
  await page.goto("/audit");
  await expect(page).toHaveURL(/\/login/);
});
