import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.QA_URL || "http://127.0.0.1:4174/";
const output = new URL("../qa-output/", import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "darwin"
    ? { channel: "chromium", args: ["--use-angle=metal"] }
    : {}),
});
const report = {
  url: base,
  date: new Date().toISOString(),
  checks: [],
  errors: [],
  warnings: [],
  screenshots: [],
  metrics: {},
};
async function shot(page, name, fullPage = false) {
  await page.screenshot({ path: output + name + ".png", fullPage });
  report.screenshots.push(name + ".png");
}
function check(name, condition) {
  assert.ok(condition, name);
  report.checks.push(name);
}
async function overflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= innerWidth + 1,
  );
}
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") report.errors.push(e.text());
  if (e.type() === "warning" && !e.text().includes("GPU stall"))
    report.warnings.push(e.text());
});
page.on("requestfailed", (r) =>
  report.errors.push(r.url() + ": " + r.failure()?.errorText),
);
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1300);
check(
  "desktop has working WebGL",
  (await page.locator("#sculpture canvas").count()) === 1,
);
check("desktop does not overflow horizontally", await overflow(page));
report.metrics.desktop = await page.evaluate(() =>
  window.__FIELD_FORM__.metrics(),
);
await shot(page, "desktop-hero");
const metrics0 = await page.evaluate(() => window.__FIELD_FORM__.metrics());
await page.waitForTimeout(500);
const metrics1 = await page.evaluate(() => window.__FIELD_FORM__.metrics());
check("3D actually animates over time", metrics1.frames > metrics0.frames + 2);
report.metrics.frameTiming = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const deltas = [];
      let previous;
      function frame(t) {
        if (previous !== undefined) deltas.push(t - previous);
        previous = t;
        if (deltas.length < 60) requestAnimationFrame(frame);
        else {
          const ordered = [...deltas].sort((a, b) => a - b);
          resolve({
            medianMs: ordered[30],
            p95Ms: ordered[57],
            frames: 60,
            averageFps: 60000 / deltas.reduce((a, b) => a + b, 0),
          });
        }
      }
      requestAnimationFrame(frame);
    }),
);
const travel = await page.evaluate(
  () => document.querySelector(".journey").offsetHeight - innerHeight,
);
for (const [name, p] of [
  ["desktop-separate", 0.46],
  ["desktop-transform", 0.88],
]) {
  await page.evaluate((y) => scrollTo(0, y), travel * p);
  await page.waitForTimeout(1600);
  await shot(page, name);
  report.metrics[name] = await page.evaluate(() =>
    window.__FIELD_FORM__.metrics(),
  );
}
check(
  "scroll changes geometry and morph",
  report.metrics["desktop-transform"].morph > 0.9,
);
await page.locator("#studies").scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await shot(page, "desktop-archive");
for (const type of ["orbit", "glow", "signal"]) {
  const b = page.locator(`[data-action="${type}"]`);
  await b.scrollIntoViewIfNeeded();
  await b.click();
  check(
    `${type} first click activates`,
    (await b.getAttribute("aria-pressed")) === "true",
  );
  await b.click();
  check(
    `${type} repeated click resets`,
    (await b.getAttribute("aria-pressed")) === "false",
  );
  const open = page.locator(`[data-study="${type}"]`);
  await open.click();
  check(
    `${type} opens accessible dialog`,
    await page.locator("dialog").evaluate((d) => d.open),
  );
  await page.keyboard.press("Escape");
  check(
    `${type} Escape restores focus`,
    await open.evaluate((e) => e === document.activeElement),
  );
}
await page.locator('[data-study="glow"]').click();
await shot(page, "desktop-dialog");
await page.locator(".dialog-try").click();
check(
  "dialog experiment activates matching artwork",
  (await page.locator('[data-action="glow"]').getAttribute("aria-pressed")) ===
    "true",
);
await page.locator("#about").scrollIntoViewIfNeeded();
await shot(page, "desktop-about");
await page.goto(base, { waitUntil: "networkidle" });
await page.keyboard.press("Tab");
check(
  "keyboard reaches skip link first",
  await page
    .locator(".skip-link")
    .evaluate((e) => e === document.activeElement),
);
await page.keyboard.press("Enter");
check(
  "skip link transfers focus to archive",
  await page.locator("#studies").evaluate((e) => e === document.activeElement),
);
await page.evaluate(() => scrollTo(0, 0));
await page.locator("#motion-toggle").click();
await page.waitForTimeout(300);
check(
  "motion toggle removes sticky story",
  (await page
    .locator(".stage")
    .evaluate((e) => getComputedStyle(e).position)) === "relative",
);
const f0 = await page.evaluate(() => window.__FIELD_FORM__.metrics().frames);
await page.waitForTimeout(400);
const f1 = await page.evaluate(() => window.__FIELD_FORM__.metrics().frames);
check("paused 3D stops rendering", f0 === f1);
await page.locator("#motion-toggle").click();
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.evaluate(() => scrollTo(0, 0));
await shot(page, "mobile-hero");
check("390px mobile does not overflow", await overflow(page));
check(
  "mobile has its own shorter scroll story",
  (await page
    .locator(".stage")
    .evaluate((e) => getComputedStyle(e).position)) === "sticky",
);
report.metrics.mobile = await page.evaluate(() =>
  window.__FIELD_FORM__.metrics(),
);
const mobileTravel = await page.evaluate(
  () => document.querySelector(".journey").offsetHeight - innerHeight,
);
for (const [name, p] of [
  ["mobile-separate", 0.46],
  ["mobile-transform", 0.88],
]) {
  await page.evaluate((y) => scrollTo(0, y), mobileTravel * p);
  await page.waitForTimeout(1600);
  await shot(page, name);
}
check(
  "mobile scroll transforms real geometry",
  (await page.evaluate(() => window.__FIELD_FORM__.metrics().morph)) > 0.9,
);
for (const [selector, name] of [
  ["#study-01", "mobile-orbit"],
  ["#study-02", "mobile-glow"],
  ["#study-03", "mobile-signal"],
  ["#about", "mobile-about"],
]) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await shot(page, name);
}
check(
  "skip link stays outside viewport after interaction",
  await page
    .locator(".skip-link")
    .evaluate((e) => e.getBoundingClientRect().bottom < 0),
);
await shot(page, "mobile-full", true);
for (const width of [320, 768, 1920]) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(250);
  check(`${width}px resize has no horizontal overflow`, await overflow(page));
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(500);
check(
  "resize back to desktop restores scroll story",
  (await page
    .locator(".stage")
    .evaluate((e) => getComputedStyle(e).position)) === "sticky",
);
await context.close();
const reduced = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const rp = await reduced.newPage();
await rp.goto(base, { waitUntil: "networkidle" });
await rp.waitForTimeout(500);
check(
  "system reduced motion respected",
  await rp.evaluate(() => window.__FIELD_FORM__.getMotion().still),
);
check(
  "reduced motion has no sticky pin",
  (await rp.locator(".stage").evaluate((e) => getComputedStyle(e).position)) ===
    "relative",
);
await shot(rp, "reduced-motion-hero");
await reduced.close();
const fallback = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
await fallback.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...args) {
    return t === "webgl2" ? null : original.call(this, t, ...args);
  };
});
const fp = await fallback.newPage();
await fp.goto(base, { waitUntil: "networkidle" });
check(
  "WebGL fallback remains visible",
  await fp.locator(".fallback-object").isVisible(),
);
check(
  "WebGL failure preserves study interactions",
  (await fp.locator('[data-study="orbit"]').count()) === 1,
);
await shot(fp, "mobile-webgl-fallback");
await fallback.close();
check("no browser errors", report.errors.length === 0);
await browser.close();
await writeFile(output + "report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
