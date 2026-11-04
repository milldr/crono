/**
 * Playwright code generator for Cronometer quick-add automation.
 *
 * Returns a code string that executes remotely via
 * kernel.browsers.playwright.execute(). The code has access to
 * `page`, `context`, and `browser` from the Playwright environment.
 */

import type { MacroEntry } from "./client.js";
import { buildFoodDialogCode } from "./food-dialog.js";

/**
 * Macro names as they appear in Cronometer's food search.
 * Each macro is a separate "Quick Add" food item.
 */
export const MACRO_SEARCH_NAMES: Record<string, string> = {
  protein: "Quick Add, Protein",
  carbs: "Quick Add, Carbohydrate",
  fat: "Quick Add, Fat",
  alcohol: "Quick Add, Alcohol",
};

/**
 * Generate Playwright code for adding a quick entry to Cronometer.
 *
 * For each macro, the flow is:
 *   right-click meal category → "Add Food" → search "Quick Add, <Macro>" →
 *   select result → enter serving size (grams) → "Add to Diary"
 */
export function buildQuickAddCode(entry: MacroEntry): string {
  const { protein, carbs, fat, alcohol, meal, date } = entry;

  const mealLabel = meal
    ? meal.charAt(0).toUpperCase() + meal.slice(1).toLowerCase()
    : "Uncategorized";

  // Build list of macros to add
  const macros: { name: string; searchName: string; grams: number }[] = [];
  if (protein !== undefined)
    macros.push({
      name: "protein",
      searchName: MACRO_SEARCH_NAMES.protein,
      grams: protein,
    });
  if (carbs !== undefined)
    macros.push({
      name: "carbs",
      searchName: MACRO_SEARCH_NAMES.carbs,
      grams: carbs,
    });
  if (fat !== undefined)
    macros.push({
      name: "fat",
      searchName: MACRO_SEARCH_NAMES.fat,
      grams: fat,
    });
  if (alcohol !== undefined)
    macros.push({
      name: "alcohol",
      searchName: MACRO_SEARCH_NAMES.alcohol,
      grams: alcohol,
    });

  const macrosJson = JSON.stringify(macros);

  return `
    const macros = ${macrosJson};
    const mealLabel = ${JSON.stringify(mealLabel)};
    const targetDate = ${JSON.stringify(date ?? null)};

    // Navigate to diary — we're already logged in from the same session
    await page.goto('https://cronometer.com/#diary', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Wait for the diary to fully render
    await page.waitForTimeout(2000);

    // Verify we're logged in
    const url = page.url();
    if (url.includes('/login') || url.includes('/signin')) {
      return { success: false, error: 'Not logged in. Login may have failed.' };
    }

    // Navigate to the target date using prev-day arrows (same approach as diary/weight)
    if (targetDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(targetDate + 'T00:00:00');
      const daysBack = Math.round((today - target) / (1000 * 60 * 60 * 24));
      for (let s = 0; s < daysBack && s < 90; s++) {
        const prev = page.locator('i.diary-date-previous').filter({ visible: true });
        if (await prev.count() > 0) {
          await prev.first().click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Helper: find and click an element from a list of selectors
    async function clickFirst(selectors, description) {
      for (const sel of selectors) {
        try {
          const el = page.locator(sel);
          if (await el.count() > 0) {
            await el.first().click({ timeout: 5000 });
            return true;
          }
        } catch {}
      }
      return false;
    }

    // Add each macro as a separate food entry
    for (const macro of macros) {
${buildFoodDialogCode({
  foodNameVar: "macro.searchName",
  itemNameVar: "macro.name",
  servingCountVar: "macro.grams",
  alwaysUpdateServingSize: true,
  updateServingSize: true,
  verifyDialogDismissed: true,
  verifyNewEntry: true,
})}
    }

    return { success: true };
  `;
}
