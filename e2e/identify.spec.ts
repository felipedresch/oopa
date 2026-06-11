import { expect, test } from "@playwright/test";

test("redireciona identificacao para login sem autenticacao", async ({ page }) => {
  await page.goto("/identify");
  await expect(page).toHaveURL(/\/login/);
});
