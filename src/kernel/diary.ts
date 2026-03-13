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
 *   The Energy Summary section shows daily totals like:
 *   "Energy 1847 kcal", "Protein 168 g", "Carbs 200 g", "Fat 60 g"
 *   Per-meal summaries are also present but may include non-food rows.
 *
 * Returns { success: true, entries: [{ date, calories, protein, carbs, fat, targets? }] }
 */
export function buildDiaryCode(dates: string[], scrapeTargets = false): string {
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
    // Cronometer shows an Energy Summary section with daily totals
    // ("Energy X kcal", "Protein X g", etc.) and per-meal summary lines
    // ("302 kcal • 1 g protein • 8 g carbs • 0 g fat").
    //
    // We prefer the Energy Summary totals (Strategy 1) because the
    // per-meal summary regex can match non-food rows (exercise, targets)
    // and inflate the calorie count. See: https://github.com/milldr/crono/issues/20
    const wantTargets = ${scrapeTargets ? "true" : "false"};

    async function extractNutrition() {
      return await page.evaluate((scrapeTargets) => {
        const bodyText = document.body.innerText;

        // Strategy 1: Look for individual nutrient totals in the Energy Summary.
        // Cronometer displays "Energy  1847 kcal", "Protein  168 g", etc.
        // .match() returns the first occurrence — the daily total.
        const calMatch = bodyText.match(/Energy\\s+(\\d+\\.?\\d*)\\s*kcal/i);
        const protMatch = bodyText.match(/Protein\\s+(\\d+\\.?\\d*)\\s*g/i);
        const carbMatch = bodyText.match(/Carbs\\s+(\\d+\\.?\\d*)\\s*g/i);
        const fatMatch = bodyText.match(/Fat\\s+(\\d+\\.?\\d*)\\s*g/i);

        let result;

        if (calMatch || protMatch || carbMatch || fatMatch) {
          result = {
            calories: calMatch ? Math.round(parseFloat(calMatch[1])) : 0,
            protein: protMatch ? Math.round(parseFloat(protMatch[1])) : 0,
            carbs: carbMatch ? Math.round(parseFloat(carbMatch[1])) : 0,
            fat: fatMatch ? Math.round(parseFloat(fatMatch[1])) : 0,
          };
        } else {
          // Strategy 2 (fallback): Sum per-meal summary lines.
          // Each line matches: "N kcal • N g protein • N g carbs • N g fat"
          const mealPattern = /(\\d+\\.?\\d*)\\s*kcal\\s*[•·]\\s*(\\d+\\.?\\d*)\\s*g\\s*protein\\s*[•·]\\s*(\\d+\\.?\\d*)\\s*g\\s*carbs\\s*[•·]\\s*(\\d+\\.?\\d*)\\s*g\\s*fat/gi;
          let calories = 0;
          let protein = 0;
          let carbs = 0;
          let fat = 0;
          let found = false;
          let match;

          while ((match = mealPattern.exec(bodyText)) !== null) {
            calories += parseFloat(match[1]);
            protein += parseFloat(match[2]);
            carbs += parseFloat(match[3]);
            fat += parseFloat(match[4]);
            found = true;
          }

          if (found) {
            result = {
              calories: Math.round(calories),
              protein: Math.round(protein),
              carbs: Math.round(carbs),
              fat: Math.round(fat),
            };
          } else {
            // No nutrition data found — empty diary day
            result = { calories: 0, protein: 0, carbs: 0, fat: 0 };
          }
        }

        // Target extraction: Cronometer shows target progress in the Energy Summary
        // as "X of Y kcal" or "X / Y g" patterns, or via progress bar attributes.
        let targets = null;
        if (scrapeTargets) {
          try {
            // Pattern 1: "X of Y kcal" or "X / Y kcal" for energy target
            const calTargetMatch = bodyText.match(/of\\s+(\\d+\\.?\\d*)\\s*kcal/i)
              || bodyText.match(/\\/\\s*(\\d+\\.?\\d*)\\s*kcal/i);
            // Pattern 2: target values near nutrient labels — "Protein X g / Y g" or "X of Y g"
            const protTargetMatch = bodyText.match(/Protein[\\s\\S]*?(\\d+\\.?\\d*)\\s*g\\s*\\/\\s*(\\d+\\.?\\d*)\\s*g/i)
              || bodyText.match(/Protein[\\s\\S]*?of\\s+(\\d+\\.?\\d*)\\s*g/i);
            const carbTargetMatch = bodyText.match(/Carbs[\\s\\S]*?(\\d+\\.?\\d*)\\s*g\\s*\\/\\s*(\\d+\\.?\\d*)\\s*g/i)
              || bodyText.match(/Carbs[\\s\\S]*?of\\s+(\\d+\\.?\\d*)\\s*g/i);
            const fatTargetMatch = bodyText.match(/Fat[\\s\\S]*?(\\d+\\.?\\d*)\\s*g\\s*\\/\\s*(\\d+\\.?\\d*)\\s*g/i)
              || bodyText.match(/Fat[\\s\\S]*?of\\s+(\\d+\\.?\\d*)\\s*g/i);

            // Also check for progress bar elements with max/aria-valuemax attributes
            const progressBars = document.querySelectorAll('[class*="progress"], [role="progressbar"]');
            let barTargets = { calories: null, protein: null, carbs: null, fat: null };
            progressBars.forEach((bar) => {
              const max = bar.getAttribute('aria-valuemax') || bar.getAttribute('max');
              const label = (bar.getAttribute('aria-label') || bar.closest('[class*="nutrient"]')?.textContent || '').toLowerCase();
              if (max) {
                const val = parseFloat(max);
                if (!isNaN(val) && val > 0) {
                  if (label.includes('energy') || label.includes('calor')) barTargets.calories = val;
                  else if (label.includes('protein')) barTargets.protein = val;
                  else if (label.includes('carb')) barTargets.carbs = val;
                  else if (label.includes('fat')) barTargets.fat = val;
                }
              }
            });

            // Extract target value — for "X g / Y g" patterns, the target is group 2;
            // for "of Y g" patterns, the target is group 1
            function extractTarget(match) {
              if (!match) return null;
              // If 2 capture groups, target is group 2 (e.g., "X g / Y g")
              if (match[2] !== undefined) return Math.round(parseFloat(match[2]));
              // Otherwise group 1 (e.g., "of Y g")
              return Math.round(parseFloat(match[1]));
            }

            const calTarget = calTargetMatch ? Math.round(parseFloat(calTargetMatch[1])) : barTargets.calories;
            const protTarget = extractTarget(protTargetMatch) || barTargets.protein;
            const carbTarget = extractTarget(carbTargetMatch) || barTargets.carbs;
            const fatTarget = extractTarget(fatTargetMatch) || barTargets.fat;

            if (calTarget !== null || protTarget !== null || carbTarget !== null || fatTarget !== null) {
              targets = {
                calories: calTarget,
                protein: protTarget,
                carbs: carbTarget,
                fat: fatTarget,
              };
            }
          } catch {
            // Target extraction failed — continue without targets
          }
        }

        return { ...result, targets };
      }, wantTargets);
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
        const entry = { date: targetDate, calories: data.calories, protein: data.protein, carbs: data.carbs, fat: data.fat };
        if (wantTargets) entry.targets = data.targets || null;
        entries.push(entry);
      } catch {
        const entry = { date: targetDate, calories: 0, protein: 0, carbs: 0, fat: 0 };
        if (wantTargets) entry.targets = null;
        entries.push(entry);
      }
    }

    return { success: true, entries };
  `;
}
