import { expect, test } from "@playwright/test";

test("renderiza a tela de login", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: /entrar no oopa/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /esqueci minha senha/i })).toBeVisible();
});

test("registra rota de reset de senha", async ({ page }) => {
  await page.goto("/reset-password");

  await expect(page.getByRole("heading", { name: /redefinir senha/i })).toBeVisible();
});
