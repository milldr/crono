/**
 * Local Playwright automation runtime.
 */

import { mkdirSync } from "fs";
import { chromium, type BrowserContext, type Page } from "playwright";
import { createAutomationClient } from "../automation/runner.js";
import type {
  AutomationClient,
  AutomationRuntime,
} from "../automation/types.js";
import { getPlaywrightProfileDir, loadConfig } from "../config.js";

export async function getPlaywrightClient(): Promise<AutomationClient> {
  return createAutomationClient(createPlaywrightRuntime);
}

async function createPlaywrightRuntime(): Promise<AutomationRuntime> {
  const context = await createContext();
  const page = context.pages()[0] ?? (await context.newPage());

  return {
    execute: (code: string) => executeScript(page, context, code),
    close: () => context.close(),
  };
}

async function createContext(): Promise<BrowserContext> {
  const config = loadConfig();
  const profileDir = getPlaywrightProfileDir();
  mkdirSync(profileDir, { recursive: true });

  return chromium.launchPersistentContext(profileDir, {
    headless:
      config.playwrightHeadless ??
      (process.platform === "linux" && !process.env["DISPLAY"]),
  });
}

async function executeScript<T>(
  page: Page,
  context: BrowserContext,
  code: string
): Promise<{ success: boolean; result?: T; error?: string }> {
  const browser = context.browser();
  const execute = new Function(
    "page",
    "context",
    "browser",
    `return (async () => { ${code} })();`
  ) as (
    page: Page,
    context: BrowserContext,
    browser: ReturnType<BrowserContext["browser"]>
  ) => Promise<T>;

  try {
    return { success: true, result: await execute(page, context, browser) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
