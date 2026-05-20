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

  return createAutomationClient(createKernelRuntimeFactory(kernel));
}

function createKernelRuntimeFactory(kernel: Kernel): AutomationRuntimeFactory {
  return async (hasAutoCredentials: boolean) => {
    const browser = await kernel.browsers.create({
      headless: hasAutoCredentials,
      stealth: true,
      timeout_seconds: hasAutoCredentials ? 120 : 300,
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
