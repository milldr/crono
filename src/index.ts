#!/usr/bin/env node

import { Command } from "commander";
import { login } from "./commands/login.js";
import { quickAdd } from "./commands/quick-add.js";
import { weight } from "./commands/weight.js";

const program = new Command();

program
  .name("crono")
  .description("CLI for Cronometer automation via Kernel.sh")
  .version("0.1.0");

program
  .command("login")
  .description("Set up Kernel API key and Cronometer credentials")
  .action(async () => {
    await login();
  });

program
  .command("quick-add")
  .description("Add a quick macro entry to your diary")
  .option("-p, --protein <grams>", "Grams of protein", parseFloat)
  .option("-c, --carbs <grams>", "Grams of carbohydrates", parseFloat)
  .option("-f, --fat <grams>", "Grams of fat", parseFloat)
  .option(
    "-m, --meal <name>",
    "Meal category (Breakfast, Lunch, Dinner, Snacks)"
  )
  .action(async (options) => {
    await quickAdd(options);
  });

program
  .command("weight")
  .description("Check your weight from Cronometer")
  .option("-d, --date <date>", "Date (YYYY-MM-DD)")
  .option("-r, --range <range>", "Range (7d, 30d, or YYYY-MM-DD:YYYY-MM-DD)")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    await weight(options);
  });

program.parse();
