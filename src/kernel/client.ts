/**
 * Kernel.sh browser automation client for Cronometer.
 *
 * Orchestrates the SDK to manage browser sessions, handle login,
 * and execute Playwright automation for diary entries.
 *
 * Each operation creates a fresh browser, logs in, performs the
 * action, and tears down.
 */

import * as p from "@clack/prompts";
import Kernel from "@onkernel/sdk";
import { getCredential } from "../credentials.js";
import {
  buildAutoLoginCode,
  buildLoginCheckCode,
  buildNavigateToLoginCode,
} from "./login.js";
import { buildQuickAddCode } from "./quick-add.js";
import { buildAddCustomFoodCode } from "./add-custom-food.js";
import { buildLogFoodCode } from "./log-food.js";
import { buildDiaryCode } from "./diary.js";
import { buildWeightCode } from "./weight.js";

export interface MacroEntry {
  protein?: number;
  carbs?: number;
  fat?: number;
  meal?: string;
}

export interface WeightData {
  date: string;
  weight: number | null;
  unit: string;
}

export interface DiaryData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CustomFoodEntry {
  name: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  calories?: number;
  log?: string | boolean;
}

export interface LogFoodEntry {
  name: string;
  meal?: string;
  servings?: number;
}

export interface KernelClient {
  addQuickEntry(
    entry: MacroEntry,
    onStatus?: (msg: string) => void
  ): Promise<void>;
  getWeight(
    dates: string[],
    onStatus?: (msg: string) => void
  ): Promise<WeightData[]>;
  getDiary(
    dates: string[],
    onStatus?: (msg: string) => void
  ): Promise<DiaryData[]>;
  addCustomFood(
    entry: CustomFoodEntry,
    onStatus?: (msg: string) => void
  ): Promise<void>;
  logFood(entry: LogFoodEntry, onStatus?: (msg: string) => void): Promise<void>;
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
    addQuickEntry: (entry: MacroEntry, onStatus?: (msg: string) => void) =>
      addQuickEntry(kernel, entry, onStatus),
    getWeight: (dates: string[], onStatus?: (msg: string) => void) =>
      getWeight(kernel, dates, onStatus),
    getDiary: (dates: string[], onStatus?: (msg: string) => void) =>
      getDiary(kernel, dates, onStatus),
    addCustomFood: (entry: CustomFoodEntry, onStatus?: (msg: string) => void) =>
      addCustomFood(kernel, entry, onStatus),
    logFood: (entry: LogFoodEntry, onStatus?: (msg: string) => void) =>
      logFood(kernel, entry, onStatus),
  };
}

/**
 * Execute the quick-add automation on Cronometer.
 * Creates a browser, logs in, performs the quick-add, then tears down.
 */
async function addQuickEntry(
  kernel: Kernel,
  entry: MacroEntry,
  onStatus?: (msg: string) => void
): Promise<void> {
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
      await autoLogin(kernel, browser.session_id, username, password, onStatus);
    } else {
      await manualLogin(kernel, browser);
    }

    // Execute quick-add
    onStatus?.("Adding quick entry...");
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
    try {
      await kernel.browsers.deleteByID(browser.session_id);
    } catch {
      // Browser may already be cleaned up by Kernel
    }
  }
}

/**
 * Execute the weight scraping automation on Cronometer.
 * Creates a browser, logs in, reads weight data, then tears down.
 */
async function getWeight(
  kernel: Kernel,
  dates: string[],
  onStatus?: (msg: string) => void
): Promise<WeightData[]> {
  const username = getCredential("cronometer-username");
  const password = getCredential("cronometer-password");
  const hasAutoCreds = !!(username && password);

  const browser = await kernel.browsers.create({
    headless: hasAutoCreds,
    stealth: true,
    timeout_seconds: hasAutoCreds ? 120 : 300,
  });

  try {
    if (hasAutoCreds) {
      await autoLogin(kernel, browser.session_id, username, password, onStatus);
    } else {
      await manualLogin(kernel, browser);
    }

    onStatus?.("Reading weight data...");
    const result = await kernel.browsers.playwright.execute(
      browser.session_id,
      { code: buildWeightCode(dates), timeout_sec: 60 }
    );

    if (!result.success) {
      throw new Error(`Automation failed: ${result.error ?? "Unknown error"}`);
    }

    const data = result.result as {
      success: boolean;
      entries?: WeightData[];
      error?: string;
    };
    if (!data.success) {
      throw new Error(`Weight read failed: ${data.error ?? "Unknown error"}`);
    }

    return data.entries ?? [];
  } finally {
    try {
      await kernel.browsers.deleteByID(browser.session_id);
    } catch {
      // Browser may already be cleaned up by Kernel
    }
  }
}

/**
 * Execute the diary nutrition scraping automation on Cronometer.
 * Creates a browser, logs in, reads nutrition data, then tears down.
 */
async function getDiary(
  kernel: Kernel,
  dates: string[],
  onStatus?: (msg: string) => void
): Promise<DiaryData[]> {
  const username = getCredential("cronometer-username");
  const password = getCredential("cronometer-password");
  const hasAutoCreds = !!(username && password);

  const browser = await kernel.browsers.create({
    headless: hasAutoCreds,
    stealth: true,
    timeout_seconds: hasAutoCreds ? 120 : 300,
  });

  try {
    if (hasAutoCreds) {
      await autoLogin(kernel, browser.session_id, username, password, onStatus);
    } else {
      await manualLogin(kernel, browser);
    }

    onStatus?.("Reading diary data...");
    const result = await kernel.browsers.playwright.execute(
      browser.session_id,
      { code: buildDiaryCode(dates), timeout_sec: 60 }
    );

    if (!result.success) {
      throw new Error(`Automation failed: ${result.error ?? "Unknown error"}`);
    }

    const data = result.result as {
      success: boolean;
      entries?: DiaryData[];
      error?: string;
    };
    if (!data.success) {
      throw new Error(`Diary read failed: ${data.error ?? "Unknown error"}`);
    }

    return data.entries ?? [];
  } finally {
    try {
      await kernel.browsers.deleteByID(browser.session_id);
    } catch {
      // Browser may already be cleaned up by Kernel
    }
  }
}

/**
 * Execute the custom food creation automation on Cronometer.
 * Creates a browser, logs in, creates the food, optionally logs it, then tears down.
 */
async function addCustomFood(
  kernel: Kernel,
  entry: CustomFoodEntry,
  onStatus?: (msg: string) => void
): Promise<void> {
  const username = getCredential("cronometer-username");
  const password = getCredential("cronometer-password");
  const hasAutoCreds = !!(username && password);

  const browser = await kernel.browsers.create({
    headless: hasAutoCreds,
    stealth: true,
    timeout_seconds: hasAutoCreds ? 120 : 300,
  });

  try {
    if (hasAutoCreds) {
      await autoLogin(kernel, browser.session_id, username, password, onStatus);
    } else {
      await manualLogin(kernel, browser);
    }

    onStatus?.("Creating custom food...");
    const result = await kernel.browsers.playwright.execute(
      browser.session_id,
      { code: buildAddCustomFoodCode(entry), timeout_sec: 120 }
    );

    if (!result.success) {
      throw new Error(`Automation failed: ${result.error ?? "Unknown error"}`);
    }

    const data = result.result as { success: boolean; error?: string };
    if (!data.success) {
      throw new Error(
        `Custom food creation failed: ${data.error ?? "Unknown error"}`
      );
    }
  } finally {
    try {
      await kernel.browsers.deleteByID(browser.session_id);
    } catch {
      // Browser may already be cleaned up by Kernel
    }
  }
}

/**
 * Execute the food logging automation on Cronometer.
 * Creates a browser, logs in, searches for the food, logs it, then tears down.
 */
async function logFood(
  kernel: Kernel,
  entry: LogFoodEntry,
  onStatus?: (msg: string) => void
): Promise<void> {
  const username = getCredential("cronometer-username");
  const password = getCredential("cronometer-password");
  const hasAutoCreds = !!(username && password);

  const browser = await kernel.browsers.create({
    headless: hasAutoCreds,
    stealth: true,
    timeout_seconds: hasAutoCreds ? 120 : 300,
  });

  try {
    if (hasAutoCreds) {
      await autoLogin(kernel, browser.session_id, username, password, onStatus);
    } else {
      await manualLogin(kernel, browser);
    }

    onStatus?.("Logging food to diary...");
    const result = await kernel.browsers.playwright.execute(
      browser.session_id,
      { code: buildLogFoodCode(entry), timeout_sec: 60 }
    );

    if (!result.success) {
      throw new Error(`Automation failed: ${result.error ?? "Unknown error"}`);
    }

    const data = result.result as { success: boolean; error?: string };
    if (!data.success) {
      throw new Error(`Food logging failed: ${data.error ?? "Unknown error"}`);
    }
  } finally {
    try {
      await kernel.browsers.deleteByID(browser.session_id);
    } catch {
      // Browser may already be cleaned up by Kernel
    }
  }
}

/**
 * Auto-login using stored Cronometer credentials.
 */
async function autoLogin(
  kernel: Kernel,
  sessionId: string,
  username: string,
  password: string,
  onStatus?: (msg: string) => void
): Promise<void> {
  onStatus?.("Logging into Cronometer...");

  const result = await kernel.browsers.playwright.execute(sessionId, {
    code: buildAutoLoginCode(username, password),
    timeout_sec: 60,
  });

  const data = result.result as {
    success: boolean;
    loggedIn: boolean;
    url: string;
    error?: string;
    loginError?: string | null;
  };

  if (!result.success || !data.loggedIn) {
    const pageError = data.loginError?.toLowerCase() ?? "";
    const isRateLimited =
      pageError.includes("too many") ||
      pageError.includes("rate limit") ||
      pageError.includes("try again later") ||
      pageError.includes("temporarily");

    if (isRateLimited) {
      throw new Error(
        `Cronometer is rate-limiting login attempts. ${data.loginError}\n` +
          "Please wait a few minutes and try again."
      );
    }

    throw new Error(
      `Auto-login failed: ${data.error ?? data.loginError ?? "Login verification failed"}.\n` +
        "Your credentials may be incorrect. Run `crono login` to update them."
    );
  }
}

/**
 * Manual login: show a live browser view for the user to log in interactively.
 */
async function manualLogin(
  kernel: Kernel,
  browser: { session_id: string; browser_live_view_url?: string | null }
): Promise<void> {
  p.log.warn("No stored Cronometer credentials found.");
  p.log.info("Tip: run `crono login` to save credentials for automatic login.");

  if (browser.browser_live_view_url) {
    p.note(browser.browser_live_view_url, "Browser Live View");
  }

  await kernel.browsers.playwright.execute(browser.session_id, {
    code: buildNavigateToLoginCode(),
    timeout_sec: 30,
  });

  p.log.info("Please log into Cronometer in the browser above.");

  const confirmation = await p.text({
    message: "Press Enter once you've logged in...",
    defaultValue: "",
  });

  if (p.isCancel(confirmation)) {
    throw new Error("Login cancelled by user.");
  }

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

  p.log.step("Logged in.");
}
