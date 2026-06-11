import { expect, test } from "@playwright/test";

test("renders the technical foundation shell", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /fundacao tecnica pronta/i }),
  ).toBeVisible();
  await expect(page.getByText(/convex e uma esteira de qualidade/i)).toBeVisible();
});
