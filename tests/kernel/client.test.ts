import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the @onkernel/sdk module so we can inspect constructor options.
vi.mock("@onkernel/sdk", () => {
  const ctor = vi.fn().mockImplementation(() => ({
    browsers: {
      create: vi.fn(),
      playwright: { execute: vi.fn() },
      deleteByID: vi.fn(),
    },
  }));
  return { default: ctor, __ctor: ctor };
});

async function getCtor() {
  const mod = await import("@onkernel/sdk");
  return (mod as unknown as { __ctor: ReturnType<typeof vi.fn> }).__ctor;
}

describe("getKernelClient", () => {
  beforeEach(async () => {
    (await getCtor()).mockClear();
    process.env["KERNEL_API_KEY"] = "test-key";
  });

  it("should give the SDK a client timeout longer than the slowest automation", async () => {
    const { getKernelClient } = await import("../../src/kernel/client.js");
    await getKernelClient();

    const ctor = await getCtor();
    expect(ctor).toHaveBeenCalledTimes(1);

    const opts = ctor.mock.calls[0]?.[0] as { timeout?: number } | undefined;
    // The SDK default is 60s, but addCustomFood dispatches with timeout_sec 120.
    // A client that gives up first lets the browser commit the change while
    // crono reports failure, so retries silently duplicate data.
    expect(opts?.timeout).toBeDefined();
    expect(opts?.timeout).toBeGreaterThan(120_000);
  });
});
