import type { Page } from "@playwright/test";

export async function chooseOption(
  page: Page,
  name: string | RegExp,
  label: string,
) {
  await page.getByRole("combobox", { name }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}
