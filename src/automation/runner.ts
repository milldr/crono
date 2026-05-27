import * as p from "@clack/prompts";
import { getCredential } from "../credentials.js";
import { buildAddCustomFoodCode } from "../kernel/add-custom-food.js";
import { buildBiometricsCode } from "../kernel/biometrics.js";
import { buildDiaryCode } from "../kernel/diary.js";
import { buildLogFoodCode } from "../kernel/log-food.js";
import { buildRecipesCode } from "../kernel/recipes.js";
import {
  buildAutoLoginCode,
  buildLoginCheckCode,
  buildNavigateToLoginCode,
} from "../kernel/login.js";
import { buildQuickAddCode } from "../kernel/quick-add.js";
import { buildWeightCode } from "../kernel/weight.js";
import type {
  AutomationClient,
  AutomationRuntime,
  AutomationRuntimeFactory,
  BiometricEntry,
  CustomFoodEntry,
  DiaryData,
  LogFoodEntry,
  MacroEntry,
  PlaywrightExecutionResponse,
  RecipeData,
  WeightData,
} from "./types.js";

export function createAutomationClient(
  createRuntime: AutomationRuntimeFactory
): AutomationClient {
  return {
    addQuickEntry: (entry: MacroEntry, onStatus?: (msg: string) => void) =>
      withLoggedInRuntime(createRuntime, onStatus, async (runtime) => {
        onStatus?.("Adding quick entry...");
        const data = await executeAutomation<{
          success: boolean;
          error?: string;
        }>(runtime, buildQuickAddCode(entry), 60);
        if (!data.success) {
          throw new Error(`Quick add failed: ${data.error ?? "Unknown error"}`);
        }
      }),
    getWeight: (dates: string[], onStatus?: (msg: string) => void) =>
      withLoggedInRuntime(createRuntime, onStatus, async (runtime) => {
        onStatus?.("Reading weight data...");
        const data = await executeAutomation<{
          success: boolean;
          entries?: WeightData[];
          error?: string;
        }>(runtime, buildWeightCode(dates), 60);
        if (!data.success) {
          throw new Error(
            `Weight read failed: ${data.error ?? "Unknown error"}`
          );
        }
        return data.entries ?? [];
      }),
    getDiary: (
      dates: string[],
      onStatus?: (msg: string) => void,
      scrapeTargets?: boolean
    ) =>
      withLoggedInRuntime(createRuntime, onStatus, async (runtime) => {
        onStatus?.("Reading diary data...");
        const data = await executeAutomation<{
          success: boolean;
          entries?: DiaryData[];
          error?: string;
        }>(runtime, buildDiaryCode(dates, scrapeTargets), 60);
        if (!data.success) {
          throw new Error(
            `Diary read failed: ${data.error ?? "Unknown error"}`
          );
        }
        return data.entries ?? [];
      }),
    addCustomFood: (entry: CustomFoodEntry, onStatus?: (msg: string) => void) =>
      withLoggedInRuntime(createRuntime, onStatus, async (runtime) => {
        onStatus?.("Creating custom food...");
        const data = await executeAutomation<{
          success: boolean;
          error?: string;
        }>(runtime, buildAddCustomFoodCode(entry), 120);
        if (!data.success) {
          throw new Error(
            `Custom food creation failed: ${data.error ?? "Unknown error"}`
          );
        }
      }),
    logFood: (entry: LogFoodEntry, onStatus?: (msg: string) => void) =>
      withLoggedInRuntime(createRuntime, onStatus, async (runtime) => {
        onStatus?.("Logging food to diary...");
        const data = await executeAutomation<{
          success: boolean;
          error?: string;
        }>(runtime, buildLogFoodCode(entry), 60);
        if (!data.success) {
          throw new Error(
            `Food logging failed: ${data.error ?? "Unknown error"}`
          );
        }
      }),
    getRecipes: (onStatus?: (msg: string) => void) =>
      withLoggedInRuntime(createRuntime, onStatus, async (runtime) => {
        onStatus?.("Reading custom recipes...");
        const data = await executeAutomation<{
          success: boolean;
          recipes?: RecipeData[];
          error?: string;
        }>(runtime, buildRecipesCode(), 30);
        if (!data.success) {
          throw new Error(
            `Recipes read failed: ${data.error ?? "Unknown error"}`
          );
        }
        return data.recipes ?? [];
      }),
    logBiometric: (entry: BiometricEntry, onStatus?: (msg: string) => void) =>
      withLoggedInRuntime(createRuntime, onStatus, async (runtime) => {
        const typeLabel =
          entry.type === "weight"
            ? "weight"
            : entry.type === "bodyfat"
              ? "body fat"
              : "blood pressure";
        onStatus?.(`Logging ${typeLabel}...`);
        const data = await executeAutomation<{
          success: boolean;
          error?: string;
        }>(runtime, buildBiometricsCode(entry), 60);
        if (!data.success) {
          throw new Error(
            `Biometric logging failed: ${data.error ?? "Unknown error"}`
          );
        }
      }),
  };
}

async function withLoggedInRuntime<T>(
  createRuntime: AutomationRuntimeFactory,
  onStatus: ((msg: string) => void) | undefined,
  run: (runtime: AutomationRuntime) => Promise<T>
): Promise<T> {
  const username = getCredential("cronometer-username");
  const password = getCredential("cronometer-password");
  const hasAutoCredentials = !!(username && password);
  const runtime = await createRuntime(hasAutoCredentials);

  try {
    await ensureLoggedIn(runtime, username, password, onStatus);

    return await run(runtime);
  } finally {
    await runtime.close();
  }
}

async function ensureLoggedIn(
  runtime: AutomationRuntime,
  username: string | null,
  password: string | null,
  onStatus?: (msg: string) => void
): Promise<void> {
  onStatus?.("Checking Cronometer session...");

  const data = await executeAutomation<{
    success: boolean;
    loggedIn: boolean;
    url: string;
  }>(runtime, buildLoginCheckCode(), 30);

  if (data.loggedIn) {
    return;
  }

  if (username && password) {
    await autoLogin(runtime, username, password, onStatus);
  } else {
    await manualLogin(runtime);
  }
}

async function autoLogin(
  runtime: AutomationRuntime,
  username: string,
  password: string,
  onStatus?: (msg: string) => void
): Promise<void> {
  onStatus?.("Logging into Cronometer...");

  const data = await executeAutomation<{
    success: boolean;
    loggedIn: boolean;
    url: string;
    error?: string;
    loginError?: string | null;
  }>(runtime, buildAutoLoginCode(username, password), 60);

  if (!data.loggedIn) {
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

async function manualLogin(runtime: AutomationRuntime): Promise<void> {
  p.log.warn("No stored Cronometer credentials found.");
  p.log.info("Tip: run `crono login` to save credentials for automatic login.");

  if (runtime.liveViewUrl) {
    p.note(runtime.liveViewUrl, "Browser Live View");
  }

  await executeAutomation(runtime, buildNavigateToLoginCode(), 30);
  p.log.info("Please log into Cronometer in the browser above.");

  const confirmation = await p.text({
    message: "Press Enter once you've logged in...",
    defaultValue: "",
  });

  if (p.isCancel(confirmation)) {
    throw new Error("Login cancelled by user.");
  }

  const data = await executeAutomation<{
    success: boolean;
    loggedIn: boolean;
    url: string;
  }>(runtime, buildLoginCheckCode(), 30);

  if (!data.loggedIn) {
    throw new Error(
      "Login verification failed. Make sure you're fully logged in and try again."
    );
  }

  p.log.step("Logged in.");
}

async function executeAutomation<T>(
  runtime: AutomationRuntime,
  code: string,
  timeoutSec: number
): Promise<T> {
  const response = await runtime.execute<T>(code, timeoutSec);
  return unwrapExecutionResult(response, "Automation");
}

function unwrapExecutionResult<T>(
  response: PlaywrightExecutionResponse<T>,
  action: string
): T {
  if (!response.success) {
    const details = response.error ?? response.stderr ?? "Unknown error";
    throw new Error(`${action} failed: ${details}`);
  }

  if (response.result === undefined || response.result === null) {
    throw new Error(`${action} failed: no result returned`);
  }

  return response.result;
}
