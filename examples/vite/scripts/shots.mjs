// Screenshots the built demo into docs/brand for the Product Hunt graphics:
// the grid sorted round the colour wheel, and the tone wheel filtering it to
// the warm tones. Run `pnpm build` first.
//
//   pnpm shots
//
// Set CHROMIUM_PATH if Playwright's bundled Chromium is not installed.
import { chromium } from "playwright-core";
import { preview } from "vite";

const out = new URL("../../../docs/brand/", import.meta.url);
const server = await preview({ root: new URL("..", import.meta.url).pathname, preview: { port: 4179 } });
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
// Just wider than the gallery's maximum width and tall enough for five rows,
// at 2× so the captures stay sharp when scaled into a layout.
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 2, colorScheme: "dark" });
// Seed the shuffle so every run frames the same photos.
await page.addInitScript(() => {
  let seed = 7;
  Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
});
await page.goto(url);
await page.waitForSelector(".cg-tile img");
// Hide the promo header so the gallery fills the frame.
await page.addStyleTag({ content: ".promo { display: none }" });

// Waits until every tile on screen has swapped its placeholder for the photo.
async function settle() {
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".cg-tile-img")]
      .filter((i) => i.getBoundingClientRect().top < innerHeight)
      .every((i) => i.classList.contains("is-loaded"))
  , null, { timeout: 30000 });
  await page.waitForTimeout(800);
}

async function shot(file) {
  await page.screenshot({ path: new URL(file, out).pathname });
  console.log(`  docs/brand/${file}`);
}

// 1. The grid, sorted round the colour wheel: framed on the stretch that runs
// from autumn leaves through yellow and green into the blues.
await page.getByRole("button", { name: /grid/i }).click();
const from = await page.locator(".cg-tile").nth(12).evaluate((el) => el.getBoundingClientRect().top + scrollY - 24);
await page.evaluate((y) => scrollTo(0, y), from);
await settle();
await shot("feature-colour-sort.png");
await page.evaluate(() => scrollTo(0, 0));

// 2. Tone wheel open and set to orange: only the warm photos remain.
const before = await page.locator(".cg-tile").count();
await page.getByRole("button", { name: /tones/i }).click();
await page.getByRole("slider", { name: /tone/i }).focus();
for (let i = 0; i < 2; i++) await page.keyboard.press("ArrowRight");
await page.waitForFunction((n) => document.querySelectorAll(".cg-tile").length !== n, before);
await settle();
await shot("feature-tone-wheel.png");

await browser.close();
await server.close();
