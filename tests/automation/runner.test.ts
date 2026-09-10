import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/credentials.js", () => ({
  getCredential: vi.fn((key: string) =>
    key === "cronometer-username" ? "user@example.com" : "password"
  ),
}));

import {
  createAutomationClient,
  getQuickAddTimeoutSec,
} from "../../src/automation/runner.js";
import type { AutomationRuntime } from "../../src/automation/types.js";

describe("getQuickAddTimeoutSec", () => {
  const now = new Date("2026-09-02T12:00:00");

  it("allows setup time plus one minute for a single macro", () => {
    expect(getQuickAddTimeoutSec({ protein: 45 }, now)).toBe(120);
  });

  it("scales the timeout for every macro dialog", () => {
    expect(
      getQuickAddTimeoutSec({ protein: 45, carbs: 90, fat: 55 }, now)
    ).toBe(240);
  });

  it("includes the delay for previous-day navigation", () => {
    expect(getQuickAddTimeoutSec({ fat: 55, date: "2026-08-30" }, now)).toBe(
      126
    );
  });

  it("caps date navigation at the same 90 steps as the automation", () => {
    expect(getQuickAddTimeoutSec({ protein: 1, date: "2025-01-01" }, now)).toBe(
      300
    );
  });
});

describe("quick-add automation timeouts", () => {
  it("allows login and a multi-macro write to complete independently", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        result: { success: true, loggedIn: false, url: "/login" },
      })
      .mockResolvedValueOnce({
        success: true,
        result: { success: true, loggedIn: true, url: "/#diary" },
      })
      .mockResolvedValueOnce({
        success: true,
        result: { success: true },
      });
    const close = vi.fn().mockResolvedValue(undefined);
    const runtime = { execute, close } as unknown as AutomationRuntime;
    const client = createAutomationClient(async () => runtime);

    await client.addQuickEntry({ protein: 45, carbs: 90, fat: 55 });

    expect(execute.mock.calls.map((call) => call[1])).toEqual([30, 120, 240]);
    expect(close).toHaveBeenCalledOnce();
  });
});

describe("food write automation", () => {
  it.each([
    ["create", 120],
    ["create-and-log", 300],
    ["log", 180],
  ])("budgets %s independently of login", async (operation, timeout) => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ success: true, result: { loggedIn: true } })
      .mockResolvedValueOnce({ success: true, result: { success: true } });
    const close = vi.fn();
    const client = createAutomationClient(async () => ({ execute, close }));
    if (operation === "log") {
      await client.logFood({
        name: "Gomez, Buffalo Chicken Turtle with Ranch",
        meal: "Lunch",
      });
    } else {
      await client.addCustomFood({
        name: "Test Food",
        protein: 60,
        log: operation === "create-and-log" ? "Lunch" : undefined,
      });
    }
    expect(execute.mock.calls.map((call) => call[1])).toEqual([30, timeout]);
    expect(close).toHaveBeenCalledOnce();
  });

  it.each(["create", "log"])(
    "does not replay %s after an ambiguous timeout",
    async (operation) => {
      const execute = vi
        .fn()
        .mockResolvedValueOnce({ success: true, result: { loggedIn: true } })
        .mockResolvedValueOnce({
          success: false,
          error: "The operation was aborted due to timeout",
        });
      const close = vi.fn();
      const client = createAutomationClient(async () => ({ execute, close }));
      const result =
        operation === "create"
          ? client.addCustomFood({
              name: "Test Food",
              protein: 60,
              log: "Lunch",
            })
          : client.logFood({ name: "Test Food", meal: "Lunch" });
      await expect(result).rejects.toThrow("aborted due to timeout");
      expect(execute).toHaveBeenCalledTimes(2);
      expect(close).toHaveBeenCalledOnce();
    }
  );
});
