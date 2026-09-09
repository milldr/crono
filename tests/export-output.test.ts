import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportCmd } from "../src/commands/export.js";
import { exportData } from "../src/cronometer/export.js";

vi.mock("../src/cronometer/export.js", () => ({ exportData: vi.fn() }));

describe("servings export output", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process exited");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(exportData).mockReset();
  });

  it("emits an explicit JSON array for a valid empty diary", async () => {
    vi.mocked(exportData).mockResolvedValue("Day,Group,Food Name,Amount");
    await exportCmd("servings", { date: "2026-09-09", json: true });

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("[]");
    expect(exportData).toHaveBeenCalledWith(
      "servings",
      "2026-09-09",
      "2026-09-09",
      expect.any(Function)
    );
  });

  it("emits an explicit array when a meal filter has no matches", async () => {
    vi.mocked(exportData).mockResolvedValue(
      'Day,Group,Food Name,Amount\n2026-09-09,Lunch,"Quick Add, Protein",37 g'
    );
    await exportCmd("servings", {
      date: "2026-09-09",
      json: true,
      meal: "Breakfast",
    });

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("[]");
  });

  it.each(["", "<html>Login required</html>"])(
    "fails on an invalid export instead of emitting an empty array",
    async (csv) => {
      vi.mocked(exportData).mockResolvedValue(csv);
      await expect(exportCmd("servings", { json: true })).rejects.toThrow(
        "process exited"
      );

      expect(console.log).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Invalid servings export")
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    }
  );

  it("reports a failed read on stderr with a nonzero exit status", async () => {
    vi.mocked(exportData).mockRejectedValue(new Error("Export failed: 503"));
    await expect(exportCmd("servings", { json: true })).rejects.toThrow(
      "process exited"
    );

    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("Export failed: 503");
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
