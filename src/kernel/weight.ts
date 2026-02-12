/**
 * Playwright code generator for Cronometer weight scraping.
 *
 * Returns a code string that executes remotely via
 * kernel.browsers.playwright.execute(). The code has access to
 * `page`, `context`, and `browser` from the Playwright environment.
 */

/**
 * Generate Playwright code for reading weight data from Cronometer.
 *
 * For each date, the flow is:
 *   navigate to diary → set date via prev/next arrows → read weight row
 *
 * Cronometer diary layout (biometric rows):
 *   <tr> <td>time</td> <td>icon</td> <td>Weight</td> <td>212.5</td> <td>lbs</td> ... </tr>
 *
 * Returns { success: true, entries: [{ date, weight, unit }] }
 */
export function buildWeightCode(dates: string[]): string {
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

    // Helper: extract weight from the currently displayed diary page.
    // Cronometer shows biometrics as table rows:
    //   <tr> <td>time</td> <td>icon</td> <td>Weight</td> <td>212.5</td> <td>lbs</td> </tr>
    async function extractWeight() {
      return await page.evaluate(() => {
        // Strategy 1: Find a table row containing "Weight" and extract value + unit
        const rows = document.querySelectorAll('tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          let foundWeight = false;
          let value = null;
          let unit = null;
          for (const cell of cells) {
            const text = (cell.textContent || '').trim();
            if (/^Weight$/i.test(text)) {
              foundWeight = true;
              continue;
            }
            if (foundWeight && !value && /^\\d+\\.?\\d*$/.test(text)) {
              value = parseFloat(text);
              continue;
            }
            if (foundWeight && value && !unit && /^(lbs?|kg)$/i.test(text)) {
              unit = text.toLowerCase();
              if (unit === 'lb') unit = 'lbs';
              return { weight: value, unit };
            }
          }
          // If we found Weight and a number but no separate unit cell,
          // check if the number cell also contains the unit
          if (foundWeight && value && !unit) {
            return { weight: value, unit: 'lbs' };
          }
        }

        // Strategy 2: Search the full page text for "Weight\\t<number>\\t<unit>"
        const bodyText = document.body.innerText;
        const match = bodyText.match(/\\bWeight\\b[^\\S\\n]*[\\t]+[^\\S\\n]*([\\d.]+)[^\\S\\n]*[\\t]+[^\\S\\n]*(lbs?|kg)/i);
        if (match) {
          let u = match[2].toLowerCase();
          if (u === 'lb') u = 'lbs';
          return { weight: parseFloat(match[1]), unit: u };
        }

        // Strategy 3: Look for "Weight" on a line with a number
        const lines = bodyText.split('\\n');
        for (const line of lines) {
          if (/\\bWeight\\b/i.test(line) && !/Heart Rate|Respiration|Oxygen|Sleep|Walking|VO2|Resting/i.test(line)) {
            const m = line.match(/(\\d+\\.\\d+|\\d+)\\s*(lbs?|kg)/i);
            if (m) {
              let u = m[2].toLowerCase();
              if (u === 'lb') u = 'lbs';
              return { weight: parseFloat(m[1]), unit: u };
            }
          }
        }

        return null;
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
        const data = await extractWeight();
        if (data) {
          entries.push({ date: targetDate, weight: data.weight, unit: data.unit });
        } else {
          entries.push({ date: targetDate, weight: null, unit: 'lbs' });
        }
      } catch {
        entries.push({ date: targetDate, weight: null, unit: 'lbs' });
      }
    }

    return { success: true, entries };
  `;
}
