import { test as setup } from "@playwright/test";
import path from "node:path";

const storagePath = path.resolve(__dirname, ".auth/user.json");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

setup("authenticate", async ({ page }) => {
  const email = process.env.QA_EMAIL;
  const password = process.env.QA_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "QA_EMAIL and QA_PASSWORD must be defined for Playwright authentication.",
    );
  }

  await page.goto(`${baseURL}/sign-in`);

  await page.getByLabel(/email/i).fill(email);
  await page.getByRole("button", { name: /continue/i }).click();

  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(`${baseURL}/dashboard`, { waitUntil: "networkidle" });

  await page.context().storageState({ path: storagePath });
});

