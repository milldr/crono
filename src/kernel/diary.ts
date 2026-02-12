/**
 * Playwright code generator for Cronometer diary nutrition scraping.
 *
 * Returns a code string that executes remotely via
 * kernel.browsers.playwright.execute(). The code has access to
 * `page`, `context`, and `browser` from the Playwright environment.
 */

/**
 * Generate Playwright code for reading nutrition data from Cronometer.
 *
 * For each date, the flow is:
 *   navigate to diary → set date via prev/next arrows → read nutrition totals
 *
 * Cronometer diary layout (energy summary):
 *   Each meal category shows a summary like:
 *   "302 kcal • 1 g protein • 8 g carbs • 0 g fat"
 *   The daily totals are in the Energy Summary section.
 *
 * Returns { success: true, entries: [{ date, calories, protein, carbs, fat }] }
 */
export function buildDiaryCode(dates: string[]): string {
  const datesJson = JSON.stringify(dates);

  return `
    const dates = ${datesJson};
    const entries = [];

    // Navigate to diary — we're already logged in from the same session
    await page.goto('https://cronometer.com/#diary', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Verify we're logged in
    const url = page.url();
    if (url.includes('/login') || url.includes('/signin')) {
      return { success: false, error: 'Not logged in. Login may have failed.' };
    }

    // Wait for the diary to fully render
    await page.waitForTimeout(2000);

    // Helper: click the previous-day arrow.
    // Cronometer diary uses <i> icon-font elements for date nav:
    //   <i class="icon-chevron-left diary-date-previous">
    //   <i class="icon-chevron-right diary-date-next">
    async function clickPrevDay() {
      const prev = page.locator('i.diary-date-previous').filter({ visible: true });
      if (await prev.count() > 0) {
        await prev.first().click();
        await page.waitForTimeout(2000);
        return true;
      }
      return false;
    }

    // Helper: click the next-day arrow
    async function clickNextDay() {
      const next = page.locator('i.diary-date-next').filter({ visible: true });
      if (await next.count() > 0) {
        await next.first().click();
        await page.waitForTimeout(2000);
        return true;
      }
      return false;
    }

    // Helper: extract nutrition totals from the currently displayed diary page.
    // Cronometer shows per-meal summary lines like:
    //   "302 kcal • 1 g protein • 8 g carbs • 0 g fat"
    // and an Energy Summary section with daily totals.
    async function extractNutrition() {
      return await page.evaluate(() => {
        const bodyText = document.body.innerText;

        // Strategy 1: Look for the Energy Summary totals.
        // Cronometer shows "Energy X kcal" or "X kcal" in the totals row.
        // Also look for individual macros in the totals section.
        let calories = 0;
        let protein = 0;
        let carbs = 0;
        let fat = 0;
        let found = false;

        // Strategy 2: Sum all meal category summary lines.
        // Each line matches: "N kcal • N g protein • N g carbs • N g fat"
        const mealPattern = /(\\d+\\.?\\d*)\\s*kcal\\s*[•·]\\s*(\\d+\\.?\\d*)\\s*g\\s*protein\\s*[•·]\\s*(\\d+\\.?\\d*)\\s*g\\s*carbs\\s*[•·]\\s*(\\d+\\.?\\d*)\\s*g\\s*fat/gi;
        let match;
        while ((match = mealPattern.exec(bodyText)) !== null) {
          calories += parseFloat(match[1]);
          protein += parseFloat(match[2]);
          carbs += parseFloat(match[3]);
          fat += parseFloat(match[4]);
          found = true;
        }

        if (found) {
          return {
            calories: Math.round(calories),
            protein: Math.round(protein),
            carbs: Math.round(carbs),
            fat: Math.round(fat),
          };
        }

        // Strategy 3: Look for individual nutrient totals in the page.
        // Cronometer may display "Energy  1847 kcal" and "Protein  168 g" etc.
        const calMatch = bodyText.match(/Energy\\s+(\\d+\\.?\\d*)\\s*kcal/i);
        const protMatch = bodyText.match(/Protein\\s+(\\d+\\.?\\d*)\\s*g/i);
        const carbMatch = bodyText.match(/Carbs\\s+(\\d+\\.?\\d*)\\s*g/i);
        const fatMatch = bodyText.match(/Fat\\s+(\\d+\\.?\\d*)\\s*g/i);

        if (calMatch || protMatch || carbMatch || fatMatch) {
          return {
            calories: calMatch ? Math.round(parseFloat(calMatch[1])) : 0,
            protein: protMatch ? Math.round(parseFloat(protMatch[1])) : 0,
            carbs: carbMatch ? Math.round(parseFloat(carbMatch[1])) : 0,
            fat: fatMatch ? Math.round(parseFloat(fatMatch[1])) : 0,
          };
        }

        // No nutrition data found — empty diary day
        return { calories: 0, protein: 0, carbs: 0, fat: 0 };
      });
    }

    // Diary opens to today. Dates are in descending order (most recent first).
    // Calculate how many days back from today to the first requested date,
    // then step one day back for each subsequent date.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const targetDate = dates[i];

      if (i === 0) {
        // Navigate from today to the first (most recent) requested date
        const target = new Date(targetDate + 'T00:00:00');
        const daysBack = Math.round((today - target) / (1000 * 60 * 60 * 24));
        for (let s = 0; s < daysBack && s < 90; s++) {
          await clickPrevDay();
        }
      } else {
        // Step backward one day from previous date
        await clickPrevDay();
      }

      try {
        const data = await extractNutrition();
        entries.push({ date: targetDate, calories: data.calories, protein: data.protein, carbs: data.carbs, fat: data.fat });
      } catch {
        entries.push({ date: targetDate, calories: 0, protein: 0, carbs: 0, fat: 0 });
      }
    }

    return { success: true, entries };
  `;
}
