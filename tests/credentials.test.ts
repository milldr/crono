import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  getCredential,
  setCredential,
  deleteCredential,
  hasCredentials,
  _resetBackend,
  _setBackend,
  _setConfigDir,
} from "../src/credentials.js";

const testDir = join(tmpdir(), `crono-test-${process.pid}-${Date.now()}`);

describe("credentials (encrypted file backend)", () => {
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    _resetBackend();
    _setBackend("file");
    _setConfigDir(testDir);
  });

  afterEach(() => {
    _setConfigDir(null);
    _resetBackend();
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // cleanup best-effort
    }
  });

  it("should return null for a missing credential", () => {
    const result = getCredential("kernel-api-key");
    expect(result).toBeNull();
  });

  it("should round-trip a credential", () => {
    setCredential("kernel-api-key", "test-key-123");
    const result = getCredential("kernel-api-key");
    expect(result).toBe("test-key-123");
  });

  it("should store and retrieve multiple credentials", () => {
    setCredential("kernel-api-key", "key-abc");
    setCredential("cronometer-username", "user@example.com");
    setCredential("cronometer-password", "s3cret!");

    expect(getCredential("kernel-api-key")).toBe("key-abc");
    expect(getCredential("cronometer-username")).toBe("user@example.com");
    expect(getCredential("cronometer-password")).toBe("s3cret!");
  });

  it("should delete a credential", () => {
    setCredential("kernel-api-key", "to-delete");
    expect(getCredential("kernel-api-key")).toBe("to-delete");

    deleteCredential("kernel-api-key");
    expect(getCredential("kernel-api-key")).toBeNull();
  });

  it("should not affect other credentials when deleting one", () => {
    setCredential("kernel-api-key", "key-1");
    setCredential("cronometer-username", "user@test.com");

    deleteCredential("kernel-api-key");

    expect(getCredential("kernel-api-key")).toBeNull();
    expect(getCredential("cronometer-username")).toBe("user@test.com");
  });

  it("should overwrite an existing credential", () => {
    setCredential("kernel-api-key", "old-key");
    setCredential("kernel-api-key", "new-key");
    expect(getCredential("kernel-api-key")).toBe("new-key");
  });

  it("should handle special characters in values", () => {
    const specialValue = "p@$$w0rd!#%^&*(){}[]|\\:\";'<>,.?/~`";
    setCredential("cronometer-password", specialValue);
    expect(getCredential("cronometer-password")).toBe(specialValue);
  });

  it("should return null for corrupted file", () => {
    const credFile = join(testDir, "credentials.enc");
    writeFileSync(credFile, "not-valid-encrypted-data");
    expect(getCredential("kernel-api-key")).toBeNull();
  });

  describe("hasCredentials", () => {
    it("should return false when no credentials stored", () => {
      expect(hasCredentials()).toBe(false);
    });

    it("should return true when kernel-api-key is stored", () => {
      setCredential("kernel-api-key", "some-key");
      expect(hasCredentials()).toBe(true);
    });

    it("should return false after kernel-api-key is deleted", () => {
      setCredential("kernel-api-key", "some-key");
      deleteCredential("kernel-api-key");
      expect(hasCredentials()).toBe(false);
    });
  });
});
