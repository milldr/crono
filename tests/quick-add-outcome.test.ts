import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as prompts from "@clack/prompts";
import { quickAdd } from "../src/commands/quick-add.js";
import { getAutomationClient } from "../src/automation/client.js";

vi.mock("../src/automation/client.js", () => ({
  getAutomationClient: vi.fn(),
}));
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: { warn: vi.fn(), error: vi.fn() },
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), message: vi.fn() })),
}));

describe("quick-add outcome reporting", () => {
  const addQuickEntry = vi.fn();

  beforeEach(() => {
    vi.mocked(getAutomationClient).mockResolvedValue({
      addQuickEntry,
    } as unknown as Awaited<ReturnType<typeof getAutomationClient>>);
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process exited");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    addQuickEntry.mockReset();
  });

  it("does not announce completion while the original write is pending", async () => {
    let completeWrite!: () => void;
    addQuickEntry.mockReturnValue(
      new Promise<void>((resolve) => {
        completeWrite = resolve;
      })
    );

    const operation = quickAdd({ protein: 37, carbs: 58, fat: 38 });
    await vi.waitFor(() => expect(addQuickEntry).toHaveBeenCalledTimes(1));

    expect(prompts.outro).not.toHaveBeenCalled();
    expect(prompts.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("wait for this process to exit")
    );

    completeWrite();
    await operation;

    expect(prompts.outro).toHaveBeenCalledTimes(1);
    expect(addQuickEntry).toHaveBeenCalledTimes(1);
  });

  it("reports an uncertain write without automatically retrying it", async () => {
    addQuickEntry.mockRejectedValue(
      new Error("Response lost after saving protein")
    );

    await expect(quickAdd({ protein: 37, carbs: 58, fat: 38 })).rejects.toThrow(
      "process exited"
    );

    expect(addQuickEntry).toHaveBeenCalledTimes(1);
    expect(prompts.outro).not.toHaveBeenCalled();
    expect(prompts.log.error).toHaveBeenCalledWith(
      expect.stringContaining("Could not confirm completion")
    );
    expect(prompts.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Some or all macros may already be saved")
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
