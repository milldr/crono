/**
 * Playwright code generator for Cronometer quick-add automation.
 *
 * Returns a code string that executes remotely via
 * kernel.browsers.playwright.execute(). The code has access to
 * `page`, `context`, and `browser` from the Playwright environment.
 */

import type { MacroEntry } from "./client.js";

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
            await el.first().click();
            return true;
          }
        } catch {}
      }
      return false;
    }

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

    // Add each macro as a separate food entry
    for (const macro of macros) {
      // Right-click the meal category
      const clicked = await rightClickFirst([
        'text="' + mealLabel + '"',
        ':has-text("' + mealLabel + '")',
      ]);
      if (!clicked) {
        return { success: false, error: 'Could not find meal category "' + mealLabel + '" in diary' };
      }
      await page.waitForSelector('text="Add Food..."', { timeout: 3000 }).catch(() =>
        page.waitForSelector('text="Add Food"', { timeout: 2000 }).catch(() => {})
      );

      // Click "Add Food..." in context menu
      const addFoodClicked = await clickFirst([
        'text="Add Food..."',
        'text="Add Food…"',
        'text="Add Food"',
        '[role="menuitem"]:has-text("Add Food")',
      ]);
      if (!addFoodClicked) {
        return { success: false, error: 'Could not find "Add Food" in context menu' };
      }
      await page.waitForTimeout(200);

      // Wait for the "Add Food to Diary" dialog to appear
      try {
        await page.waitForSelector('text="Add Food to Diary"', { timeout: 5000 });
      } catch {
        return { success: false, error: 'Add Food to Diary dialog did not appear' };
      }
      await page.waitForTimeout(300);

      // Click the search bar and type the search term
      // GWT apps often need click + keyboard.type instead of fill()
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
            // Clear any existing text, then type via keyboard for GWT compatibility
            await el.first().fill('');
            await page.keyboard.type(macro.searchName, { delay: 50 });
            searched = true;
            break;
          }
        } catch {}
      }
      if (!searched) {
        return { success: false, error: 'Could not find food search bar in Add Food dialog' };
      }
      await page.waitForTimeout(300);

      // Click the SEARCH button to trigger results
      await clickFirst([
        'text="SEARCH"',
        'button:has-text("SEARCH")',
        'button:has-text("Search")',
      ]);
      await page.waitForSelector('td:has-text("' + macro.searchName + '")', { timeout: 8000 }).catch(() => {});

      // Select the search result row (not the search input)
      // Target table rows/cells containing the macro name
      const resultSelectors = [
        'td:has-text("' + macro.searchName + '")',
        'tr:has-text("' + macro.searchName + '") td',
        '.gwt-HTML:has-text("' + macro.searchName + '")',
        'div:has-text("' + macro.searchName + '"):not(:has(input))',
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
        return { success: false, error: 'No search result found for "' + macro.searchName + '"' };
      }
      await page.waitForTimeout(200);

      // Wait for the detail panel with serving size to appear
      try {
        await page.waitForSelector('text="Serving Size"', { timeout: 5000 });
      } catch {
        return { success: false, error: 'Serving Size panel did not appear for "' + macro.name + '"' };
      }
      await page.waitForTimeout(500);

      // Enter the serving size (grams)
      // Find the input by locating the "Serving Size" label's parent and
      // then finding the input within it via page.evaluate()
      let servingFilled = false;
      try {
        servingFilled = await page.evaluate((grams) => {
          // Walk all elements containing "Serving Size" text
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            { acceptNode: (node) =>
              node.textContent && node.textContent.trim() === 'Serving Size'
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT
            }
          );
          const textNode = walker.nextNode();
          if (!textNode) return false;

          // Walk up to find a container that also has an input
          let container = textNode.parentElement;
          for (let i = 0; i < 5 && container; i++) {
            const input = container.querySelector('input');
            if (input) {
              input.focus();
              input.select();
              // Use native input setter to trigger GWT's change detection
              const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
              ).set;
              nativeSetter.call(input, String(grams));
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
            container = container.parentElement;
          }
          return false;
        }, macro.grams);
      } catch {}

      if (!servingFilled) {
        return { success: false, error: 'Could not find serving size input for "' + macro.name + '"' };
      }
      await page.waitForTimeout(500);

      // Click "ADD TO DIARY"
      const addClicked = await clickFirst([
        'button:has-text("ADD TO DIARY")',
        'button:has-text("Add to Diary")',
        'text="ADD TO DIARY"',
        'text="Add to Diary"',
        'button[type="submit"]',
      ]);
      if (!addClicked) {
        return { success: false, error: 'Could not find "Add to Diary" button for "' + macro.name + '"' };
      }
      await page.waitForSelector('text="Add Food to Diary"', { state: 'hidden', timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
    }

    return { success: true };
  `;
}
