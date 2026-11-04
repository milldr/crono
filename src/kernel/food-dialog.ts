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
  /**
   * After adding, fail unless the food's diary entry count increased. Guards
   * against edits landing on an existing entry. (The pre-add count is always
   * taken so dialog retries never duplicate an entry.)
   */
  verifyNewEntry?: boolean;
}

/** How many times to re-open the Add Food dialog if it closes or stalls. */
export const ADD_FOOD_DIALOG_ATTEMPTS = 3;
/** How long to wait for the selected food's details to load in the dialog. */
export const DETAILS_LOAD_TIMEOUT_MS = 10000;
/** How long the dialog must stay gone before it is treated as closed. */
export const DIALOG_CLOSED_GRACE_MS = 1500;
/** How long to wait for a newly added entry to render in the diary. */
export const NEW_ENTRY_TIMEOUT_MS = 10000;

/**
 * In-page helper that locates the visible "Add Food to Diary" dialog root.
 * Interpolated into every page.evaluate() that touches dialog controls so
 * serving-size inputs and the "Add to Diary" button are never resolved
 * against the diary behind the dialog (which would edit an existing entry).
 */
const FIND_ADD_FOOD_DIALOG = `
          const isShown = (el) => !!el && el.getClientRects().length > 0;
          const findAddFoodDialog = () => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
              acceptNode: (node) =>
                node.textContent && node.textContent.trim() === 'Add Food to Diary'
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_REJECT,
            });
            let node;
            while ((node = walker.nextNode())) {
              const title = node.parentElement;
              if (!isShown(title)) continue;
              const root = title.closest('.gwt-DialogBox, .gwt-PopupPanel, .gwt-DecoratedPopupPanel, [role="dialog"]');
              if (root) return root;
              let el = title.parentElement;
              for (let i = 0; i < 8 && el && el !== document.body; i++) {
                if (el.querySelector('input')) return el;
                el = el.parentElement;
              }
            }
            return null;
          };`;

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
  const verifyNewEntry = options.verifyNewEntry ?? false;
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

  const dialogClosedError = `'${errorPrefix}Add Food dialog closed before details loaded after selecting "' + ${foodNameVar} + '"'`;

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

    // Helper: report whether the Add Food dialog is closed, still loading the
    // selected food's details, or ready for an amount to be entered.
    async function probeAddFoodDialog(requireServingSize) {
      return page.evaluate(({ requireServingSize }) => {
${FIND_ADD_FOOD_DIALOG}
          const dialog = findAddFoodDialog();
          if (!dialog) return 'closed';
          const hasServingInput = Array.from(dialog.querySelectorAll('*')).some((el) =>
            el.children.length === 0 &&
            el.textContent && el.textContent.trim() === 'Serving Size' &&
            isShown(el) &&
            (() => {
              let container = el.parentElement;
              for (let i = 0; i < 5 && container && dialog.contains(container); i++) {
                const input = container.querySelector('input');
                if (input && isShown(input)) return true;
                container = container.parentElement;
              }
              return false;
            })()
          );
          const hasAddButton = Array.from(dialog.querySelectorAll('button')).some((btn) =>
            btn.textContent && btn.textContent.trim().toLowerCase() === 'add to diary' && isShown(btn)
          );
          if (requireServingSize ? hasServingInput : hasAddButton) return 'ready';
          return 'loading';
      }, { op: 'probeAddFoodDialog', requireServingSize });
    }

    // Helper: wait until the selected food's details have loaded in the dialog.
    // GWT can briefly re-render the dialog, so it only counts as closed after
    // staying gone for a grace period.
    async function waitForFoodDetails(requireServingSize) {
      const deadline = Date.now() + ${DETAILS_LOAD_TIMEOUT_MS};
      let closedSince = null;
      while (true) {
        const state = await probeAddFoodDialog(requireServingSize);
        if (state === 'ready') return 'ready';
        if (state === 'closed') {
          if (closedSince === null) closedSince = Date.now();
          if (Date.now() - closedSince >= ${DIALOG_CLOSED_GRACE_MS}) return 'closed';
        } else {
          closedSince = null;
        }
        if (Date.now() >= deadline) return state;
        await page.waitForTimeout(250);
      }
    }
${buildCountDiaryEntriesCode()}
    // Snapshot existing entries so a retry never re-adds a food that an early
    // dialog close already logged
    const entriesBefore = await countDiaryEntries(${foodNameVar});
    console.log('[crono food-dialog] existing diary entries for ' + ${foodNameVar} + ': ' + entriesBefore);
    let detailsLoaded = false;
    let dialogError = '';
    for (let dialogAttempt = 0; dialogAttempt < ${ADD_FOOD_DIALOG_ATTEMPTS} && !detailsLoaded; dialogAttempt++) {
      if (dialogAttempt > 0) {
        console.log('[crono food-dialog] retrying Add Food dialog (attempt ' + (dialogAttempt + 1) + ') after: ' + dialogError);
        // Close any half-open dialog and clear diary selection before re-opening
        await page.keyboard.press('Escape');
        await page.waitForSelector('text="Add Food to Diary"', { state: 'hidden', timeout: 3000 })
          .then(() => true).catch(() => false);
        await page.mouse.click(1, 1);
        await page.waitForTimeout(1500);
        // If the early close logged the food anyway, re-adding would duplicate it
        const entriesNow = await countDiaryEntries(${foodNameVar});
        if (entriesNow !== entriesBefore) {
          return { success: false, error: '${errorPrefix}Add Food dialog closed early and the diary changed for "' + ${foodNameVar} + '" (' + entriesBefore + ' -> ' + entriesNow + ' entries); not retrying to avoid a duplicate' };
        }
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
      const dialogAppeared = await page.waitForSelector('text="Add Food to Diary"', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!dialogAppeared) {
        dialogError = '${errorPrefix}Add Food to Diary dialog did not appear';
        continue;
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
        dialogError = '${searchBarError}';
        continue;
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

      // Wait for the selected food's details (serving size) to load inside the
      // dialog before entering any amount; re-open and re-select if it closes.
      const detailsState = await waitForFoodDetails(${requireServingSize});
      if (detailsState === 'ready') {
        detailsLoaded = true;
      } else if (detailsState === 'closed') {
        dialogError = ${dialogClosedError};
      } else {
        dialogError = '${errorPrefix}Add Food dialog details did not load after selecting "' + ${foodNameVar} + '"';
      }
    }
    if (!detailsLoaded) {
      return { success: false, error: dialogError + ' (after ${ADD_FOOD_DIALOG_ATTEMPTS} attempts)' };
    }
    console.log('[crono food-dialog] selected search result and dialog stayed open: ' + ${foodNameVar});

${buildServingSizeCode({ errorPrefix, foodNameVar, itemNameVar, requireServingSize, servingCountVar, alwaysUpdateServingSize, updateServingSize })}

    // Click "Add to Diary" button - wait for panel to render, then find the
    // button inside the Add Food dialog only
    await page.waitForTimeout(2000);

    const buttonClicked = await page.evaluate(() => {
${FIND_ADD_FOOD_DIALOG}
      const dialog = findAddFoodDialog();
      if (!dialog) return false;
      const buttons = dialog.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent && btn.textContent.trim().toLowerCase() === 'add to diary' && isShown(btn) && !btn.disabled) {
          btn.click();
          return true;
        }
      }
      return false;
    }, { op: 'clickAddToDiary' });

    if (!buttonClicked) {
      return { success: false, error: ${addToDiaryErrorCode} };
    }
    console.log('[crono food-dialog] clicked Add to Diary for: ' + ${itemNameVar});
${buildDialogDismissedCode({ itemNameVar, verifyDialogDismissed })}
${verifyNewEntry ? buildVerifyNewEntryCode({ errorPrefix, foodNameVar, itemNameVar }) : ""}
  `;
}

/**
 * In-page diary entry counter. Counts visible elements outside the Add Food
 * dialog that directly hold a text node exactly matching the food name, which
 * is independent of how Cronometer lays out diary rows. Only the delta matters.
 */
function buildCountDiaryEntriesCode(): string {
  return `
    async function countDiaryEntries(name) {
      return page.evaluate(({ name }) => {
${FIND_ADD_FOOD_DIALOG}
          const dialog = findAddFoodDialog();
          const matches = new Set();
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) =>
              node.textContent && node.textContent.trim() === name
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT,
          });
          let node;
          while ((node = walker.nextNode())) {
            const el = node.parentElement;
            if (!el || (dialog && dialog.contains(el)) || !isShown(el)) continue;
            matches.add(el);
          }
          return matches.size;
      }, { op: 'countDiaryEntries', name });
    }
`;
}

function buildVerifyNewEntryCode(options: {
  errorPrefix: string;
  foodNameVar: string;
  itemNameVar: string;
}): string {
  return `
    // Confirm a NEW entry was created rather than an existing one being edited
    const entryDeadline = Date.now() + ${NEW_ENTRY_TIMEOUT_MS};
    let entriesAfter = await countDiaryEntries(${options.foodNameVar});
    while (entriesAfter <= entriesBefore && Date.now() < entryDeadline) {
      await page.waitForTimeout(500);
      entriesAfter = await countDiaryEntries(${options.foodNameVar});
    }
    if (entriesAfter <= entriesBefore) {
      return { success: false, error: '${options.errorPrefix}Add to Diary did not create a new "' + ${options.foodNameVar} + '" entry for ' + ${options.itemNameVar} + ' (' + entriesBefore + ' before, ' + entriesAfter + ' after); an existing entry may have been modified' };
    }
    console.log('[crono food-dialog] new diary entry confirmed for ' + ${options.itemNameVar} + ' (' + entriesBefore + ' -> ' + entriesAfter + ')');
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
        servingFilled = await page.evaluate(({ count }) => {
${FIND_ADD_FOOD_DIALOG}
          // Only ever edit the Add Food dialog's serving input, never a diary entry
          const dialog = findAddFoodDialog();
          if (!dialog) return false;
          const walker = document.createTreeWalker(
            dialog,
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
          for (let i = 0; i < 5 && container && dialog.contains(container); i++) {
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
        }, { op: 'fillServingSize', count: ${options.servingCountVar} });
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
