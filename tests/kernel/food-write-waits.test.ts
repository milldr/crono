import { describe, expect, it, vi } from "vitest";
import { buildLogFoodCode } from "../../src/kernel/log-food.js";
import { buildAddCustomFoodCode } from "../../src/kernel/add-custom-food.js";

describe("generated food write waits", () => {
  it.each([
    buildLogFoodCode({ name: "Test Food", meal: "Lunch" }),
    buildAddCustomFoodCode({ name: "Test Food", protein: 60, log: "Lunch" }),
  ])("bounds actions and verifies diary dialog dismissal", (code) => {
    expect(code).toContain("filter({ visible: true })");
    expect(code).toContain("click({ timeout: 3000 })");
    expect(code).toContain("fill('', { timeout: 3000 })");
    expect(code).not.toContain(".first().click();");
    expect(code).not.toContain("'text=\"SEARCH\")'");
    expect(code).toContain("state: 'hidden'");
  });

  it("skips hidden controls and tries the next selector after a bounded action failure", async () => {
    const click = vi
      .fn()
      .mockRejectedValueOnce(new Error("disabled"))
      .mockResolvedValueOnce(undefined);
    const filter = vi.fn().mockReturnThis();
    const locator = {
      filter,
      count: vi.fn().mockResolvedValue(1),
      first: vi.fn(),
      click,
    };
    locator.first.mockReturnValue(locator);
    const page = {
      goto: vi.fn(),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      url: () => "https://cronometer.com/#diary",
      locator: vi.fn(() => locator),
    };
    const code = buildLogFoodCode({ name: "Test Food" });
    const helperEnd = code.indexOf("// Helper: right-click");
    const execute = new Function(
      "page",
      `return (async () => {
      ${code.slice(0, helperEnd)}
      return clickFirst(['button:has-text("SEARCH")', 'text="SEARCH"'], 'search');
    })()`
    );
    await expect(execute(page)).resolves.toBe(true);
    expect(filter).toHaveBeenCalledWith({ visible: true });
    expect(click).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenNthCalledWith(1, { timeout: 3000 });
    expect(click).toHaveBeenNthCalledWith(2, { timeout: 3000 });
  });
});
