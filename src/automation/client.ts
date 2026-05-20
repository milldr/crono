import { loadConfig } from "../config.js";
import { getKernelClient } from "../kernel/client.js";
import { getPlaywrightClient } from "../playwright/client.js";
import type { AutomationClient } from "./types.js";

export type AutomationBackend = "kernel" | "playwright";

export function getAutomationBackend(): AutomationBackend {
  const config = loadConfig();
  return config.useKernel === false ? "playwright" : "kernel";
}

export async function getAutomationClient(): Promise<AutomationClient> {
  return getAutomationBackend() === "kernel"
    ? getKernelClient()
    : getPlaywrightClient();
}
