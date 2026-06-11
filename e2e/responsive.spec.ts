import { expect, test } from "@playwright/test";

test("login permanece utilizavel em viewport estreita", async ({ page }) => {
  await page.goto("/login");

  const heading = page.getByRole("heading", { name: /entrar no oopa/i });
  await expect(heading).toBeVisible();

  const submit = page.getByRole("button", { name: /entrar/i });
  await expect(submit).toBeVisible();
  const box = await submit.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test("rotas protegidas redirecionam para login", async ({ page }) => {
  await page.goto("/dogs");
  await expect(page).toHaveURL(/\/login/);
});

test("pagina de auditoria exige autenticacao", async ({ page }) => {
  await page.goto("/audit");
  await expect(page).toHaveURL(/\/login/);
});
