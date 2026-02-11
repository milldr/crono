import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateKernelApiKey } from "../../src/commands/login.js";

// Mock the @onkernel/sdk module
vi.mock("@onkernel/sdk", () => {
  const mockList = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      profiles: { list: mockList },
    })),
    __mockList: mockList,
  };
});

// Get a handle to the mock so we can control behavior per test
async function getMockList() {
  const mod = await import("@onkernel/sdk");
  return (mod as unknown as { __mockList: ReturnType<typeof vi.fn> })
    .__mockList;
}

describe("validateKernelApiKey", () => {
  beforeEach(async () => {
    const mockList = await getMockList();
    mockList.mockReset();
    // Clean up env
    delete process.env["KERNEL_API_KEY"];
  });

  it("should succeed with a valid API key", async () => {
    const mockList = await getMockList();
    mockList.mockResolvedValue([]);

    await expect(validateKernelApiKey("valid-key")).resolves.toBeUndefined();
  });

  it("should throw with an invalid API key", async () => {
    const mockList = await getMockList();
    mockList.mockRejectedValue(new Error("Unauthorized"));

    await expect(validateKernelApiKey("bad-key")).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("should restore original KERNEL_API_KEY env var after validation", async () => {
    const mockList = await getMockList();
    mockList.mockResolvedValue([]);

    process.env["KERNEL_API_KEY"] = "original-key";
    await validateKernelApiKey("test-key");
    expect(process.env["KERNEL_API_KEY"]).toBe("original-key");
  });

  it("should remove KERNEL_API_KEY env var if it was not set", async () => {
    const mockList = await getMockList();
    mockList.mockResolvedValue([]);

    delete process.env["KERNEL_API_KEY"];
    await validateKernelApiKey("test-key");
    expect(process.env["KERNEL_API_KEY"]).toBeUndefined();
  });

  it("should restore env var even if validation throws", async () => {
    const mockList = await getMockList();
    mockList.mockRejectedValue(new Error("fail"));

    process.env["KERNEL_API_KEY"] = "original-key";
    await expect(validateKernelApiKey("bad-key")).rejects.toThrow();
    expect(process.env["KERNEL_API_KEY"]).toBe("original-key");
  });
});
