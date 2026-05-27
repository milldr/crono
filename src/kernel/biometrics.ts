/**
 * Playwright code generator for Cronometer biometrics logging.
 *
 * Supports logging weight, body fat percentage, and blood pressure.
 */

export interface BiometricEntry {
  type: "weight" | "bodyfat" | "bloodpressure";
  value?: number;
  unit?: string;
  systolic?: number;
  diastolic?: number;
  date: string;
}

/**
 * Generate Playwright code for logging a biometric to Cronometer.
 * Navigates to the diary, clicks BIOMETRIC button, selects the biometric type,
 * fills in values, and adds to diary.
 */
export function buildBiometricsCode(entry: BiometricEntry): string {
  const { type, value, unit, systolic, diastolic } = entry;

  const biometricName =
    type === "weight"
      ? "Weight"
      : type === "bodyfat"
        ? "Body Fat"
        : "Blood Pressure";

  return `
    // Navigate to dashboard first (where the BIOMETRIC button is)
    await page.goto('https://cronometer.com/#dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Check if logged in
    const url = page.url();
    if (url.includes('/login') || url.includes('/signin')) {
      return { success: false, error: 'Not logged in. Login may have failed.' };
    }

    // Wait for the quick add panel to appear
    try {
      await page.waitForSelector('text="Quick Add to Diary"', { timeout: 10000 });
    } catch {
      return { success: false, error: 'Dashboard quick add panel not found' };
    }
    await page.waitForTimeout(500);

    // Wait for and click BIOMETRIC button
    try {
      await page.waitForSelector('button:has-text("BIOMETRIC"), button:has-text("Biometric")', { timeout: 10000 });
    } catch {
      return { success: false, error: 'Could not find BIOMETRIC button' };
    }

    const biometricButton = page.getByRole('button', { name: /BIOMETRIC/i });
    if (await biometricButton.count() === 0) {
      return { success: false, error: 'BIOMETRIC button not found' };
    }
    await biometricButton.first().click();
    await page.waitForTimeout(1000);

    // Wait for biometric dialog
    try {
      await page.waitForSelector('text="Add Biometric"', { timeout: 5000 });
    } catch {
      return { success: false, error: 'Add Biometric dialog did not appear' };
    }
    await page.waitForTimeout(300);

    // Click the biometric type (Weight, Body Fat, or Blood Pressure)
    // Look for the biometric item by finding text with the name and clicking its container
    const biometricItem = page.locator('.biometric-content-panel.pretty-row').filter({ hasText: '${biometricName}' }).first();
    const itemCount = await biometricItem.count();

    if (itemCount === 0) {
      return { success: false, error: 'Could not find ${biometricName} in biometric list' };
    }

    await biometricItem.click();
    await page.waitForTimeout(1000);

    ${type === "weight" ? buildWeightInputCode(value!, unit!) : ""}
    ${type === "bodyfat" ? buildBodyFatInputCode(value!) : ""}
    ${type === "bloodpressure" ? buildBloodPressureInputCode(systolic!, diastolic!) : ""}

    // Wait for ADD TO DIARY button to become enabled, then click it
    const addButton = page.getByRole('button', { name: /add.*diary/i });

    // Wait for button to be enabled
    await page.waitForTimeout(500);
    const isEnabled = await addButton.isEnabled().catch(() => false);
    if (!isEnabled) {
      return { success: false, error: 'Add to Diary button is disabled. Value may not have been filled correctly.' };
    }

    await addButton.click();

    // Wait for dialog to close
    await page.waitForSelector('text="Add Biometric"', { state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    return { success: true };
  `;
}

function buildWeightInputCode(value: number, unit: string): string {
  return `
    // Fill weight value using getByRole
    const weightInput = page.getByRole('textbox', { name: 'Weight' });
    if (await weightInput.count() === 0) {
      return { success: false, error: 'Could not find weight input field' };
    }
    await weightInput.fill(String(${value}));
    // Press Tab to trigger validation and move focus
    await weightInput.press('Tab');
    await page.waitForTimeout(500);

    // Select unit if not kg
    if ('${unit}' === 'lbs') {
      const unitButton = page.getByRole('button', { name: /Unit.*kg/i });
      if (await unitButton.count() > 0) {
        await unitButton.click();
        await page.waitForTimeout(300);
        // Select lbs from dropdown
        const lbsOption = page.getByText('lbs', { exact: true });
        if (await lbsOption.count() > 0) {
          await lbsOption.click();
        }
      }
    }
    await page.waitForTimeout(500);
  `;
}

function buildBodyFatInputCode(value: number): string {
  return `
    // Fill body fat percentage using getByRole
    const bodyFatInput = page.getByRole('textbox', { name: 'Body Fat' });
    if (await bodyFatInput.count() === 0) {
      return { success: false, error: 'Could not find body fat input field' };
    }
    await bodyFatInput.fill(String(${value}));
    // Press Tab to trigger validation and move focus
    await bodyFatInput.press('Tab');
    await page.waitForTimeout(500);
  `;
}

function buildBloodPressureInputCode(
  systolic: number,
  diastolic: number
): string {
  return `
    // Fill blood pressure values
    // After clicking "Blood Pressure", there should be exactly 2 visible textbox inputs
    const allTextboxes = page.getByRole('textbox');
    const visibleInputs = [];

    for (let i = 0; i < await allTextboxes.count(); i++) {
      const input = allTextboxes.nth(i);
      if (await input.isVisible()) {
        const placeholder = await input.getAttribute('placeholder');
        // Skip the search box
        if (!placeholder || !placeholder.toLowerCase().includes('search')) {
          visibleInputs.push(i);
        }
      }
    }

    if (visibleInputs.length < 2) {
      return { success: false, error: 'Could not find systolic and diastolic input fields. Found ' + visibleInputs.length + ' inputs.' };
    }

    // Fill systolic (first BP input)
    const systolicInput = allTextboxes.nth(visibleInputs[0]);
    await systolicInput.fill(String(${systolic}));
    await systolicInput.press('Tab');
    await page.waitForTimeout(300);

    // Fill diastolic (second BP input)
    const diastolicInput = allTextboxes.nth(visibleInputs[1]);
    await diastolicInput.fill(String(${diastolic}));
    await diastolicInput.press('Tab');
    await page.waitForTimeout(500);
  `;
}
