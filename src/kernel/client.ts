/**
 * Kernel.sh browser automation client for Cronometer.
 *
 * Orchestrates the SDK to manage browser sessions, handle login,
 * and execute Playwright automation for diary entries.
 */

import Kernel from "@onkernel/sdk";
import { createInterface } from "readline";
import { ensureProfile, isFirstRun, PROFILE_NAME } from "./profile.js";
import {
  buildLoginCheckCode,
  buildNavigateToLoginCode,
  buildQuickAddCode,
} from "./automation.js";

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
 * Get or create a Kernel client with an authenticated Cronometer session.
 *
 * First run: opens a live browser view for manual login, waits for user.
 * Subsequent runs: reuses saved profile (cookies/localStorage).
 */
export async function getKernelClient(): Promise<KernelClient> {
  const apiKey = process.env["KERNEL_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "KERNEL_API_KEY environment variable is required.\n" +
        "Get your API key at https://kernel.sh and set it:\n" +
        "  export KERNEL_API_KEY=your-key-here"
    );
  }

  const kernel = new Kernel();

  const firstRun = await isFirstRun(kernel);
  await ensureProfile(kernel);

  if (firstRun) {
    await handleFirstRun(kernel);
  } else {
    await verifySession(kernel);
  }

  return {
    addQuickEntry: (entry: MacroEntry) => addQuickEntry(kernel, entry),
  };
}

/**
 * First-run flow: open a headed browser with live view so the user
 * can log into Cronometer manually. Wait for them to press Enter,
 * then verify the login succeeded and save the session.
 */
async function handleFirstRun(kernel: Kernel): Promise<void> {
  console.log("First run detected — you need to log into Cronometer.");
  console.log("Opening a browser for you to sign in...\n");

  const browser = await kernel.browsers.create({
    profile: { name: PROFILE_NAME, save_changes: true },
    headless: false,
    stealth: true,
    timeout_seconds: 300,
  });

  try {
    if (browser.browser_live_view_url) {
      console.log("Browser live view:");
      console.log(`  ${browser.browser_live_view_url}\n`);
    }

    // Navigate to Cronometer login page
    await kernel.browsers.playwright.execute(browser.session_id, {
      code: buildNavigateToLoginCode(),
      timeout_sec: 30,
    });

    console.log("Please log into Cronometer in the browser above.");
    await waitForEnter("Press Enter once you've logged in...");

    // Verify login succeeded
    const result = await kernel.browsers.playwright.execute(
      browser.session_id,
      { code: buildLoginCheckCode(), timeout_sec: 30 }
    );

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

    console.log("Login verified! Session saved.\n");
  } finally {
    // Deleting the browser triggers profile save
    await kernel.browsers.deleteByID(browser.session_id);
  }
}

/**
 * Verify that the saved session is still valid (not expired).
 */
async function verifySession(kernel: Kernel): Promise<void> {
  const browser = await kernel.browsers.create({
    profile: { name: PROFILE_NAME, save_changes: false },
    headless: true,
    stealth: true,
    timeout_seconds: 120,
  });

  try {
    const result = await kernel.browsers.playwright.execute(
      browser.session_id,
      { code: buildLoginCheckCode(), timeout_sec: 30 }
    );

    const data = result.result as {
      success: boolean;
      loggedIn: boolean;
      url: string;
    };

    if (!result.success || !data.loggedIn) {
      // Session expired — need to re-login
      await kernel.browsers.deleteByID(browser.session_id);
      await handleFirstRun(kernel);
      return;
    }
  } finally {
    await kernel.browsers.deleteByID(browser.session_id).catch(() => {
      // Browser may already be deleted if we went through re-login
    });
  }
}

/**
 * Execute the quick-add automation on Cronometer.
 */
async function addQuickEntry(
  kernel: Kernel,
  entry: MacroEntry
): Promise<void> {
  const browser = await kernel.browsers.create({
    profile: { name: PROFILE_NAME, save_changes: true },
    headless: true,
    stealth: true,
    timeout_seconds: 120,
  });

  try {
    const result = await kernel.browsers.playwright.execute(
      browser.session_id,
      { code: buildQuickAddCode(entry), timeout_sec: 60 }
    );

    if (!result.success) {
      throw new Error(
        `Automation failed: ${result.error ?? "Unknown error"}`
      );
    }

    const data = result.result as { success: boolean; error?: string };
    if (!data.success) {
      throw new Error(
        `Quick add failed: ${data.error ?? "Unknown error"}`
      );
    }
  } finally {
    // Delete browser to persist profile state
    await kernel.browsers.deleteByID(browser.session_id);
  }
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
