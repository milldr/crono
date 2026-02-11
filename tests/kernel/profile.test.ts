import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureProfile, isFirstRun } from "../../src/kernel/profile.js";

// Minimal mock that matches the shape our functions expect
function createMockKernel(
  overrides: {
    retrieve?: () => Promise<unknown>;
    create?: () => Promise<unknown>;
  } = {}
) {
  return {
    profiles: {
      retrieve:
        overrides.retrieve ??
        vi.fn().mockResolvedValue({ id: "1", name: "crono" }),
      create:
        overrides.create ??
        vi.fn().mockResolvedValue({ id: "1", name: "crono" }),
      list: vi.fn(),
      delete: vi.fn(),
      download: vi.fn(),
    },
    browsers: {
      create: vi.fn(),
      deleteByID: vi.fn(),
      playwright: { execute: vi.fn() },
    },
  };
}

function makeError(status: number, message: string): Error {
  const err = new Error(message);
  (err as Error & { status: number }).status = status;
  return err;
}

describe("isFirstRun", () => {
  it("should return false when profile exists", async () => {
    const kernel = createMockKernel({
      retrieve: vi.fn().mockResolvedValue({ id: "1", name: "crono" }),
    });

    const result = await isFirstRun(kernel as never);
    expect(result).toBe(false);
    expect(kernel.profiles.retrieve).toHaveBeenCalledWith("crono");
  });

  it("should return true when profile does not exist (404)", async () => {
    const kernel = createMockKernel({
      retrieve: vi.fn().mockRejectedValue(makeError(404, "Not found")),
    });

    const result = await isFirstRun(kernel as never);
    expect(result).toBe(true);
  });

  it("should rethrow non-404 errors", async () => {
    const kernel = createMockKernel({
      retrieve: vi.fn().mockRejectedValue(makeError(500, "Server error")),
    });

    await expect(isFirstRun(kernel as never)).rejects.toThrow("Server error");
  });
});

describe("ensureProfile", () => {
  it("should create a profile named 'crono'", async () => {
    const kernel = createMockKernel({
      create: vi.fn().mockResolvedValue({ id: "1", name: "crono" }),
    });

    await ensureProfile(kernel as never);
    expect(kernel.profiles.create).toHaveBeenCalledWith({ name: "crono" });
  });

  it("should handle 409 Conflict (profile already exists)", async () => {
    const kernel = createMockKernel({
      create: vi.fn().mockRejectedValue(makeError(409, "Conflict")),
    });

    // Should not throw
    await ensureProfile(kernel as never);
    expect(kernel.profiles.create).toHaveBeenCalled();
  });

  it("should rethrow non-409 errors", async () => {
    const kernel = createMockKernel({
      create: vi.fn().mockRejectedValue(makeError(500, "Server error")),
    });

    await expect(ensureProfile(kernel as never)).rejects.toThrow(
      "Server error"
    );
  });
});
