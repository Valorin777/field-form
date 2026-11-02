import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.goto(process.env.QA_URL || "http://127.0.0.1:4174/", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1400);
  const travel = await page.evaluate(
    () => document.querySelector(".journey").offsetHeight - innerHeight,
  );
  for (const [name, p] of [
    ["separate", 0.46],
    ["transform", 0.88],
  ]) {
    await page.evaluate((y) => scrollTo(0, y), travel * p);
    await page.waitForTimeout(1800);
    const data = await page.evaluate(() => window.__FIELD_FORM__.capture());
    const bytes = Buffer.from(data.split(",")[1], "base64");
    await writeFile(
      new URL("../public/objects/" + name + ".webp", import.meta.url),
      bytes,
    );
    console.log(name, bytes.length);
  }
} finally {
  await browser.close();
}
