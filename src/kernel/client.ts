/**
 * Kernel.sh browser automation client for Cronometer.
 *
 * This module handles:
 * - Browser session management
 * - Cronometer authentication
 * - Page navigation and interaction
 */

export interface MacroEntry {
  protein?: number;
  carbs?: number;
  fat?: number;
  meal?: string;
}

export interface KernelClient {
  addQuickEntry(entry: MacroEntry): Promise<void>;
  // Future: search, summary, weight, etc.
}

/**
 * Get or create a Kernel client with an authenticated Cronometer session.
 */
export async function getKernelClient(): Promise<KernelClient> {
  // TODO: Implement Kernel.sh SDK integration
  //
  // Steps:
  // 1. Check for existing session in ~/.kernel/sessions/crono
  // 2. If no session, launch browser and prompt for login
  // 3. Navigate to cronometer.com/diary
  // 4. Return client with bound page context

  throw new Error(
    "Kernel integration not yet implemented. See docs/setup/kernel-setup.md"
  );
}

/**
 * Cronometer DOM selectors.
 * These may need updates if Cronometer changes their UI.
 */
export const SELECTORS = {
  // Add Food button on diary page
  addFoodButton: 'button[aria-label="Add Food"]',

  // Quick Add tab in the add food modal
  quickAddTab: '[data-tab="quick-add"]',

  // Macro input fields
  proteinInput: 'input[name="protein"]',
  carbsInput: 'input[name="carbs"]',
  fatInput: 'input[name="fat"]',

  // Meal selector dropdown
  mealDropdown: 'select[name="meal"]',

  // Submit button
  addButton: 'button[type="submit"]',
} as const;
