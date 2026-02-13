import { describe, it, expect } from "vitest";
import {
  parseAnticsrf,
  parseUserId,
  extractCookie,
  buildAuthenticateBody,
} from "../../src/cronometer/auth.js";

describe("parseAnticsrf", () => {
  it("should extract anticsrf from login page HTML", () => {
    const html = `<form><input type="hidden" name="anticsrf" value="abc123def456"></form>`;
    expect(parseAnticsrf(html)).toBe("abc123def456");
  });

  it("should handle double-quoted attributes", () => {
    const html = `<input name="anticsrf" value="token789">`;
    expect(parseAnticsrf(html)).toBe("token789");
  });

  it("should handle single-quoted attributes", () => {
    const html = `<input name='anticsrf' value='token456'>`;
    expect(parseAnticsrf(html)).toBe("token456");
  });

  it("should return null when no anticsrf found", () => {
    const html = `<form><input type="text" name="username"></form>`;
    expect(parseAnticsrf(html)).toBeNull();
  });
});

describe("parseUserId", () => {
  it("should extract user ID from GWT response", () => {
    const body = '//OK[12345678,0,7,["com.cronometer"]]';
    expect(parseUserId(body)).toBe(12345678);
  });

  it("should handle negative user IDs", () => {
    const body = "//OK[-98765432,0,7]";
    expect(parseUserId(body)).toBe(-98765432);
  });

  it("should return null for invalid response", () => {
    expect(parseUserId("//EX[error]")).toBeNull();
    expect(parseUserId("invalid")).toBeNull();
  });
});

describe("extractCookie", () => {
  it("should extract a named cookie from headers", () => {
    const headers = new Headers();
    headers.append("set-cookie", "JSESSIONID=abc123; Path=/; HttpOnly");
    expect(extractCookie(headers, "JSESSIONID")).toBe("abc123");
  });

  it("should extract sesnonce cookie", () => {
    const headers = new Headers();
    headers.append(
      "set-cookie",
      "sesnonce=deadbeef1234; Path=/; HttpOnly; Secure"
    );
    expect(extractCookie(headers, "sesnonce")).toBe("deadbeef1234");
  });

  it("should return null when cookie not found", () => {
    const headers = new Headers();
    headers.append("set-cookie", "other=value; Path=/");
    expect(extractCookie(headers, "JSESSIONID")).toBeNull();
  });
});

describe("buildAuthenticateBody", () => {
  it("should construct valid GWT RPC body", () => {
    const body = buildAuthenticateBody("HEADER123");
    expect(body).toContain("HEADER123");
    expect(body).toContain("com.cronometer.shared.rpc.CronometerService");
    expect(body).toContain("authenticate");
    expect(body).toContain("java.lang.Integer/3438268394");
    expect(body.startsWith("7|0|5|")).toBe(true);
  });

  it("should include timezone offset", () => {
    const body = buildAuthenticateBody("HEADER123");
    const tzOffset = new Date().getTimezoneOffset();
    expect(body).toContain(`|${tzOffset}|`);
  });
});
