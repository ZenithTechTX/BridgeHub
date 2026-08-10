import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function main() {
  const url =
    process.argv[2] || `${BASE}/dashboard/matches/29635129-9d63-4aa5-be10-1e715d45c1e5/record`;

  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: "bot-dummy.temp.json" });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const outPath = process.argv[3] || "bigdemo-room2.temp.png";
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`Saved screenshot to ${outPath}.`);

  await browser.close();
}

main().catch((e) => {
  console.error("SHOT_FAILED", e);
                                                                                                                                                          process.exit(1);
});
