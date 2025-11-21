import { test, expect } from "@playwright/test";

const caseTitle = `Playwright Case ${Date.now()}`;

test("upload → draft letter workflow", async ({ page }) => {
  await page.goto("/upload");

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("tests/fixtures/sample.pdf");

  await page.getByLabel(/case title/i).fill(caseTitle);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/upload") && response.status() === 201,
    ),
    page.getByRole("button", { name: /upload and extract/i }).click(),
  ]);

  await page.goto("/cases");

  const caseLink = page.getByRole("link", { name: caseTitle });
  await expect(caseLink).toBeVisible();
  await caseLink.click();

  await expect(page.getByText(caseTitle)).toBeVisible();

  await page.getByRole("button", { name: /draft letter/i }).click();
  await page.waitForURL("**/letters/new");
  await expect(
    page.getByText(new RegExp(`Generate letter for ${caseTitle}`)),
  ).toBeVisible();

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/letter") && response.status() === 200,
    ),
    page.getByRole("button", { name: /generate letter/i }).click(),
  ]);

  await expect(
    page.getByText(/AI Draft — review required/i),
  ).toBeVisible();
});

