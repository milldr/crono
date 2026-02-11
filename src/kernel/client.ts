/**
 * Kernel.sh browser automation client for Cronometer.
 *
 * Orchestrates the SDK to manage browser sessions, handle login,
 * and execute Playwright automation for diary entries.
 *
 * Each operation creates a fresh browser, logs in, performs the
 * action, and tears down. No profiles or persistent sessions needed.
 */

import Kernel from "@onkernel/sdk";
import { createInterface } from "readline";
import { getCredential } from "../credentials.js";
import {
  buildAutoLoginCode,
  buildLoginCheckCode,
  buildNavigateToLoginCode,
} from "./login.js";
import { buildQuickAddCode } from "./quick-add.js";

export interface MacroEntry {
  protein?: number;
  carbs?: number;
  fat?: number;
  meal?: string;
}

export interface KernelClient {
  addQuickEntry(entry: MacroEntry): Promise<void>;
}

/**
 * Create a Kernel client for Cronometer automation.
 *
 * Resolves the API key from env var or credential store.
 * Each operation creates a fresh browser and logs in.
 */
export async function getKernelClient(): Promise<KernelClient> {
  const apiKey =
    process.env["KERNEL_API_KEY"] ?? getCredential("kernel-api-key");
  if (!apiKey) {
    throw new Error(
      "Kernel API key not found.\n" +
        "Run `crono login` to configure credentials, or set:\n" +
        "  export KERNEL_API_KEY=your-key-here"
    );
  }
  process.env["KERNEL_API_KEY"] = apiKey;

  const kernel = new Kernel();

  return {
    addQuickEntry: (entry: MacroEntry) => addQuickEntry(kernel, entry),
  };
}

/**
 * Execute the quick-add automation on Cronometer.
 * Creates a browser, logs in, performs the quick-add, then tears down.
 */
async function addQuickEntry(kernel: Kernel, entry: MacroEntry): Promise<void> {
  const username = getCredential("cronometer-username");
  const password = getCredential("cronometer-password");
  const hasAutoCreds = !!(username && password);

  const browser = await kernel.browsers.create({
    headless: hasAutoCreds,
    stealth: true,
    timeout_seconds: hasAutoCreds ? 120 : 300,
  });

  try {
    // Log in to Cronometer
    if (hasAutoCreds) {
      await autoLogin(kernel, browser.session_id, username, password);
    } else {
      await manualLogin(kernel, browser);
    }

    // Execute quick-add
    const result = await kernel.browsers.playwright.execute(
      browser.session_id,
      { code: buildQuickAddCode(entry), timeout_sec: 60 }
    );

    if (!result.success) {
      throw new Error(`Automation failed: ${result.error ?? "Unknown error"}`);
    }

    const data = result.result as { success: boolean; error?: string };
    if (!data.success) {
      throw new Error(`Quick add failed: ${data.error ?? "Unknown error"}`);
    }
  } finally {
    await kernel.browsers.deleteByID(browser.session_id);
  }
}

/**
 * Auto-login using stored Cronometer credentials.
 */
async function autoLogin(
  kernel: Kernel,
  sessionId: string,
  username: string,
  password: string
): Promise<void> {
  console.log("Logging into Cronometer...");

  const result = await kernel.browsers.playwright.execute(sessionId, {
    code: buildAutoLoginCode(username, password),
    timeout_sec: 60,
  });

  const data = result.result as {
    success: boolean;
    loggedIn: boolean;
    url: string;
    error?: string;
  };

  if (!result.success || !data.loggedIn) {
    throw new Error(
      `Auto-login failed: ${data.error ?? "Login verification failed"}.\n` +
        "Your credentials may be incorrect. Run `crono login` to update them."
    );
  }

  console.log("Logged in.");
}

/**
 * Manual login: show a live browser view for the user to log in interactively.
 */
async function manualLogin(
  kernel: Kernel,
  browser: { session_id: string; browser_live_view_url?: string | null }
): Promise<void> {
  console.log("No stored Cronometer credentials found.");
  console.log(
    "Tip: run `crono login` to save credentials for automatic login.\n"
  );

  if (browser.browser_live_view_url) {
    console.log("Browser live view:");
    console.log(`  ${browser.browser_live_view_url}\n`);
  }

  await kernel.browsers.playwright.execute(browser.session_id, {
    code: buildNavigateToLoginCode(),
    timeout_sec: 30,
  });

  console.log("Please log into Cronometer in the browser above.");
  await waitForEnter("Press Enter once you've logged in...");

  const result = await kernel.browsers.playwright.execute(browser.session_id, {
    code: buildLoginCheckCode(),
    timeout_sec: 30,
  });

  const data = result.result as {
    success: boolean;
    loggedIn: boolean;
    url: string;
  };

  if (!result.success || !data.loggedIn) {
    throw new Error(
      "Login verification failed. Make sure you're fully logged in and try again."
    );
  }

  console.log("Logged in.");
}

/**
 * Prompt the user to press Enter. Uses Node's readline for clean TTY handling.
 */
function waitForEnter(prompt: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}
