#!/usr/bin/env node

import { Command } from "commander";
import { quickAdd } from "./commands/quick-add.js";

const program = new Command();

program
  .name("crono")
  .description("CLI for Cronometer automation via Kernel.sh")
  .version("0.1.0");

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

program.parse();
