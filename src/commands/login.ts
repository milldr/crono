/**
 * Login command — prompts for Kernel API key and Cronometer credentials,
 * validates them, and stores them securely.
 *
 * Uses @clack/prompts for styled terminal UI with cancellation handling.
 */

import * as p from "@clack/prompts";
import Kernel from "@onkernel/sdk";
import { loadConfig, saveConfig } from "../config.js";
import { getCredential, setCredential } from "../credentials.js";

/**
 * Validate a Kernel API key by attempting to list profiles.
 * Throws if the key is invalid.
 */
export async function validateKernelApiKey(apiKey: string): Promise<void> {
  const prevKey = process.env["KERNEL_API_KEY"];
  try {
    process.env["KERNEL_API_KEY"] = apiKey;
    const kernel = new Kernel();
    await kernel.profiles.list();
  } finally {
    if (prevKey === undefined) {
      delete process.env["KERNEL_API_KEY"];
    } else {
      process.env["KERNEL_API_KEY"] = prevKey;
    }
  }
}

/**
 * Mask a string for display: show first 4 chars then stars.
 * For short strings (<=4), show all stars.
 */
function mask(value: string): string {
  if (value.length <= 4) return "*".repeat(value.length);
  return value.slice(0, 4) + "*".repeat(value.length - 4);
}

/**
 * Interactive login flow.
 *
 * Each field shows the existing value (masked) if present.
 * Pressing Enter without typing keeps the existing value.
 */
export async function login(): Promise<void> {
  const existingConfig = loadConfig();
  const existingKey = getCredential("kernel-api-key");
  const existingEmail = getCredential("cronometer-username");
  const existingPassword = getCredential("cronometer-password");

  p.intro("🍎 crono login");

  if (existingKey || existingEmail || existingPassword) {
    p.log.info(
      `Credentials already configured${existingEmail ? ` for ${existingEmail}` : ""}. Press Enter to keep existing values.`
    );
  }

  // 1. Automation backend
  const useKernelInput = await p.confirm({
    message: "Use Kernel remote browser?",
    initialValue: existingConfig.useKernel ?? true,
  });

  if (p.isCancel(useKernelInput)) {
    p.cancel("Login cancelled.");
    process.exit(0);
  }

  const useKernel = useKernelInput;

  // 2. Kernel API key
  let apiKeyInput: string | symbol | undefined;
  let apiKey: string | null | undefined = existingKey;

  if (useKernel) {
    apiKeyInput = await p.text({
      message: "Kernel API key",
      placeholder: existingKey ? mask(existingKey) : "sk-...",
      defaultValue: existingKey ?? undefined,
    });

    if (p.isCancel(apiKeyInput)) {
      p.cancel("Login cancelled.");
      process.exit(0);
    }

    apiKey = typeof apiKeyInput === "string" ? apiKeyInput : existingKey;

    if (!apiKey) {
      p.cancel("API key cannot be empty when Kernel is enabled.");
      process.exit(1);
    }

    // Only validate if the key changed
    if (
      typeof apiKeyInput === "string" &&
      apiKeyInput &&
      apiKeyInput !== existingKey
    ) {
      const s = p.spinner();
      s.start("Validating API key...");
      try {
        await validateKernelApiKey(apiKey);
        s.stop("API key valid.");
      } catch {
        s.stop("API key invalid.");
        p.cancel("Invalid API key. Check your key at https://kernel.sh");
        process.exit(1);
      }
    }
  }

  // 3. Cronometer email
  const emailInput = await p.text({
    message: "Cronometer email",
    defaultValue: existingEmail ?? undefined,
    placeholder: existingEmail ?? "you@example.com",
    validate: (v) => {
      if (v && !v.includes("@")) return "Must be a valid email";
    },
  });

  if (p.isCancel(emailInput)) {
    p.cancel("Login cancelled.");
    process.exit(0);
  }

  const email = emailInput || existingEmail;

  if (!email || !email.includes("@")) {
    p.cancel("Please enter a valid email address.");
    process.exit(1);
  }

  // 4. Cronometer password
  let password: string | undefined;

  if (existingPassword) {
    const changePassword = await p.confirm({
      message: "Change Cronometer password?",
      initialValue: false,
    });

    if (p.isCancel(changePassword)) {
      p.cancel("Login cancelled.");
      process.exit(0);
    }

    if (changePassword) {
      const passwordInput = await p.password({
        message: "Cronometer password",
        mask: "*",
      });

      if (p.isCancel(passwordInput)) {
        p.cancel("Login cancelled.");
        process.exit(0);
      }

      password = passwordInput || existingPassword;
    } else {
      password = existingPassword;
    }
  } else {
    const passwordInput = await p.password({
      message: "Cronometer password",
      mask: "*",
    });

    if (p.isCancel(passwordInput)) {
      p.cancel("Login cancelled.");
      process.exit(0);
    }

    password = passwordInput;
  }

  if (!password) {
    p.cancel("Password cannot be empty.");
    process.exit(1);
  }

  // Store config and credentials
  saveConfig({ ...existingConfig, useKernel });
  if (apiKey) {
    setCredential("kernel-api-key", apiKey);
  }
  setCredential("cronometer-username", email);
  setCredential("cronometer-password", password);

  const changed: string[] = [];
  if (useKernel !== (existingConfig.useKernel ?? true)) {
    changed.push("backend");
  }
  if (
    typeof apiKeyInput === "string" &&
    apiKeyInput &&
    apiKeyInput !== existingKey
  ) {
    changed.push("API key");
  }
  if (emailInput && emailInput !== existingEmail) changed.push("email");
  if (password !== existingPassword) changed.push("password");

  if (changed.length > 0) {
    p.outro(`Updated ${changed.join(", ")}.`);
  } else {
    p.outro("No changes made.");
  }
}
