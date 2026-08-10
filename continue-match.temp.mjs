import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { config } from "dotenv";
config({ path: ".env.local" });

const BASE = "http://localhost:3000";
const BOARDS_COUNT = 6;
const BOT_NAMES = ["RoboNorth1", "RoboEast1", "RoboSouth1", "RoboWest1", "RoboNorth2", "RoboEast2", "RoboSouth2", "RoboWest2"];

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function signInNewContext(browser, label) {
  const email = `robot-match2-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${BASE}/auth/confirm` },
  });
  if (error) throw error;
  const url = `${BASE}/auth/confirm?token_hash=${data.properties.hashed_token}&type=${data.properties.verification_type}&next=%2Fdashboard`;
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  return { context, page, email };
}

const browser = await chromium.launch();
const director = await signInNewContext(browser, "director");

console.log("Creating team match...");
await director.page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await director.page.getByText("Team Matches").click();
await director.page.getByLabel("Title").fill("Robot Match — Continued");
await director.page.getByLabel("Team 1", { exact: true }).fill("Team Alpha");
await director.page.getByLabel("Team 2", { exact: true }).fill("Team Bravo");
await director.page.getByRole("tab", { name: "Options" }).click();
await director.page.getByLabel("Number of Boards").fill(String(BOARDS_COUNT));
await director.page.getByRole("tab", { name: "Reserve seats" }).click();
await director.page.getByPlaceholder("North — Player name").first().fill(BOT_NAMES[0]);
await director.page.getByPlaceholder("East — Player name").first().fill(BOT_NAMES[1]);
await director.page.getByPlaceholder("South — Player name").first().fill(BOT_NAMES[2]);
await director.page.getByPlaceholder("West — Player name").first().fill(BOT_NAMES[3]);
await director.page.getByPlaceholder("North — Player name").nth(1).fill(BOT_NAMES[4]);
await director.page.getByPlaceholder("East — Player name").nth(1).fill(BOT_NAMES[5]);
await director.page.getByPlaceholder("South — Player name").nth(1).fill(BOT_NAMES[6]);
await director.page.getByPlaceholder("West — Player name").nth(1).fill(BOT_NAMES[7]);
await director.page.getByRole("button", { name: "Create Team Match" }).click();
await director.page.waitForURL("**/dashboard/matches", { timeout: 15000 });

const matchHref = await director.page.locator('a[href^="/dashboard/matches/"]').first().getAttribute("href");
const matchUrl = `${BASE}${matchHref}`;
const sessionId = matchHref.split("/").pop();
console.log("MATCH_URL=" + matchUrl);
console.log("SESSION_ID=" + sessionId);
await browser.close();
