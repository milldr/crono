/**
 * Playwright code generator for Cronometer food logging.
 *
 * Returns a code string that executes remotely via
 * kernel.browsers.playwright.execute(). The code has access to
 * `page`, `context`, and `browser` from the Playwright environment.
 */

import type { LogFoodEntry } from "./client.js";

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

    // Right-click the meal category
    const clicked = await rightClickFirst([
      'text="' + mealLabel + '"',
      ':has-text("' + mealLabel + '")',
    ], 'meal category');
    if (!clicked) {
      return { success: false, error: 'Could not find meal category "' + mealLabel + '" in diary' };
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
      return { success: false, error: 'Could not find "Add Food" in context menu' };
    }
    await page.waitForTimeout(200);

    // Wait for "Add Food to Diary" dialog
    try {
      await page.waitForSelector('text="Add Food to Diary"', { timeout: 5000 });
    } catch {
      return { success: false, error: 'Add Food to Diary dialog did not appear' };
    }
    await page.waitForTimeout(300);

    // Search for the food
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
      return { success: false, error: 'Could not find food search bar in Add Food dialog' };
    }
    await page.waitForTimeout(300);

    // Click SEARCH
    await clickFirst([
      'text="SEARCH"',
      'button:has-text("SEARCH")',
      'button:has-text("Search")',
    ], 'SEARCH button');

    // Wait for results
    try {
      await page.waitForSelector('td:has-text("' + foodName + '")', { timeout: 8000 });
    } catch {
      return { success: false, error: 'No food found matching "' + foodName + '"' };
    }

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
      return { success: false, error: 'No food found matching "' + foodName + '"' };
    }
    await page.waitForTimeout(200);

    // Wait for the detail panel with serving size
    try {
      await page.waitForSelector('text="Serving Size"', { timeout: 5000 });
    } catch {
      return { success: false, error: 'Serving Size panel did not appear for "' + foodName + '"' };
    }
    await page.waitForTimeout(500);

    // If servings != 1, update the serving size input
    if (servingCount !== 1) {
      let servingFilled = false;
      try {
        servingFilled = await page.evaluate((count) => {
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

          let container = textNode.parentElement;
          for (let i = 0; i < 5 && container; i++) {
            const input = container.querySelector('input');
            if (input) {
              input.focus();
              input.select();
              const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
              ).set;
              nativeSetter.call(input, String(count));
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
            container = container.parentElement;
          }
          return false;
        }, servingCount);
      } catch {}

      if (!servingFilled) {
        return { success: false, error: 'Could not update serving size for "' + foodName + '"' };
      }
      await page.waitForTimeout(500);
    }

    // Click "ADD TO DIARY"
    const addClicked = await clickFirst([
      'button:has-text("ADD TO DIARY")',
      'button:has-text("Add to Diary")',
      'text="ADD TO DIARY"',
      'text="Add to Diary"',
      'button[type="submit"]',
    ], 'ADD TO DIARY button');
    if (!addClicked) {
      return { success: false, error: 'Could not find "Add to Diary" button' };
    }
    await page.waitForSelector('text="Add Food to Diary"', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);

    return { success: true };
  `;
}
