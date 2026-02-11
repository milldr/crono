import { describe, it, expect } from "vitest";
import {
  buildAutoLoginCode,
  buildLoginCheckCode,
  buildNavigateToLoginCode,
} from "../../src/kernel/login.js";

describe("buildLoginCheckCode", () => {
  it("should navigate to /#diary", () => {
    const code = buildLoginCheckCode();
    expect(code).toContain("cronometer.com/#diary");
  });

  it("should check for login redirect", () => {
    const code = buildLoginCheckCode();
    expect(code).toContain("/login");
    expect(code).toContain("loggedIn");
  });

  it("should return a result object", () => {
    const code = buildLoginCheckCode();
    expect(code).toContain("return {");
    expect(code).toContain("success: true");
  });
});

describe("buildNavigateToLoginCode", () => {
  it("should navigate to login page", () => {
    const code = buildNavigateToLoginCode();
    expect(code).toContain("cronometer.com/login");
  });
});

describe("buildAutoLoginCode", () => {
  it("should start at cronometer.com and click login link", () => {
    const code = buildAutoLoginCode("user@test.com", "password123");
    expect(code).toContain("cronometer.com");
    expect(code).toContain("loginLinkSelectors");
  });

  it("should fill email field", () => {
    const code = buildAutoLoginCode("user@test.com", "password123");
    expect(code).toContain("user@test.com");
    expect(code).toContain("emailSelectors");
  });

  it("should fill password field", () => {
    const code = buildAutoLoginCode("user@test.com", "password123");
    expect(code).toContain("password123");
    expect(code).toContain("passSelectors");
  });

  it("should click submit button", () => {
    const code = buildAutoLoginCode("user@test.com", "password123");
    expect(code).toContain("submitSelectors");
    expect(code).toContain(".click()");
  });

  it("should verify login by checking URL", () => {
    const code = buildAutoLoginCode("user@test.com", "password123");
    expect(code).toContain("loggedIn");
    expect(code).toContain("/login");
  });

  it("should return a result object", () => {
    const code = buildAutoLoginCode("user@test.com", "password123");
    expect(code).toContain("return {");
    expect(code).toContain("success");
    expect(code).toContain("loggedIn");
  });

  it("should safely escape special characters in credentials", () => {
    const code = buildAutoLoginCode(
      "user@test.com",
      "p@ss\"word\\with'special<chars>"
    );
    expect(code).toContain("p@ss");
    expect(code).not.toContain('fill("p@ss"word');
  });

  it("should include fallback selectors for email input", () => {
    const code = buildAutoLoginCode("user@test.com", "password123");
    expect(code).toContain('input[name="username"]');
    expect(code).toContain('input[type="email"]');
  });

  it("should include fallback selectors for password input", () => {
    const code = buildAutoLoginCode("user@test.com", "password123");
    expect(code).toContain('input[name="password"]');
    expect(code).toContain('input[type="password"]');
  });
});
