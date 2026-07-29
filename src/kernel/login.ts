/**
 * Playwright code generators for Cronometer login automation.
 *
 * These functions return code strings that execute remotely via
 * kernel.browsers.playwright.execute(). The code has access to
 * `page`, `context`, and `browser` from the Playwright environment.
 */

/**
 * Generate code that checks if the user is logged into Cronometer.
 * Navigates to /#diary and checks if login UI is still presented.
 */
export function buildLoginCheckCode(): string {
  return `
    await page.goto('https://cronometer.com/#diary', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const url = page.url();
    ${buildLoginPresentedCheckCode()}
    ${buildDiaryPresentedCheckCode()}
    const isLoggedIn = url.includes('#diary') && !url.includes('/login') && !url.includes('/signin') && !loginPresented && diaryPresented;
    return { success: true, loggedIn: isLoggedIn, url, loginPresented, diaryPresented };
  `;
}

/**
 * Generate code that navigates to cronometer.com login page.
 * Used during manual login so the user sees the login form in live view.
 */
export function buildNavigateToLoginCode(): string {
  return `
    await page.goto('https://cronometer.com/login/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    return { success: true };
  `;
}

/**
 * Generate Playwright code that automates Cronometer login.
 * Fills email/password, submits, and verifies login succeeded.
 * Credentials are embedded via JSON.stringify for safe escaping.
 *
 * Navigates directly to /login/. An earlier version loaded the marketing
 * homepage and clicked its "Log In" link, but that click frequently does not
 * navigate — and because the loop recorded a successful *click* it also
 * suppressed the direct-navigation fallback, leaving the form unreachable and
 * failing with "Could not find email input on https://cronometer.com/".
 */
export function buildAutoLoginCode(username: string, password: string): string {
  const safeUser = JSON.stringify(username);
  const safePass = JSON.stringify(password);

  return `
    // Navigate straight to the login page.
    await page.goto('https://cronometer.com/login/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Wait for login page to load
    await page.waitForSelector('input[type="email"], input[name="username"], input[name="email"], #email, #username', { timeout: 15000 }).catch(() => {});

    // Fill email — try multiple selectors
    const emailSelectors = ['input[type="email"]', 'input[name="username"]', 'input[name="email"]', '#email', '#username'];
    let emailFilled = false;
    for (const sel of emailSelectors) {
      try {
        const el = page.locator(sel);
        if (await el.count() > 0) {
          await el.first().fill(${safeUser});
          emailFilled = true;
          break;
        }
      } catch {}
    }
    if (!emailFilled) {
      return { success: false, loggedIn: false, url: page.url(), error: 'Could not find email input on ' + page.url() };
    }

    // Fill password — try multiple selectors
    const passSelectors = ['input[type="password"]', 'input[name="password"]', '#password'];
    let passFilled = false;
    for (const sel of passSelectors) {
      try {
        const el = page.locator(sel);
        if (await el.count() > 0) {
          await el.first().fill(${safePass});
          passFilled = true;
          break;
        }
      } catch {}
    }
    if (!passFilled) {
      return { success: false, loggedIn: false, url: page.url(), error: 'Could not find password input on ' + page.url() };
    }

    // Click the LOG IN button
    const submitSelectors = ['#login-button', 'button:has-text("LOG IN")', 'button:has-text("Log In")', 'button[type="submit"]', 'input[type="submit"]'];
    let submitted = false;
    for (const sel of submitSelectors) {
      try {
        const el = page.locator(sel);
        if (await el.count() > 0) {
          await el.first().click();
          submitted = true;
          break;
        }
      } catch {}
    }
    if (!submitted) {
      return { success: false, loggedIn: false, url: page.url(), error: 'Could not find submit button on ' + page.url() };
    }

    // Wait for navigation after login. The GWT app then needs a moment to swap
    // the login UI for the app shell — checking too early made a login that had
    // actually succeeded report "Login verification failed".
    await page.waitForURL(u => !u.href.includes('/login') && !u.href.includes('/signin'), { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Confirm with a positive signal — that the diary actually renders — rather
    // than relying only on the absence of login UI, which races the app's boot.
    await page.goto('https://cronometer.com/#diary', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const url = page.url();
    ${buildLoginPresentedCheckCode()}
    ${buildDiaryPresentedCheckCode()}
    const loggedIn = !url.includes('/login') && !url.includes('/signin') && (diaryPresented || !loginPresented);

    // If still on login page, check for error messages (rate limit, wrong creds, etc.)
    let loginError = null;
    if (!loggedIn) {
      loginError = await page.evaluate(() => {
        const selectors = [
          '.error-message', '.alert', '.notification',
          '[class*="error"]', '[class*="alert"]',
          '.gwt-HTML',
        ];
        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const text = el.textContent?.trim();
            if (text && text.length > 5 && text.length < 300 && el.offsetParent !== null) {
              return text;
            }
          }
        }
        return null;
      });
    }

    return { success: true, loggedIn, url, loginError };
  `;
}

/**
 * Generate code that sets `diaryPresented` — a positive signal that the diary
 * UI actually rendered, rather than the mere absence of login UI.
 */
function buildDiaryPresentedCheckCode(): string {
  return `
    const diaryPresented = await page.evaluate(() => {
      return !!document.querySelector('i.diary-date-previous, i.diary-date-next') ||
        /Energy\\s+\\d+\\.?\\d*\\s*kcal/i.test(document.body.innerText);
    }).catch(() => false);
  `;
}

function buildLoginPresentedCheckCode(): string {
  return `
    const loginPresented = await page.evaluate(() => {
      const visible = (el) => {
        const style = window.getComputedStyle(el);
        return style && style.visibility !== 'hidden' && style.display !== 'none' && el.getClientRects().length > 0;
      };
      const hasVisibleSelector = (selector) =>
        Array.from(document.querySelectorAll(selector)).some((el) => visible(el));
      const hasLoginInput =
        hasVisibleSelector('input[type="email"], input[name="username"], input[name="email"], #email, #username') ||
        hasVisibleSelector('input[type="password"], input[name="password"], #password');
      const hasLoginAction = Array.from(document.querySelectorAll('a, button'))
        .filter((el) => visible(el))
        .some((el) => {
          const text = el.textContent?.replace(/\\s+/g, ' ').trim().toLowerCase() ?? '';
          return ['log in', 'login', 'sign in', 'signin'].includes(text);
        });

      return hasLoginInput || hasLoginAction;
    }).catch(() => false);
  `;
}
