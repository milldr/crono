/**
 * Kernel.sh profile management for persistent browser sessions.
 *
 * Profiles store cookies and localStorage so Cronometer login persists
 * across CLI invocations.
 */

import type Kernel from "@onkernel/sdk";

const PROFILE_NAME = "crono";

/**
 * Check if this is the first run (profile doesn't exist yet).
 * Returns true if no profile found (user needs to log in).
 */
export async function isFirstRun(kernel: Kernel): Promise<boolean> {
  try {
    await kernel.profiles.retrieve(PROFILE_NAME);
    return false;
  } catch (err: unknown) {
    if (isNotFoundError(err)) {
      return true;
    }
    throw err;
  }
}

/**
 * Ensure the "crono" profile exists. Creates it if missing,
 * ignores 409 Conflict if it already exists.
 */
export async function ensureProfile(kernel: Kernel): Promise<void> {
  try {
    await kernel.profiles.create({ name: PROFILE_NAME });
  } catch (err: unknown) {
    if (isConflictError(err)) {
      return; // already exists
    }
    throw err;
  }
}

export { PROFILE_NAME };

function isNotFoundError(err: unknown): boolean {
  return (
    err instanceof Error &&
    "status" in err &&
    (err as { status: number }).status === 404
  );
}

function isConflictError(err: unknown): boolean {
  return (
    err instanceof Error &&
    "status" in err &&
    (err as { status: number }).status === 409
  );
}
