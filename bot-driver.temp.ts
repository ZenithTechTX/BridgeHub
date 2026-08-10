import { chromium, type Page } from "playwright";

const BASE = "http://localhost:3000";
const MATCH_URL = `${BASE}/dashboard/matches/29635129-9d63-4aa5-be10-1e715d45c1e5`;

const BID_RE = /^[1-7](♣|♦|♥|♠|NT)$/;

async function botLoop(page: Page, name: string) {
  const suitRe = /[♠♥♦♣]/;
  while (true) {
    try {
      await page.goto(MATCH_URL, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);

      // Bidding phase: pick uniformly at random among every currently legal
      // call (Pass, Dbl, Rdbl, or any enabled level+strain bid) rather than
      // always passing, so the auction actually develops.
      const callButtons = page.locator("button", { hasText: /^(Pass|Dbl|Rdbl)$/ });
      const bidButtons = page.locator("button", { hasText: BID_RE });
      const callCount = await callButtons.count();
      const bidCount = await bidButtons.count();

      if (callCount > 0 || bidCount > 0) {
        const enabled: import("playwright").Locator[] = [];
        for (let i = 0; i < callCount; i++) {
          const btn = callButtons.nth(i);
          if (await btn.isEnabled()) enabled.push(btn);
        }
        for (let i = 0; i < bidCount; i++) {
          const btn = bidButtons.nth(i);
          if (await btn.isEnabled()) enabled.push(btn);
        }
        if (enabled.length > 0) {
          const pick = enabled[Math.floor(Math.random() * enabled.length)];
          const label = await pick.innerText();
          await pick.click();
          console.log(`[${name}] called ${label}`);
          await page.waitForTimeout(500);
          continue;
        }
      }

      // Play phase: click the first legal (clickable) card.
      const cardButtons = page.locator("button", { hasText: suitRe });
      const n = await cardButtons.count();
      if (n > 0) {
        await cardButtons.first().click();
        console.log(`[${name}] played a card`);
        await page.waitForTimeout(500);
        continue;
      }
    } catch (e) {
      console.log(`[${name}] error, retrying:`, (e as Error).message.slice(0, 100));
    }
    // Idle poll interval — kept well above the app's own 4s AutoRefresh
    // cadence so 3 bot sessions don't pile extra concurrent load onto the
    // same dev server process that's serving the real player's requests.
    await page.waitForTimeout(5000);
  }
}

async function main() {
  const browser = await chromium.launch();

  const dummyCtx = await browser.newContext({ storageState: "bot-dummy.temp.json" });
  const eastCtx = await browser.newContext({ storageState: "bot-east.temp.json" });
  const westCtx = await browser.newContext({ storageState: "bot-west.temp.json" });

  const dummyPage = await dummyCtx.newPage();
  const eastPage = await eastCtx.newPage();
  const westPage = await westCtx.newPage();

  console.log("Bot driver running for South, East, and West. Ctrl+C to stop.");
  await Promise.all([
    botLoop(dummyPage, "South"),
    botLoop(eastPage, "East"),
    botLoop(westPage, "West"),
  ]);
}

main().catch((e) => {
  console.error("DRIVER_FAILED", e);
  process.exit(1);
});
