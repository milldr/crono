import { describe, expect, it, vi, afterEach } from "vitest";
import { buildQuickAddCode } from "../../src/kernel/quick-add.js";
import { buildFoodDialogCode } from "../../src/kernel/food-dialog.js";

type DialogState = "closed" | "loading" | "ready";

interface FakeDiaryOptions {
  /** Dialog states returned after each search-result selection, one list per dialog attempt. */
  attempts: DialogState[][];
  /** Existing diary entries for the searched food before the run. */
  existingEntries?: number;
  /** Whether clicking "Add to Diary" creates a new diary entry. */
  addCreatesEntry?: boolean;
  /** Diary entries added as a side effect of the dialog closing early. */
  entriesAddedOnEarlyClose?: number;
}

/**
 * Minimal fake Playwright page that drives the generated quick-add code.
 * Time only advances through page.waitForTimeout so polling loops are
 * deterministic and fast.
 */
function createFakePage(options: FakeDiaryOptions) {
  let now = 1_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);

  let entries = options.existingEntries ?? 0;
  let attempt = -1;
  let probeIndex = 0;
  const ops: string[] = [];
  const servingCounts: unknown[] = [];

  const resultRow = {
    isVisible: vi.fn().mockResolvedValue(true),
    focus: vi.fn().mockResolvedValue(undefined),
    locator: vi.fn(() => ({
      count: vi.fn().mockResolvedValue(2),
      first: () => ({
        textContent: vi.fn().mockResolvedValue("Quick Add, Fat"),
      }),
    })),
  };

  const rightClick = vi.fn();
  const genericLocator = () => {
    const loc = {
      filter: () => loc,
      first: () => loc,
      count: vi.fn().mockResolvedValue(1),
      click: vi.fn(async (opts?: { button?: string }) => {
        if (opts?.button === "right") {
          rightClick();
          attempt++;
          probeIndex = 0;
        }
      }),
      fill: vi.fn().mockResolvedValue(undefined),
    };
    return loc;
  };

  const page = {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    url: () => "https://cronometer.com/#diary",
    waitForTimeout: vi.fn(async (ms: number) => {
      now += ms;
    }),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    locator: vi.fn((sel: string) =>
      sel === "tr"
        ? { count: vi.fn().mockResolvedValue(1), nth: () => resultRow }
        : genericLocator()
    ),
    getByText: vi.fn(() => ({
      filter: () => ({
        first: () => ({ waitFor: vi.fn().mockResolvedValue(undefined) }),
      }),
    })),
    keyboard: {
      press: vi.fn().mockResolvedValue(undefined),
      type: vi.fn().mockResolvedValue(undefined),
    },
    mouse: { click: vi.fn().mockResolvedValue(undefined) },
    evaluate: vi.fn(async (_fn: unknown, arg?: Record<string, unknown>) => {
      const op = (arg?.op as string) ?? "unknown";
      ops.push(op);
      if (op === "countDiaryEntries") return entries;
      if (op === "probeAddFoodDialog") {
        const states = options.attempts[attempt] ?? ["closed"];
        const state = states[Math.min(probeIndex, states.length - 1)];
        probeIndex++;
        if (state === "closed" && probeIndex === 1) {
          entries += options.entriesAddedOnEarlyClose ?? 0;
        }
        return state;
      }
      if (op === "fillServingSize") {
        servingCounts.push(arg?.count);
        return true;
      }
      if (op === "clickAddToDiary") {
        if (options.addCreatesEntry ?? true) entries++;
        return true;
      }
      throw new Error(`unexpected evaluate op: ${op}`);
    }),
  };

  return { page, ops, servingCounts, rightClick };
}

async function runQuickAdd(page: unknown, fat = 5) {
  const code = buildQuickAddCode({ fat, meal: "Lunch" });
  const execute = new Function(
    "page",
    `return (async () => { ${code} })()`
  ) as (page: unknown) => Promise<{ success: boolean; error?: string }>;
  return execute(page);
}

describe("quick-add Add Food dialog reliability", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("waits for food details to load before entering the amount", async () => {
    const fake = createFakePage({
      attempts: [["loading", "loading", "closed", "loading", "ready"]],
    });
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(runQuickAdd(fake.page)).resolves.toEqual({ success: true });

    expect(fake.rightClick).toHaveBeenCalledTimes(1);
    const firstFill = fake.ops.indexOf("fillServingSize");
    const lastProbe = fake.ops.lastIndexOf("probeAddFoodDialog");
    expect(lastProbe).toBeLessThan(firstFill);
    expect(fake.servingCounts).toEqual([5]);
  });

  it("re-opens and re-selects the food when the dialog closes early", async () => {
    const fake = createFakePage({
      attempts: [["closed"], ["loading", "ready"]],
    });
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(runQuickAdd(fake.page)).resolves.toEqual({ success: true });

    expect(fake.rightClick).toHaveBeenCalledTimes(2);
    expect(
      fake.page.keyboard.press.mock.calls.filter(([k]) => k === "Enter")
    ).toHaveLength(2);
    expect(fake.servingCounts).toEqual([5]);
  });

  it("retries when the details never load, then reports after the last attempt", async () => {
    const fake = createFakePage({
      attempts: [["loading"], ["closed"], ["closed"]],
    });
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runQuickAdd(fake.page);

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      'Add Food dialog closed before details loaded after selecting "Quick Add, Fat"'
    );
    expect(result.error).toContain("after 3 attempts");
    expect(fake.rightClick).toHaveBeenCalledTimes(3);
    expect(fake.ops).not.toContain("fillServingSize");
    expect(fake.ops).not.toContain("clickAddToDiary");
  });

  it("does not retry (and duplicate) when an early close already changed the diary", async () => {
    const fake = createFakePage({
      attempts: [["closed"], ["ready"]],
      existingEntries: 1,
      entriesAddedOnEarlyClose: 1,
    });
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runQuickAdd(fake.page);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not retrying to avoid a duplicate");
    expect(fake.rightClick).toHaveBeenCalledTimes(1);
    expect(fake.ops).not.toContain("clickAddToDiary");
  });

  it("adds a new entry alongside an existing quick-add entry of the same macro", async () => {
    const fake = createFakePage({
      attempts: [["ready"]],
      existingEntries: 1,
    });
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(runQuickAdd(fake.page, 15)).resolves.toEqual({
      success: true,
    });
    expect(fake.servingCounts).toEqual([15]);
  });

  it("fails when adding did not create a new entry (existing entry replaced)", async () => {
    const fake = createFakePage({
      attempts: [["ready"]],
      existingEntries: 1,
      addCreatesEntry: false,
    });
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runQuickAdd(fake.page, 15);

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      'Add to Diary did not create a new "Quick Add, Fat" entry for fat'
    );
    expect(result.error).toContain("1 before, 1 after");
  });
});

describe("Add Food dialog scoping", () => {
  const code = buildFoodDialogCode({
    updateServingSize: true,
    alwaysUpdateServingSize: true,
    verifyNewEntry: true,
  });

  it("only edits the serving size input inside the Add Food dialog", () => {
    const fill = code.slice(code.indexOf("op: 'fillServingSize'") - 2500);
    expect(fill).toContain("const dialog = findAddFoodDialog();");
    expect(fill).toMatch(/createTreeWalker\(\s*dialog,/);
    expect(fill).toContain("dialog.contains(container)");
    expect(code).not.toMatch(
      /createTreeWalker\(\s*document\.body,\s*NodeFilter\.SHOW_TEXT,\s*\{\s*acceptNode: \(node\) =>\s*node\.textContent && node\.textContent\.trim\(\) === 'Serving Size'/
    );
  });

  it("only clicks the Add to Diary button inside the Add Food dialog", () => {
    expect(code).toContain("dialog.querySelectorAll('button')");
    expect(code).not.toContain("document.querySelectorAll('button')");
  });

  it("only verifies new entries when requested", () => {
    expect(code).toContain("countDiaryEntries");
    expect(buildFoodDialogCode()).not.toContain("countDiaryEntries");
  });
});
