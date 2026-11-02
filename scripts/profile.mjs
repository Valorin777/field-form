import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  channel: "chromium",
  args: ["--use-angle=metal"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto("http://127.0.0.1:4175/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  console.log(
    await page.evaluate(() => {
      const gl = document.querySelector("canvas").getContext("webgl2"),
        ext = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
        vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
        metrics: window.__FIELD_FORM__.metrics(),
      };
    }),
  );
  for (const state of ["running", "paused"]) {
    if (state === "paused") await page.locator("#motion-toggle").click();
    const m = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let prior;
          const a = [];
          function f(t) {
            if (prior) a.push(t - prior);
            prior = t;
            if (a.length < 90) requestAnimationFrame(f);
            else
              resolve({
                median: [...a].sort((a, b) => a - b)[45],
                fps: 90000 / a.reduce((a, b) => a + b, 0),
              });
          }
          requestAnimationFrame(f);
        }),
    );
    console.log(state, m);
  }
} finally {
  await browser.close();
}
