/**
 * Login command — prompts for Kernel API key and Cronometer credentials,
 * validates them, and stores them securely.
 *
 * If credentials already exist, each field shows a masked preview and
 * pressing Enter keeps the existing value.
 */

import Kernel from "@onkernel/sdk";
import { createInterface } from "readline";
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
 * Prompt for a single line of input (visible text).
 */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt for a password with masked input (echoes * per keystroke).
 */
function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const chars: string[] = [];

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (ch: string) => {
      const c = ch.toString();

      if (c === "\n" || c === "\r" || c === "\u0004") {
        // Enter or Ctrl-D
        stdin.setRawMode(wasRaw ?? false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(chars.join(""));
      } else if (c === "\u0003") {
        // Ctrl-C
        stdin.setRawMode(wasRaw ?? false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        process.exit(1);
      } else if (c === "\u007F" || c === "\b") {
        // Backspace
        if (chars.length > 0) {
          chars.pop();
          process.stdout.write("\b \b");
        }
      } else {
        chars.push(c);
        process.stdout.write("*");
      }
    };

    stdin.on("data", onData);
  });
}

/**
 * Interactive login flow.
 *
 * Each field shows the existing value (masked) if present.
 * Pressing Enter without typing keeps the existing value.
 */
export async function login(): Promise<void> {
  const existingKey = getCredential("kernel-api-key");
  const existingEmail = getCredential("cronometer-username");
  const existingPassword = getCredential("cronometer-password");

  if (existingKey || existingEmail || existingPassword) {
    console.log(
      `Credentials already configured${existingEmail ? ` for ${existingEmail}` : ""}.`
    );
    console.log("Press Enter to keep existing values.\n");
  }

  // 1. Kernel API key
  const apiKeyPrompt = existingKey
    ? `Kernel API key [${mask(existingKey)}]: `
    : "Kernel API key: ";
  const apiKeyInput = await prompt(apiKeyPrompt);
  const apiKey = apiKeyInput || existingKey;

  if (!apiKey) {
    console.error("Error: API key cannot be empty.");
    process.exit(1);
  }

  // Only validate if the key changed
  if (apiKeyInput && apiKeyInput !== existingKey) {
    console.log("Validating API key...");
    try {
      await validateKernelApiKey(apiKey);
    } catch {
      console.error(
        "Error: Invalid API key. Check your key at https://kernel.sh"
      );
      process.exit(1);
    }
    console.log("API key is valid.\n");
  } else if (!apiKeyInput && existingKey) {
    console.log("Keeping existing API key.\n");
  }

  // 2. Cronometer email
  const emailPrompt = existingEmail
    ? `Cronometer email [${existingEmail}]: `
    : "Cronometer email: ";
  const emailInput = await prompt(emailPrompt);
  const email = emailInput || existingEmail;

  if (!email || !email.includes("@")) {
    console.error("Error: Please enter a valid email address.");
    process.exit(1);
  }

  // 3. Cronometer password
  const passwordPrompt = existingPassword
    ? "Cronometer password [********]: "
    : "Cronometer password: ";
  const passwordInput = await promptPassword(passwordPrompt);
  const password = passwordInput || existingPassword;

  if (!password) {
    console.error("Error: Password cannot be empty.");
    process.exit(1);
  }

  // Store credentials
  setCredential("kernel-api-key", apiKey);
  setCredential("cronometer-username", email);
  setCredential("cronometer-password", password);

  const changed: string[] = [];
  if (apiKeyInput && apiKeyInput !== existingKey) changed.push("API key");
  if (emailInput && emailInput !== existingEmail) changed.push("email");
  if (passwordInput && passwordInput !== existingPassword)
    changed.push("password");

  if (changed.length > 0) {
    console.log(`\nUpdated ${changed.join(", ")}.`);
  } else {
    console.log("\nNo changes made.");
  }
}
