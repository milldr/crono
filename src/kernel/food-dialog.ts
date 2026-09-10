export interface FoodDialogOptions {
  foodNameVar?: string;
  mealLabelVar?: string;
  errorPrefix?: string;
  itemNameVar?: string;
  requireServingSize?: boolean;
  servingCountVar?: string;
  alwaysUpdateServingSize?: boolean;
  updateServingSize?: boolean;
  verifyDialogDismissed?: boolean;
}

export function buildFoodDialogCode(options: FoodDialogOptions = {}): string {
  const foodNameVar = options.foodNameVar ?? "foodName";
  const mealLabelVar = options.mealLabelVar ?? "mealLabel";
  const errorPrefix = options.errorPrefix ?? "";
  const itemNameVar = options.itemNameVar ?? foodNameVar;
  const requireServingSize = options.requireServingSize ?? true;
  const servingCountVar = options.servingCountVar ?? "servingCount";
  const alwaysUpdateServingSize = options.alwaysUpdateServingSize ?? false;
  const updateServingSize = options.updateServingSize ?? false;
  const verifyDialogDismissed = options.verifyDialogDismissed ?? false;
  const mealCategoryError = errorPrefix
    ? `${errorPrefix}could not find meal category "`
    : 'Could not find meal category "';
  const contextMenuError = errorPrefix
    ? `${errorPrefix}context menu did not appear after right-clicking "`
    : 'Context menu did not appear after right-clicking "';
  const addFoodError = errorPrefix
    ? `${errorPrefix}could not find "Add Food" in context menu`
    : 'Could not find "Add Food" in context menu';
  const searchBarError = errorPrefix
    ? `${errorPrefix}could not find food search bar in Add Food dialog`
    : "Could not find food search bar in Add Food dialog";
  const noFoodError = errorPrefix
    ? `${errorPrefix}no food found matching "`
    : 'No food found matching "';
  const noExactResultError = errorPrefix
    ? `${errorPrefix}no exact search result found for "`
    : 'No exact search result found for "';
  const addToDiaryError = errorPrefix
    ? `${errorPrefix}could not find "Add to Diary" button`
    : 'Could not find "Add to Diary" button';
  const addToDiaryErrorCode =
    itemNameVar === foodNameVar
      ? `'${addToDiaryError}'`
      : `'${addToDiaryError} for "' + ${itemNameVar} + '"'`;

  return `
    // Helper: right-click an element from a list of selectors
    async function rightClickFirst(selectors, description) {
      for (const sel of selectors) {
        try {
          const el = page.locator(sel).filter({ visible: true });
          if (await el.count() > 0) {
            await el.first().click({ button: 'right', timeout: 5000 });
            return true;
          }
        } catch {}
      }
      return false;
    }

    // Right-click meal category with retry (GWT context menus can be flaky
    // and meal labels may not render immediately)
    let menuVisible = false;
    for (let attempt = 0; attempt < 3 && !menuVisible; attempt++) {
      if (attempt > 0) {
        await page.keyboard.press('Escape');
        await page.mouse.click(1, 1);
        await page.waitForTimeout(2000);
      }
      const clicked = await rightClickFirst([
        'td:text("' + ${mealLabelVar} + '")',
        'div:text("' + ${mealLabelVar} + '")',
        'text="' + ${mealLabelVar} + '"',
      ], 'meal category');
      if (!clicked) {
        if (attempt < 2) {
          await page.waitForTimeout(2000);
          continue;
        }
        return { success: false, error: '${mealCategoryError}' + ${mealLabelVar} + '" in diary' };
      }
      menuVisible = await page.waitForSelector('text="Add Food..."', { timeout: 3000 })
        .then(() => true)
        .catch(() => page.waitForSelector('text="Add Food"', { timeout: 2000 }).then(() => true).catch(() => false));
    }
    if (!menuVisible) {
      return { success: false, error: '${contextMenuError}' + ${mealLabelVar} + '"' };
    }

    // Click "Add Food..." in context menu
    const addFoodClicked = await clickFirst([
      'text="Add Food..."',
      'text="Add Food\\u2026"',
      'text="Add Food"',
      '[role="menuitem"]:has-text("Add Food")',
    ], 'Add Food menu item');
    if (!addFoodClicked) {
      return { success: false, error: '${addFoodError}' };
    }
    await page.waitForTimeout(200);

    // Wait for "Add Food to Diary" dialog
    try {
      await page.waitForSelector('text="Add Food to Diary"', { timeout: 5000 });
    } catch {
      return { success: false, error: '${errorPrefix}Add Food to Diary dialog did not appear' };
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
        const el = page.locator(sel).filter({ visible: true });
        if (await el.count() > 0) {
          await el.first().click({ timeout: 3000 });
          await page.waitForTimeout(200);
          await el.first().fill('', { timeout: 3000 });
          await page.keyboard.type(${foodNameVar}, { delay: 50 });
          searched = true;
          break;
        }
      } catch {}
    }
    if (!searched) {
      return { success: false, error: '${searchBarError}' };
    }
    await page.waitForTimeout(300);

    // Click SEARCH
    await clickFirst([
      'button:has-text("SEARCH")',
      'button:has-text("Search")',
      'text="SEARCH"',
    ], 'SEARCH button');

    // Wait for search results to appear
    const resultsAppeared = await page.getByText(${foodNameVar}, { exact: true })
      .filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (!resultsAppeared) {
      return { success: false, error: '${noFoodError}' + ${foodNameVar} + '"' };
    }
    await page.waitForTimeout(2000);

    // Select the first visible result row whose Description cell exactly
    // matches the requested food. Cronometer renders duplicate result rows, so
    // iterate them and click the first good row. Only consider rows with exactly
    // 2 cells (Description + Source columns in search results), not diary entry
    // rows (8+ cells). We scan ALL <tr> elements because the search results table
    // is distinct from the diary table shown in the background.
    const allRows = page.locator('tr');
    let resultClicked = false;
    const allRowCount = await allRows.count();
    console.log('[crono food-dialog] scanning ' + allRowCount + ' total rows');

    for (let i = 0; i < allRowCount; i++) {
      const row = allRows.nth(i);
      const visible = await row.isVisible().catch(() => false);
      if (!visible) continue;

      // Only consider rows with exactly 2 cells (search results table)
      const cellCount = await row.locator('td').count();
      if (cellCount !== 2) continue;

      const description = (await row.locator('td').first().textContent().catch(() => '') || '').trim();
      if (description !== ${foodNameVar}) continue;

      console.log('[crono food-dialog] found matching search result at row ' + i + ': ' + description);
      // GWT rows don't respond to click(), need to focus and press Enter
      await row.focus({ timeout: 3000 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      resultClicked = true;
      break;
    }

    if (!resultClicked) {
      return { success: false, error: '${noExactResultError}' + ${foodNameVar} + '"' };
    }
    await page.waitForTimeout(1000);

    const dialogStillOpen = await page.waitForSelector('text="Add Food to Diary"', { timeout: 1000 })
      .then(() => true)
      .catch(() => false);
    if (!dialogStillOpen) {
      return { success: false, error: 'Add Food dialog closed before details loaded after selecting "' + ${foodNameVar} + '"' };
    }
    console.log('[crono food-dialog] selected search result and dialog stayed open: ' + ${foodNameVar});

${buildServingSizeCode({ errorPrefix, foodNameVar, itemNameVar, requireServingSize, servingCountVar, alwaysUpdateServingSize, updateServingSize })}

    // Click "Add to Diary" button - wait for panel to render, then find button using evaluate
    await page.waitForTimeout(2000);

    // Find and click the button using page.evaluate
    const buttonClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent && btn.textContent.trim() === 'Add to Diary' && btn.offsetParent !== null) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (!buttonClicked) {
      return { success: false, error: ${addToDiaryErrorCode} };
    }
    console.log('[crono food-dialog] found and clicked Add to Diary button for: ' + ${itemNameVar});
    console.log('[crono food-dialog] clicked Add to Diary for: ' + ${itemNameVar});
${buildDialogDismissedCode({ itemNameVar, verifyDialogDismissed })}
  `;
}

function buildServingSizeCode(options: {
  errorPrefix: string;
  foodNameVar: string;
  itemNameVar: string;
  requireServingSize: boolean;
  servingCountVar: string;
  alwaysUpdateServingSize: boolean;
  updateServingSize: boolean;
}): string {
  const servingCondition = options.alwaysUpdateServingSize
    ? "true"
    : `${options.servingCountVar} !== 1`;

  const requireBlock = options.requireServingSize
    ? `
    // Wait for the detail panel with serving size
    try {
      await page.waitForSelector('text="Serving Size"', { timeout: 5000 });
      console.log('[crono food-dialog] found Serving Size panel for: ' + ${options.itemNameVar});
    } catch {
      return { success: false, error: '${options.errorPrefix}Serving Size panel did not appear for "' + ${options.itemNameVar} + '"' };
    }
    await page.waitForTimeout(500);
`
    : "";

  if (!options.updateServingSize) {
    return requireBlock;
  }

  return `${requireBlock}
    // If needed, update the serving size input
    if (${servingCondition}) {
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
        }, ${options.servingCountVar});
      } catch {}

      if (!servingFilled) {
        return { success: false, error: '${options.errorPrefix}could not update serving size for "' + ${options.itemNameVar} + '"' };
      }
      console.log('[crono food-dialog] updated serving size for: ' + ${options.itemNameVar});
      await page.waitForTimeout(500);
    }
`;
}

function buildDialogDismissedCode(options: {
  itemNameVar: string;
  verifyDialogDismissed: boolean;
}): string {
  if (!options.verifyDialogDismissed) {
    return `
    await page.waitForSelector('text="Add Food to Diary"', { state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
`;
  }

  return `
    const dialogDismissed = await page.waitForSelector('text="Add Food to Diary"', { state: 'hidden', timeout: 8000 })
      .then(() => true).catch(() => false);
    if (!dialogDismissed) {
      return { success: false, error: '"Add Food to Diary" dialog did not close after adding "' + ${options.itemNameVar} + '"' };
    }
    await page.waitForTimeout(500);
`;
}
