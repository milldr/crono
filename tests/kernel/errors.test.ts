import { describe, it, expect } from "vitest";
import { formatKernelError } from "../../src/kernel/errors.js";
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  RateLimitError,
  APIError,
} from "@onkernel/sdk";

describe("formatKernelError", () => {
  it("should format APIConnectionTimeoutError", () => {
    const error = new APIConnectionTimeoutError();
    const result = formatKernelError(error);
    expect(result).toContain("timed out");
    expect(result).toContain("status.kernel.sh");
  });

  it("should format APIConnectionError with cause", () => {
    const cause = new Error("getaddrinfo ENOTFOUND api.kernel.sh");
    const error = new APIConnectionError({ cause });
    const result = formatKernelError(error);
    expect(result).toContain("Could not connect to Kernel API");
    expect(result).toContain("getaddrinfo ENOTFOUND");
    expect(result).toContain("No internet connection");
  });

  it("should format APIConnectionError without cause", () => {
    const error = new APIConnectionError({});
    const result = formatKernelError(error);
    expect(result).toContain("Could not connect to Kernel API");
    expect(result).not.toContain("undefined");
  });

  it("should format AuthenticationError", () => {
    const error = new AuthenticationError(
      401,
      { message: "Invalid API key" },
      "Invalid API key",
      new Headers()
    );
    const result = formatKernelError(error);
    expect(result).toContain("authentication failed");
    expect(result).toContain("HTTP 401");
    expect(result).toContain("crono login");
  });

  it("should format RateLimitError", () => {
    const error = new RateLimitError(
      429,
      { message: "Too many requests" },
      "Too many requests",
      new Headers()
    );
    const result = formatKernelError(error);
    expect(result).toContain("rate limit");
    expect(result).toContain("HTTP 429");
    expect(result).toContain("wait");
  });

  it("should format generic APIError with status", () => {
    const error = new APIError(
      500,
      { message: "Internal server error" },
      "Internal server error",
      new Headers()
    );
    const result = formatKernelError(error);
    expect(result).toContain("HTTP 500");
  });

  it("should format plain Error", () => {
    const error = new Error("Something went wrong");
    const result = formatKernelError(error);
    expect(result).toBe("Something went wrong");
  });

  it("should format string errors", () => {
    const result = formatKernelError("raw string error");
    expect(result).toBe("raw string error");
  });
});
