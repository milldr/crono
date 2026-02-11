import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface CronoConfig {
  kernelProfile?: string;
  defaultMeal?: string;
}

const CONFIG_DIR = join(homedir(), ".config", "crono");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

/**
 * Ensure config directory exists.
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load configuration from disk.
 */
export function loadConfig(): CronoConfig {
  ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const content = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(content) as CronoConfig;
  } catch {
    return {};
  }
}

/**
 * Save configuration to disk.
 */
export function saveConfig(config: CronoConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Get the Kernel session directory.
 */
export function getSessionDir(): string {
  return join(CONFIG_DIR, "sessions");
}
