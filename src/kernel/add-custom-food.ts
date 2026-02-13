/**
 * Playwright code generator for Cronometer custom food creation.
 *
 * Returns a code string that executes remotely via
 * kernel.browsers.playwright.execute(). The code has access to
 * `page`, `context`, and `browser` from the Playwright environment.
 */

import type { CustomFoodEntry } from "./client.js";

/**
 * Nutrient labels as they appear in Cronometer's nutrition facts editor.
 */
export const NUTRIENT_LABELS: Record<string, string> = {
  calories: "Calories",
  protein: "Protein",
  carbs: "Total Carbohydrate",
  fat: "Total Fat",
};

/**
 * Generate Playwright code for creating a custom food in Cronometer.
 *
 * Flow:
 *   navigate to #foods → expand sidebar → click Custom Foods →
 *   click CREATE FOOD → fill name → click "-" to reveal nutrient inputs →
 *   fill macros → Save Changes → optionally log to diary
 */
export function buildAddCustomFoodCode(entry: CustomFoodEntry): string {
  const { name, protein, carbs, fat, calories, log } = entry;

  const logMeal =
    log === true ? "Uncategorized" : typeof log === "string" ? log : null;
  const mealLabel = logMeal
    ? logMeal.charAt(0).toUpperCase() + logMeal.slice(1).toLowerCase()
    : null;

  // Calculate calories: use explicit value or derive from macros (P*4 + C*4 + F*9)
  const totalCalories =
    calories ?? (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9;

  const nutrients: { label: string; value: number }[] = [];
  nutrients.push({ label: NUTRIENT_LABELS.calories, value: totalCalories });
  if (protein !== undefined)
    nutrients.push({ label: NUTRIENT_LABELS.protein, value: protein });
  if (carbs !== undefined)
    nutrients.push({ label: NUTRIENT_LABELS.carbs, value: carbs });
  if (fat !== undefined)
    nutrients.push({ label: NUTRIENT_LABELS.fat, value: fat });

  const nutrientsJson = JSON.stringify(nutrients);
  const foodName = JSON.stringify(name);
  const mealLabelJson = JSON.stringify(mealLabel);

  return `
    const foodName = ${foodName};
    const nutrients = ${nutrientsJson};
    const mealLabel = ${mealLabelJson};

    // Navigate directly to Custom Foods page
    await page.goto('https://cronometer.com/#custom-foods', { waitUntil: 'domcontentloaded', timeout: 15000 });
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
          const el = page.locator(sel);
          if (await el.count() > 0) {
            await el.first().click();
            return true;
          }
        } catch {}
      }
      return false;
    }

    await page.waitForTimeout(2000);

    // Click "CREATE FOOD" button
    const createClicked = await clickFirst([
      'button:has-text("CREATE FOOD")',
      'text="CREATE FOOD"',
    ], 'CREATE FOOD button');
    if (!createClicked) {
      return { success: false, error: 'Could not find "CREATE FOOD" button on Custom Foods page' };
    }
    await page.waitForTimeout(3000);

    // Fill in the food name using keyboard.type() for GWT compatibility.
    // Find the visible input.text-box via evaluate (many hidden inputs on page).
    const nameClicked = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input.text-box');
      for (const inp of inputs) {
        if (inp.offsetParent !== null) {
          inp.focus();
          inp.select();
          return true;
        }
      }
      return false;
    });
    if (nameClicked) {
      await page.waitForTimeout(200);
      await page.keyboard.type(foodName, { delay: 50 });
    } else {
      return { success: false, error: 'Could not find food name input field' };
    }
    await page.waitForTimeout(500);

    // Enter macro values in the nutrition facts label
    // Each nutrient row has a display div showing "-" and a hidden input.
    // Clicking "-" reveals the input, then we fill it.
    for (const nutrient of nutrients) {
      // Step 1: Click the "-" display div to reveal the hidden input
      const revealed = await page.evaluate((label) => {
        const rows = document.querySelectorAll('tr');
        for (const row of rows) {
          const nameDiv = row.querySelector('div');
          if (nameDiv && nameDiv.textContent?.trim() === label && nameDiv.offsetParent !== null) {
            const valueDivs = row.querySelectorAll('div');
            for (const div of valueDivs) {
              if (div.textContent?.trim() === '-' && div.offsetParent !== null) {
                div.click();
                return true;
              }
            }
          }
        }
        return false;
      }, nutrient.label);

      if (!revealed) {
        return { success: false, error: 'Could not find nutrient row for "' + nutrient.label + '"' };
      }
      await page.waitForTimeout(500);

      // Step 2: Fill the now-visible input in the same row
      const filled = await page.evaluate(({ label, value }) => {
        const rows = document.querySelectorAll('tr');
        for (const row of rows) {
          const nameDiv = row.querySelector('div');
          if (nameDiv && nameDiv.textContent?.trim() === label && nameDiv.offsetParent !== null) {
            const inputs = row.querySelectorAll('input');
            for (const inp of inputs) {
              if (inp.offsetParent !== null) {
                inp.focus();
                const nativeSetter = Object.getOwnPropertyDescriptor(
                  window.HTMLInputElement.prototype, 'value'
                ).set;
                nativeSetter.call(inp, String(value));
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                inp.dispatchEvent(new Event('change', { bubbles: true }));
                inp.dispatchEvent(new Event('blur', { bubbles: true }));
                return true;
              }
            }
          }
        }
        return false;
      }, nutrient);

      if (!filled) {
        return { success: false, error: 'Could not fill input for "' + nutrient.label + '"' };
      }
      await page.waitForTimeout(300);
    }

    // Click "Save Changes" button (appears after edits are made)
    await page.waitForTimeout(500);
    const saveClicked = await clickFirst([
      'button:has-text("Save Changes")',
      'button:has-text("Save")',
      'button:has-text("SAVE")',
    ], 'Save Changes button');
    if (!saveClicked) {
      return { success: false, error: 'Could not find "Save Changes" button' };
    }
    await page.waitForTimeout(1000);

    // If --log is set, continue to log the food to diary
    if (mealLabel) {
      // Navigate to diary
      await page.goto('https://cronometer.com/#diary', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);

      // Helper: right-click an element from a list of selectors
      async function rightClickFirst(selectors, description) {
        for (const sel of selectors) {
          try {
            const el = page.locator(sel);
            if (await el.count() > 0) {
              await el.first().click({ button: 'right' });
              return true;
            }
          } catch {}
        }
        return false;
      }

      // Right-click the meal category
      const mealClicked = await rightClickFirst([
        'text="' + mealLabel + '"',
        ':has-text("' + mealLabel + '")',
      ], 'meal category');
      if (!mealClicked) {
        return { success: false, error: 'Food created but could not find meal category "' + mealLabel + '" in diary' };
      }
      await page.waitForSelector('text="Add Food..."', { timeout: 3000 }).catch(() =>
        page.waitForSelector('text="Add Food"', { timeout: 2000 }).catch(() => {})
      );

      // Click "Add Food..." in context menu
      const addFoodClicked = await clickFirst([
        'text="Add Food..."',
        'text="Add Food\u2026"',
        'text="Add Food"',
        '[role="menuitem"]:has-text("Add Food")',
      ], 'Add Food menu item');
      if (!addFoodClicked) {
        return { success: false, error: 'Food created but could not find "Add Food" in context menu' };
      }
      await page.waitForTimeout(200);

      // Wait for "Add Food to Diary" dialog
      try {
        await page.waitForSelector('text="Add Food to Diary"', { timeout: 5000 });
      } catch {
        return { success: false, error: 'Food created but Add Food to Diary dialog did not appear' };
      }
      await page.waitForTimeout(300);

      // Search for the just-created food
      const searchSelectors = [
        'input[placeholder*="Search all foods" i]',
        'input[placeholder*="Search" i]',
        'input[placeholder*="food" i]',
        'input.gwt-TextBox',
        'input[type="text"]',
        'input[type="search"]',
      ];
      let searched = false;
      for (const sel of searchSelectors) {
        try {
          const el = page.locator(sel);
          if (await el.count() > 0) {
            await el.first().click();
            await page.waitForTimeout(200);
            await el.first().fill('');
            await page.keyboard.type(foodName, { delay: 50 });
            searched = true;
            break;
          }
        } catch {}
      }
      if (!searched) {
        return { success: false, error: 'Food created but could not find search bar in Add Food dialog' };
      }
      await page.waitForTimeout(300);

      // Click SEARCH
      await clickFirst([
        'text="SEARCH"',
        'button:has-text("SEARCH")',
        'button:has-text("Search")',
      ], 'SEARCH button');
      await page.waitForSelector('td:has-text("' + foodName + '")', { timeout: 8000 }).catch(() => {});

      // Select the search result
      const resultSelectors = [
        'td:has-text("' + foodName + '")',
        'tr:has-text("' + foodName + '") td',
        '.gwt-HTML:has-text("' + foodName + '")',
        'div:has-text("' + foodName + '"):not(:has(input))',
      ];
      let resultClicked = false;
      for (const sel of resultSelectors) {
        try {
          const el = page.locator(sel);
          if (await el.count() > 0) {
            await el.first().click();
            resultClicked = true;
            break;
          }
        } catch {}
      }
      if (!resultClicked) {
        return { success: false, error: 'Food created but no search result found for "' + foodName + '"' };
      }
      await page.waitForTimeout(200);

      // Wait for serving size panel
      try {
        await page.waitForSelector('text="Serving Size"', { timeout: 5000 });
      } catch {
        return { success: false, error: 'Food created but Serving Size panel did not appear' };
      }
      await page.waitForTimeout(500);

      // Click "ADD TO DIARY"
      const addClicked = await clickFirst([
        'button:has-text("ADD TO DIARY")',
        'button:has-text("Add to Diary")',
        'text="ADD TO DIARY"',
        'text="Add to Diary"',
        'button[type="submit"]',
      ], 'ADD TO DIARY button');
      if (!addClicked) {
        return { success: false, error: 'Food created but could not find "Add to Diary" button' };
      }
      await page.waitForSelector('text="Add Food to Diary"', { state: 'hidden', timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
    }

    return { success: true };
  `;
}
