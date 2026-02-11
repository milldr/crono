/**
 * Credential storage abstraction with keychain + encrypted file fallback.
 *
 * Primary backend: @napi-rs/keyring (OS keychain).
 * Fallback: AES-256-GCM encrypted file at ~/.config/crono/credentials.enc
 * for headless/CI environments without a system keychain.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir, hostname, userInfo } from "os";
import { join } from "path";

export type CredentialKey =
  | "kernel-api-key"
  | "cronometer-username"
  | "cronometer-password";

const SERVICE_NAME = "crono";

let configDirOverride: string | null = null;

function getConfigDir(): string {
  return configDirOverride ?? join(homedir(), ".config", "crono");
}

function getCredFile(): string {
  return join(getConfigDir(), "credentials.enc");
}

// Salt length, IV length, auth tag length for AES-256-GCM
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

type Backend = "keyring" | "file";

let resolvedBackend: Backend | null = null;

/**
 * Resolve which backend to use. Try keyring first; fall back to encrypted file.
 * Cached per process.
 */
function getBackend(): Backend {
  if (resolvedBackend) return resolvedBackend;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Entry } = require("@napi-rs/keyring");
    // Probe the keychain with a test write/read/delete cycle
    const probe = new Entry(SERVICE_NAME, "__probe__");
    probe.setPassword("test");
    probe.deletePassword();
    resolvedBackend = "keyring";
  } catch {
    resolvedBackend = "file";
  }

  return resolvedBackend;
}

// -- Keyring backend --

function keyringGet(key: string): string | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Entry } = require("@napi-rs/keyring");
  try {
    const entry = new Entry(SERVICE_NAME, key);
    return entry.getPassword();
  } catch {
    return null;
  }
}

function keyringSet(key: string, value: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Entry } = require("@napi-rs/keyring");
  const entry = new Entry(SERVICE_NAME, key);
  entry.setPassword(value);
}

function keyringDelete(key: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Entry } = require("@napi-rs/keyring");
  try {
    const entry = new Entry(SERVICE_NAME, key);
    entry.deletePassword();
  } catch {
    // Ignore if not found
  }
}

// -- Encrypted file backend --

function deriveKey(salt: Buffer): Buffer {
  const material = `${hostname()}${homedir()}${userInfo().username}`;
  return scryptSync(material, salt, 32);
}

function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readEncryptedStore(): Record<string, string> {
  const CRED_FILE = getCredFile();
  if (!existsSync(CRED_FILE)) return {};

  try {
    const buf = readFileSync(CRED_FILE);
    if (buf.length < SALT_LEN + IV_LEN + TAG_LEN + 1) return {};

    const salt = buf.subarray(0, SALT_LEN);
    const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
    const tag = buf.subarray(buf.length - TAG_LEN);
    const ciphertext = buf.subarray(SALT_LEN + IV_LEN, buf.length - TAG_LEN);

    const key = deriveKey(salt);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return JSON.parse(plaintext.toString("utf-8"));
  } catch {
    return {};
  }
}

function writeEncryptedStore(data: Record<string, string>): void {
  ensureConfigDir();

  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(salt);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf-8");

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const output = Buffer.concat([salt, iv, ciphertext, tag]);
  writeFileSync(getCredFile(), output, { mode: 0o600 });
}

function fileGet(key: string): string | null {
  const store = readEncryptedStore();
  return store[key] ?? null;
}

function fileSet(key: string, value: string): void {
  const store = readEncryptedStore();
  store[key] = value;
  writeEncryptedStore(store);
}

function fileDelete(key: string): void {
  const store = readEncryptedStore();
  delete store[key];
  writeEncryptedStore(store);
}

// -- Public API --

export function getCredential(key: CredentialKey): string | null {
  return getBackend() === "keyring" ? keyringGet(key) : fileGet(key);
}

export function setCredential(key: CredentialKey, value: string): void {
  if (getBackend() === "keyring") {
    keyringSet(key, value);
  } else {
    fileSet(key, value);
  }
}

export function deleteCredential(key: CredentialKey): void {
  if (getBackend() === "keyring") {
    keyringDelete(key);
  } else {
    fileDelete(key);
  }
}

export function hasCredentials(): boolean {
  return getCredential("kernel-api-key") !== null;
}

/**
 * Reset the cached backend (for testing).
 */
export function _resetBackend(): void {
  resolvedBackend = null;
}

/**
 * Force a specific backend (for testing).
 */
export function _setBackend(backend: Backend): void {
  resolvedBackend = backend;
}

/**
 * Override the config directory (for testing).
 */
export function _setConfigDir(dir: string | null): void {
  configDirOverride = dir;
}
