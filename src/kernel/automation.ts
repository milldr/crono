/**
 * Playwright code generators for Cronometer browser automation.
 *
 * These functions return code strings that execute remotely via
 * kernel.browsers.playwright.execute(). The code has access to
 * `page`, `context`, and `browser` from the Playwright environment.
 */

import type { MacroEntry } from "./client.js";

/**
 * Cronometer DOM selectors with fallback alternatives.
 * Primary selectors are best guesses; fallbacks try common patterns.
 */
export const SELECTORS = {
  addFoodButton: {
    primary: 'button[aria-label="Add Food"]',
    fallbacks: [
      'button:has-text("Add Food")',
      ".add-food-btn",
      "#add-food-button",
    ],
  },
  quickAddTab: {
    primary: '[data-tab="quick-add"]',
    fallbacks: [
      'text="Quick Add"',
      '[role="tab"]:has-text("Quick Add")',
      ".quick-add-tab",
    ],
  },
  proteinInput: {
    primary: 'input[name="protein"]',
    fallbacks: [
      'input[placeholder*="Protein" i]',
      'label:has-text("Protein") + input',
      "#protein",
    ],
  },
  carbsInput: {
    primary: 'input[name="carbs"]',
    fallbacks: [
      'input[placeholder*="Carb" i]',
      'label:has-text("Carbs") + input',
      "#carbs",
    ],
  },
  fatInput: {
    primary: 'input[name="fat"]',
    fallbacks: [
      'input[placeholder*="Fat" i]',
      'label:has-text("Fat") + input',
      "#fat",
    ],
  },
  mealDropdown: {
    primary: 'select[name="meal"]',
    fallbacks: [
      'select[aria-label*="Meal" i]',
      ".meal-select",
      "#meal-dropdown",
    ],
  },
  addButton: {
    primary: 'button[type="submit"]',
    fallbacks: [
      'button:has-text("Add")',
      'button:has-text("Save")',
      ".submit-btn",
    ],
  },
} as const;

/**
 * Build a selector-finding helper that tries primary + fallbacks.
 * Returns a JS snippet that defines a `findElement` helper function
 * for use inside remote Playwright code.
 */
function selectorHelper(): string {
  return `
    async function findElement(page, primary, fallbacks, description) {
      try {
        const el = page.locator(primary);
        if (await el.count() > 0) return el.first();
      } catch {}
      for (const sel of fallbacks) {
        try {
          const el = page.locator(sel);
          if (await el.count() > 0) return el.first();
        } catch {}
      }
      throw new Error('Could not find ' + description + '. Selectors may need updating.');
    }
  `;
}

/**
 * Generate code that checks if the user is logged into Cronometer.
 * Navigates to /diary and checks if we get redirected to a login page.
 */
export function buildLoginCheckCode(): string {
  return `
    await page.goto('https://cronometer.com/diary', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoggedIn = url.includes('/diary') && !url.includes('/login') && !url.includes('/signin');
    return { success: true, loggedIn: isLoggedIn, url };
  `;
}

/**
 * Generate code that navigates to cronometer.com login page.
 * Used during first-run so the user sees the login form in live view.
 */
export function buildNavigateToLoginCode(): string {
  return `
    await page.goto('https://cronometer.com/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    return { success: true };
  `;
}

/**
 * Generate Playwright code for adding a quick entry to Cronometer.
 * The code navigates to the diary, opens the quick-add form, fills
 * in macros, selects the meal, and submits.
 */
export function buildQuickAddCode(entry: MacroEntry): string {
  const { protein, carbs, fat, meal } = entry;

  // Build the selectors object inline for the remote code
  const selectorsJson = JSON.stringify(SELECTORS);

  return `
    const SELECTORS = ${selectorsJson};
    ${selectorHelper()}

    // Navigate to diary
    await page.goto('https://cronometer.com/diary', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Verify we're logged in
    const url = page.url();
    if (url.includes('/login') || url.includes('/signin')) {
      return { success: false, error: 'Not logged in. Run crono again to re-authenticate.' };
    }

    // Click "Add Food" button
    const addFoodBtn = await findElement(
      page,
      SELECTORS.addFoodButton.primary,
      SELECTORS.addFoodButton.fallbacks,
      'Add Food button'
    );
    await addFoodBtn.click();
    await page.waitForTimeout(1000);

    // Click "Quick Add" tab
    const quickAddTab = await findElement(
      page,
      SELECTORS.quickAddTab.primary,
      SELECTORS.quickAddTab.fallbacks,
      'Quick Add tab'
    );
    await quickAddTab.click();
    await page.waitForTimeout(500);

    // Fill macro fields
    ${
      protein !== undefined
        ? `
    const proteinInput = await findElement(
      page,
      SELECTORS.proteinInput.primary,
      SELECTORS.proteinInput.fallbacks,
      'Protein input'
    );
    await proteinInput.fill('${protein}');
    `
        : ""
    }

    ${
      carbs !== undefined
        ? `
    const carbsInput = await findElement(
      page,
      SELECTORS.carbsInput.primary,
      SELECTORS.carbsInput.fallbacks,
      'Carbs input'
    );
    await carbsInput.fill('${carbs}');
    `
        : ""
    }

    ${
      fat !== undefined
        ? `
    const fatInput = await findElement(
      page,
      SELECTORS.fatInput.primary,
      SELECTORS.fatInput.fallbacks,
      'Fat input'
    );
    await fatInput.fill('${fat}');
    `
        : ""
    }

    ${
      meal
        ? `
    // Select meal
    const mealDropdown = await findElement(
      page,
      SELECTORS.mealDropdown.primary,
      SELECTORS.mealDropdown.fallbacks,
      'Meal dropdown'
    );
    await mealDropdown.selectOption({ label: '${meal.charAt(0).toUpperCase() + meal.slice(1).toLowerCase()}' });
    `
        : ""
    }

    // Click submit
    const addBtn = await findElement(
      page,
      SELECTORS.addButton.primary,
      SELECTORS.addButton.fallbacks,
      'Add/Submit button'
    );
    await addBtn.click();
    await page.waitForTimeout(2000);

    return { success: true };
  `;
}
