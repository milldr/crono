/**
 * Playwright code generator for Cronometer food logging.
 *
 * Returns a code string that executes remotely via
 * kernel.browsers.playwright.execute(). The code has access to
 * `page`, `context`, and `browser` from the Playwright environment.
 */

import type { LogFoodEntry } from "./client.js";
import { buildFoodDialogCode } from "./food-dialog.js";

/**
 * Generate Playwright code for logging a food to the Cronometer diary.
 *
 * Flow:
 *   navigate to #diary → right-click meal → "Add Food" → search food name →
 *   select result → set servings → "Add to Diary"
 */
export function buildLogFoodCode(entry: LogFoodEntry): string {
  const { name, meal, servings } = entry;

  const mealLabel = meal
    ? meal.charAt(0).toUpperCase() + meal.slice(1).toLowerCase()
    : "Uncategorized";

  const foodName = JSON.stringify(name);
  const servingCount = servings ?? 1;

  return `
    const foodName = ${foodName};
    const mealLabel = ${JSON.stringify(mealLabel)};
    const servingCount = ${servingCount};

    // Navigate to diary
    await page.goto('https://cronometer.com/#diary', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Verify we're logged in
    const url = page.url();
    if (url.includes('/login') || url.includes('/signin')) {
      return { success: false, error: 'Not logged in. Login may have failed.' };
    }

    // Helper: find and click an element from a list of selectors
    async function clickFirst(selectors, description) {
      for (const sel of selectors) {
        try {
          const el = page.locator(sel).filter({ visible: true });
          if (await el.count() > 0) {
            await el.first().click({ timeout: 3000 });
            return true;
          }
        } catch {}
      }
      return false;
    }

${buildFoodDialogCode({ updateServingSize: true, verifyDialogDismissed: true })}

    return { success: true };
  `;
}
