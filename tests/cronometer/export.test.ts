import { describe, it, expect } from "vitest";
import { buildNonceBody, parseNonce } from "../../src/cronometer/export.js";

describe("buildNonceBody", () => {
  it("should construct valid GWT RPC body", () => {
    const body = buildNonceBody("HEADER123", "sesnonce456", 12345);
    expect(body).toContain("HEADER123");
    expect(body).toContain("sesnonce456");
    expect(body).toContain("12345");
    expect(body).toContain("generateAuthorizationToken");
    expect(body).toContain("com.cronometer.shared.rpc.CronometerService");
  });
});

describe("parseNonce", () => {
  it('should extract nonce from //OK[1,["hex"]] format', () => {
    const body = '//OK[1,["13405ce97180c39c7cabb6852736549c"],0,7]';
    expect(parseNonce(body)).toBe("13405ce97180c39c7cabb6852736549c");
  });

  it('should extract nonce from //OK["hex"] format', () => {
    const body = '//OK["abcdef0123456789abcdef0123456789"]';
    expect(parseNonce(body)).toBe("abcdef0123456789abcdef0123456789");
  });

  it("should return null for error responses", () => {
    const body =
      '//EX[2,1,["com.cronometer.shared.user.exceptions.NotLoggedInException/844385496","Invalid or expired session"],0,7]';
    expect(parseNonce(body)).toBeNull();
  });

  it("should return null for invalid responses", () => {
    expect(parseNonce("invalid")).toBeNull();
    expect(parseNonce("")).toBeNull();
  });
});
