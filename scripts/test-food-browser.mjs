import assert from "node:assert/strict";
import { chromium } from "playwright";
import { buildLogFoodCode } from "../dist/kernel/log-food.js";
import { buildAddCustomFoodCode } from "../dist/kernel/add-custom-food.js";

const foodName = "Gomez, Buffalo Chicken Turtle with Ranch";
const fixture = `<!doctype html><html><body>
<button hidden>CREATE FOOD</button>
<button onclick="document.querySelector('#editor').hidden=false">CREATE FOOD</button>
<section id="editor" hidden>
<input class="text-box" id="food-name">
<table>${["Calories", "Protein", "Total Carbohydrate", "Total Fat"].map((label) => `<tr><td><div>${label}</div></td><td><div onclick="this.hidden=true;this.nextElementSibling.hidden=false">-</div><input hidden data-label="${label}"></td></tr>`).join("")}</table>
<button hidden>Save Changes</button>
<button onclick="window.saved={name:document.querySelector('#food-name').value, nutrients:Object.fromEntries([...document.querySelectorAll('[data-label]')].map(input=>[input.dataset.label,Number(input.value)]))};document.querySelector('#editor').hidden=true">Save Changes</button>
</section>
<table><tr><td oncontextmenu="event.preventDefault();document.querySelector('#menu').hidden=false">Lunch</td></tr></table>
<div id="menu" hidden onclick="this.hidden=true;document.querySelector('#dialog').hidden=false">Add Food...</div>
<section id="dialog" hidden>
<h2>Add Food to Diary</h2>
<input hidden placeholder="Search all foods">
<input placeholder="Search all foods" id="search">
<button hidden>SEARCH</button>
<button onclick="document.querySelector('#results').hidden=false">SEARCH</button>
<table id="results" hidden><tr tabindex="0" onkeydown="if(event.key==='Enter')document.querySelector('#details').hidden=false"><td>${foodName}</td><td>Custom</td></tr></table>
<section id="details" hidden><span>Serving Size</span><input value="1">
<button onclick="window.writes=(window.writes||0)+1;document.querySelector('#dialog').hidden=true">ADD TO DIARY</button></section>
</section></body></html>`;

const browser = await chromium.launch({
  executablePath: process.env.CHRONO_TEST_CHROMIUM,
  headless: true,
});
try {
  for (const operation of ["log", "create-and-log"]) {
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("**/*", (route) =>
      route.fulfill({ contentType: "text/html", body: fixture })
    );
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const code =
      operation === "log"
        ? buildLogFoodCode({ name: foodName, meal: "Lunch", servings: 1 })
        : buildAddCustomFoodCode({
            name: foodName,
            protein: 60,
            carbs: 105,
            fat: 58,
            log: "Lunch",
          });
    const execute = new Function("page", `return (async () => {${code}})()`);
    const result = await execute(page);
    assert.deepEqual(result, { success: true });
    assert.equal(await page.evaluate(() => window.writes), 1);
    assert.equal(await page.locator("#search").inputValue(), foodName);
    if (operation === "create-and-log") {
      assert.deepEqual(await page.evaluate(() => window.saved), {
        name: foodName,
        nutrients: {
          Calories: 1182,
          Protein: 60,
          "Total Carbohydrate": 105,
          "Total Fat": 58,
        },
      });
    }
    console.log(
      `${operation}: passed against an intercepted local fixture; exactly one diary write`
    );
    await context.close();
  }
} finally {
  await browser.close();
}
