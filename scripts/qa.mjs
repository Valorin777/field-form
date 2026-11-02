import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const base = process.env.QA_URL || "http://127.0.0.1:4175/field-form/";
const output = new URL("../qa-output/last-wind/", import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "darwin"
    ? { channel: "chromium", args: ["--use-angle=metal"] }
    : {}),
});
const report = {
  title: "LAST WIND",
  url: base,
  date: new Date().toISOString(),
  checks: [],
  errors: [],
  warnings: [],
  screenshots: [],
  metrics: {},
  network: {},
};
function check(name, value) {
  assert.ok(value, name);
  report.checks.push(name);
}
const origin = new URL(base).origin;
function observe(page, label) {
  page.on("pageerror", (e) => report.errors.push(`${label}: ${e.message}`));
  page.on("console", (e) => {
    if (e.type() === "error") report.errors.push(`${label}: ${e.text()}`);
    if (e.type() === "warning" && !/GPU stall/.test(e.text()))
      report.warnings.push(`${label}: ${e.text()}`);
  });
  page.on("requestfailed", (r) => {
    if (
      !/ERR_ABORTED/.test(r.failure()?.errorText || "") &&
      !(label === "no-js" && r.failure()?.errorText === "csp")
    )
      report.errors.push(`${label}: ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400)
      report.errors.push(`${label}: HTTP ${r.status()} ${r.url()}`);
    if (!r.url().startsWith("data:") && new URL(r.url()).origin !== origin)
      report.errors.push(`${label}: unexpected external request ${r.url()}`);
  });
}
async function open(page) {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__LAST_WIND__?.metrics().ready);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1100);
}
async function metrics(page) {
  return page.evaluate(() => window.__LAST_WIND__.metrics());
}
async function position(page, p) {
  await page.evaluate(
    (p) =>
      scrollTo(
        0,
        (document.querySelector(".film").offsetHeight - innerHeight) * p,
      ),
    p,
  );
  await page.waitForTimeout(1050);
}
async function shot(page, name) {
  await page.screenshot({ path: output + name + ".png" });
  report.screenshots.push(name + ".png");
}
async function noOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= innerWidth + 1,
  );
}
try {
  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  observe(desktop, "desktop");
  await open(desktop);
  check(
    "New film title and four semantic chapters",
    (await desktop.title()) === "LAST WIND — A scroll film" &&
      (await desktop.locator(".chapter").count()) === 4,
  );
  check(
    "No buttons, portfolio cards or sales forms",
    (await desktop.locator('button,form,.study,[role="button"]').count()) === 0,
  );
  check(
    "Desktop renders WebGL with all three texture layers",
    (await metrics(desktop)).mode === "full" &&
      (await metrics(desktop)).textures === 2,
  );
  report.metrics.desktop = await metrics(desktop);
  report.metrics.renderer = await desktop.evaluate(() => {
    const gl = document.querySelector("canvas").getContext("webgl2");
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return debug
      ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
  });
  const before = await metrics(desktop),
    imageBefore = await desktop.screenshot();
  await desktop.waitForTimeout(700);
  const after = await metrics(desktop),
    imageAfter = await desktop.screenshot();
  check(
    "Ambient motion advances while stationary",
    after.frames > before.frames + 10 && after.time > before.time + 0.4,
  );
  check(
    "Rendered pixels actually change while stationary",
    !imageBefore.equals(imageAfter),
  );
  report.metrics.frameTiming = await desktop.evaluate(
    () =>
      new Promise((resolve) => {
        const deltas = [];
        let previous;
        function tick(t) {
          if (previous) deltas.push(t - previous);
          previous = t;
          if (deltas.length < 120) requestAnimationFrame(tick);
          else {
            deltas.sort((a, b) => a - b);
            resolve({
              medianMs: deltas[60],
              p95Ms: deltas[114],
              meanMs: deltas.reduce((a, b) => a + b, 0) / deltas.length,
            });
          }
        }
        requestAnimationFrame(tick);
      }),
  );
  await desktop.keyboard.press("Space");
  await desktop.waitForTimeout(250);
  const holdA = await metrics(desktop);
  await desktop.waitForTimeout(450);
  const holdB = await metrics(desktop);
  check(
    "Space freezes ambient simulation",
    holdA.paused && holdA.time === holdB.time && holdA.frames === holdB.frames,
  );
  await position(desktop, 0.29);
  const heldScroll = await metrics(desktop);
  check(
    "Scrolling still directs camera when ambient is paused",
    heldScroll.progress > 0.28 &&
      heldScroll.time === holdB.time &&
      heldScroll.camera[2] < holdB.camera[2],
  );
  await desktop.keyboard.press("Space");
  await desktop.waitForTimeout(400);
  check(
    "Space resumes motion",
    (await metrics(desktop)).time > heldScroll.time + 0.2,
  );
  for (const [scene, p] of [
    ["opening", 0],
    ["field", 0.29],
    ["storm", 0.64],
    ["return", 0.98],
  ]) {
    await position(desktop, p);
    await shot(desktop, "desktop-" + scene);
    report.metrics["desktop-" + scene] = await metrics(desktop);
    check(
      `${scene}: visible expected chapter`,
      await desktop.evaluate(
        () =>
          Math.max(
            ...[...document.querySelectorAll(".chapter")].map(
              (x) => +getComputedStyle(x).opacity,
            ),
          ) > 0.95,
      ),
    );
  }
  check(
    "Scroll transforms cool light into storm light",
    report.metrics["desktop-storm"].heat > 0.9 &&
      report.metrics["desktop-field"].heat < 0.1,
  );
  check(
    "Scroll creates close and distant camera compositions",
    report.metrics["desktop-return"].camera[2] -
      report.metrics["desktop-storm"].camera[2] >
      9,
  );
  for (const p of [0.68, 0.1, 0.98, 0.29, 0]) {
    await position(desktop, p);
    check(
      `Reverse scroll settles correctly at ${p}`,
      Math.abs((await metrics(desktop)).progress - p) < 0.005,
    );
  }
  for (const [width, height] of [
    [320, 740],
    [390, 844],
    [768, 1024],
    [1440, 900],
    [1920, 1080],
    [844, 390],
  ]) {
    await desktop.setViewportSize({ width, height });
    await desktop.waitForTimeout(450);
    check(
      `No horizontal overflow at ${width}×${height}`,
      await noOverflow(desktop),
    );
    check(
      `WebGL remains live after resize ${width}×${height}`,
      (await metrics(desktop)).mode === "full",
    );
  }
  await desktop.setViewportSize({ width: 1440, height: 900 });
  await position(desktop, 0);
  await desktop.keyboard.press("Tab");
  check(
    "First Tab reveals skip link",
    await desktop.evaluate(() =>
      document.activeElement?.classList.contains("skip-link"),
    ),
  );
  await desktop.keyboard.press("Enter");
  await desktop.waitForTimeout(350);
  check(
    "Skip link reaches and focuses the afterword",
    await desktop.evaluate(
      () =>
        document.activeElement?.id === "afterword" &&
        document.querySelector("#afterword").getBoundingClientRect().top <
          innerHeight,
    ),
  );
  await desktop.goto(base, { waitUntil: "networkidle" });
  await desktop.waitForFunction(() => window.__LAST_WIND__?.metrics().ready);
  await desktop.evaluate(() => scrollTo(0, 0));
  await desktop.keyboard.press("PageDown");
  await desktop.waitForTimeout(1000);
  check(
    "Native Page Down advances the film",
    (await metrics(desktop)).progress > 0.02,
  );
  report.network.desktop = await desktop.evaluate(() => {
    const resources = performance.getEntriesByType("resource");
    return {
      resources: resources.length,
      encodedBytes: resources.reduce((n, r) => n + r.encodedBodySize, 0),
      largest: resources
        .map((r) => ({
          url: r.name.split("/").slice(-2).join("/"),
          bytes: r.encodedBodySize,
        }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 6),
    };
  });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  observe(mobile, "mobile");
  await open(mobile);
  check("Mobile DPR is capped to 1.5", (await metrics(mobile)).dpr <= 1.5);
  check(
    "Mobile uses fewer rendered vertices",
    (await metrics(mobile)).triangles < report.metrics.desktop.triangles,
  );
  for (const [scene, p] of [
    ["opening", 0],
    ["field", 0.29],
    ["storm", 0.64],
    ["return", 0.98],
  ]) {
    await position(mobile, p);
    await shot(mobile, "mobile-" + scene);
    check(`Mobile ${scene} has no overflow`, await noOverflow(mobile));
    report.metrics["mobile-" + scene] = await metrics(mobile);
  }
  await mobile.touchscreen.tap(200, 320);
  await mobile.waitForTimeout(200);
  check("Touch tap can pause ambient movement", (await metrics(mobile)).paused);
  await mobile.touchscreen.tap(200, 320);
  await mobile.waitForTimeout(200);
  check(
    "Second touch tap resumes ambient movement",
    !(await metrics(mobile)).paused,
  );
  const mobileBefore = await metrics(mobile);
  await mobile.waitForTimeout(500);
  check(
    "Touch viewport keeps ambient movement alive",
    (await metrics(mobile)).frames > mobileBefore.frames + 5,
  );
  const reduced = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  observe(reduced, "reduced");
  await open(reduced);
  check(
    "Reduced motion avoids WebGL and pinning",
    (await metrics(reduced)).mode === "still" &&
      !("frames" in (await metrics(reduced))) &&
      (await reduced.locator("body.flat-mode").count()) === 1,
  );
  check(
    "All reduced-motion chapters flow naturally",
    await reduced.evaluate(
      () =>
        [...document.querySelectorAll(".chapter")].every(
          (el) =>
            getComputedStyle(el).position === "relative" &&
            +getComputedStyle(el).opacity === 1,
        ) && document.body.scrollHeight < innerHeight * 5,
    ),
  );
  await shot(reduced, "mobile-reduced-opening");
  await reduced.locator(".storm-chapter").scrollIntoViewIfNeeded();
  await shot(reduced, "mobile-reduced-storm");
  for (let i = 0; i < 2; i++) {
    await reduced.emulateMedia({ reducedMotion: "no-preference" });
    await reduced.waitForFunction(() =>
      document.body.classList.contains("world-ready"),
    );
    await reduced.emulateMedia({ reducedMotion: "reduce" });
    await reduced.waitForTimeout(200);
  }
  check(
    "System motion preference can be changed repeatedly without duplicate canvases",
    (await reduced.locator("canvas").count()) === 1 &&
      (await metrics(reduced)).mode === "still",
  );
  const fallback = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  observe(fallback, "fallback");
  await fallback.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith("webgl")) return null;
      return get.call(this, type, ...args);
    };
  });
  await open(fallback);
  check(
    "WebGL-disabled browser receives readable static artwork",
    (await metrics(fallback)).mode === "fallback" &&
      (await fallback.locator("body.flat-mode").count()) === 1,
  );
  await shot(fallback, "mobile-webgl-fallback");
  const nojs = await browser.newPage({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  observe(nojs, "no-js");
  await nojs.goto(base, { waitUntil: "networkidle" });
  check(
    "No-JavaScript still delivers all four chapters",
    (await nojs.locator("body.flat-mode .chapter").count()) === 4 &&
      (await nojs.locator("h1").textContent()).trim() === "Last Wind",
  );
  await shot(nojs, "mobile-no-javascript");
  const context = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  observe(context, "context-loss");
  await open(context);
  await context.evaluate(() =>
    document
      .querySelector("canvas")
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context")
      .loseContext(),
  );
  await context.waitForTimeout(400);
  check(
    "GPU context loss switches to the complete static film",
    (await context.locator("body.flat-mode").count()) === 1 &&
      (await metrics(context)).mode === "fallback",
  );
  check(
    "No runtime, shader, asset or network errors",
    report.errors.length === 0,
  );
  check("No browser warnings", report.warnings.length === 0);
  report.success = true;
} catch (error) {
  report.success = false;
  report.failure = error.stack;
}
await writeFile(output + "qa-report.json", JSON.stringify(report, null, 2));
await browser.close();
console.log(
  JSON.stringify(
    {
      success: report.success,
      checks: report.checks.length,
      errors: report.errors,
      warnings: report.warnings,
      failure: report.failure,
      metrics: report.metrics.frameTiming,
      renderer: report.metrics.renderer,
      report: output + "qa-report.json",
    },
    null,
    2,
  ),
);
if (!report.success) process.exitCode = 1;
