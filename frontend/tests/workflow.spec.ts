import { test, expect, type Page } from "@playwright/test";
import axe from "axe-core";

async function audit(page: Page) {
  await page.evaluate(axe.source);
  const violations = await page.evaluate(async () => {
    const result = await (
      window as unknown as { axe: typeof import("axe-core") }
    ).axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    return result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.html),
    }));
  });
  expect(violations).toEqual([]);
}
test("supplier intake, extraction, baseline, stress, counteroffer and report", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "A good deal should work for your cash flow, too.",
    }),
  ).toBeVisible();
  await audit(page);
  await page.getByRole("button", { name: "Try the supplier example" }).click();
  await expect(
    page.getByText("Fictional supplier example. All dates"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Extract & review terms" }).click();
  await expect(
    page.getByText("Local rule-based extraction, not semantic AI."),
  ).toBeVisible();
  await audit(page);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Calculate cash flow" }).click();
  await expect(page.getByText("Not satisfied", { exact: true })).toBeVisible();
  await expect(page.getByText("₹60,000.00", { exact: true })).toBeVisible();
  await audit(page);
  await page.getByRole("button", { name: "Stress tests", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "15-day payment delay", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("-₹90,000.00", { exact: true })).toBeVisible();
  await audit(page);
  await page.getByLabel("Project expense increase (%)").fill("10");
  await page.getByRole("button", { name: "Run custom stress test" }).click();
  await expect(
    page.getByRole("heading", { name: "Custom scenario", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Counteroffer Lab", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Find workable terms", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A few ways forward." }),
  ).toBeVisible();
  await expect(page.locator(".candidate > strong").first()).toHaveText(
    "30% advance",
  );
  await audit(page);
  await page.getByRole("button", { name: "Prepare decision report" }).click();
  await page
    .getByRole("button", { name: "Generate report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Start the conversation." }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Editable message · nothing is sent automatically"),
  ).toHaveValue(/INR 60,000.00/);
  await audit(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report" }).click();
  expect((await download).suggestedFilename()).toBe(
    "TermWise-Decision-Report.md",
  );
  // Financial edits must invalidate all downstream results and confirmation.
  await page
    .getByRole("button", { name: "Deal & inputs", exact: true })
    .click();
  await page.getByLabel("Opening cash (INR)", { exact: true }).fill("90000");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page
    .getByRole("button", { name: "Decision report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your timeline starts with the inputs.",
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("upload a document and recover from invalid totals", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the supplier example" }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles("../sample_data/supplier-contract.pdf");
  await expect(page.getByText("Keep the source in sight.")).toBeVisible();
  await expect(page.getByText("PAGE 1").first()).toBeVisible();
  await page.getByLabel("Payment 1 amount", { exact: true }).fill("100");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Calculate cash flow" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Contract payments must add up exactly",
  );
  await page.getByLabel("Payment 1 amount", { exact: true }).fill("200000");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Calculate cash flow" }).click();
  await expect(page.getByText("Not satisfied", { exact: true })).toBeVisible();
});
