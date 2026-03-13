/**
 * Error formatting for Kernel SDK errors.
 *
 * Inspects error types from @onkernel/sdk and produces actionable
 * messages with diagnostics (HTTP status, cause, remediation hints).
 */

import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from "@onkernel/sdk";

/**
 * Format a Kernel SDK error into a user-friendly message with diagnostics.
 */
export function formatKernelError(error: unknown): string {
  if (error instanceof APIConnectionTimeoutError) {
    return (
      "Request to Kernel API timed out.\n" +
      "  This usually means the Kernel service is slow or unreachable.\n" +
      "  Try again in a few moments, or check https://status.kernel.sh"
    );
  }

  if (error instanceof APIConnectionError) {
    const cause = (error as { cause?: Error }).cause;
    const causeMsg = cause?.message ? `: ${cause.message}` : "";
    return (
      `Could not connect to Kernel API${causeMsg}\n` +
      "  Possible causes:\n" +
      "  - No internet connection or DNS failure\n" +
      "  - Kernel service is down (check https://status.kernel.sh)\n" +
      "  - Firewall or proxy blocking outbound HTTPS requests"
    );
  }

  if (error instanceof AuthenticationError) {
    return (
      `Kernel API authentication failed (HTTP ${error.status}).\n` +
      "  Your API key may be invalid or expired.\n" +
      "  Run `crono login` to update your credentials."
    );
  }

  if (error instanceof RateLimitError) {
    return (
      `Kernel API rate limit exceeded (HTTP ${error.status}).\n` +
      "  Please wait a few minutes and try again."
    );
  }

  if (error instanceof APIError) {
    const status = error.status ? `HTTP ${error.status}` : "unknown status";
    return `Kernel API error (${status}): ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
