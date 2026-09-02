/**
 * Kernel.sh browser automation runtime.
 */

import Kernel from "@onkernel/sdk";
import { createAutomationClient } from "../automation/runner.js";
import type {
  AutomationClient,
  AutomationRuntime,
  AutomationRuntimeFactory,
  CustomFoodEntry,
  DiaryData,
  LogFoodEntry,
  MacroEntry,
  PlaywrightExecutionResponse,
  WeightData,
} from "../automation/types.js";
import { getCredential } from "../credentials.js";

/**
 * Client-side HTTP timeout for Kernel API requests.
 *
 * The SDK defaults to 60s, but automations are dispatched with `timeout_sec`
 * values up to 420s (see multi-macro retroactive quick-add). When the client gives up first the
 * browser keeps going, so Cronometer commits the change while crono reports
 * failure — and a retry then duplicates the data. Keep this comfortably above
 * the largest `timeout_sec` used by any automation.
 */
const KERNEL_REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Lifetime of a remote browser session.
 *
 * A single command can spend up to 120s logging in before a multi-macro quick-add
 * starts. Quick-add may need up to 420s for four macros plus 90 date steps, so
 * leave enough room for both login and the operation.
 */
const BROWSER_SESSION_TIMEOUT_SEC = 600;

export type KernelClient = AutomationClient;
export type {
  CustomFoodEntry,
  DiaryData,
  LogFoodEntry,
  MacroEntry,
  WeightData,
};

/**
 * Create a Kernel client for Cronometer automation.
 *
 * Resolves the API key from env var or credential store.
 * Each operation creates a fresh browser and logs in.
 */
export async function getKernelClient(): Promise<KernelClient> {
  const apiKey = getCredential("kernel-api-key");
  if (!apiKey) {
    throw new Error(
      "Kernel API key not found.\n" +
        "Run `crono login` to configure credentials, or set:\n" +
        "  export KERNEL_API_KEY=your-key-here"
    );
  }

  process.env["KERNEL_API_KEY"] = apiKey;
  const kernel = new Kernel({ timeout: KERNEL_REQUEST_TIMEOUT_MS });

  return createAutomationClient(createKernelRuntimeFactory(kernel));
}

function createKernelRuntimeFactory(kernel: Kernel): AutomationRuntimeFactory {
  return async (hasAutoCredentials: boolean) => {
    const browser = await kernel.browsers.create({
      headless: hasAutoCredentials,
      stealth: true,
      timeout_seconds: BROWSER_SESSION_TIMEOUT_SEC,
    });

    return {
      liveViewUrl: browser.browser_live_view_url,
      execute: async <T = unknown>(
        code: string,
        timeoutSec = 60
      ): Promise<PlaywrightExecutionResponse<T>> => {
        const response = await kernel.browsers.playwright.execute(
          browser.session_id,
          {
            code,
            timeout_sec: timeoutSec,
          }
        );
        return response as PlaywrightExecutionResponse<T>;
      },
      close: async () => {
        try {
          await kernel.browsers.deleteByID(browser.session_id);
        } catch {
          // Browser may already be cleaned up by Kernel.
        }
      },
    } satisfies AutomationRuntime;
  };
}
