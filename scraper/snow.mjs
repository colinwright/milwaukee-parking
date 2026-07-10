// Best-effort snow-emergency scraper (build plan §4, layer 1).
//
// city.milwaukee.gov blocks plain HTTP clients (curl/fetch get HTTP 403), so we
// drive a real headless Chromium via Playwright, which usually passes the bot
// check. Output is written to snow-status.json for the GitHub Actions workflow
// to publish. If anything fails we still emit a well-formed file with the last
// checkedAt omitted — the app's staleness check then shows the manual-check
// banner rather than trusting stale data.
//
// Run in CI:  npx playwright install --with-deps chromium && node scraper/snow.mjs

import { writeFile } from 'node:fs/promises';
import { classifySnowText } from './classify.mjs';

const STATUS_URL = 'https://city.milwaukee.gov/dpw/operations/snowoperationstatus';
const OUT = process.env.SNOW_OUT || 'snow-status.json';

async function scrape() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });
    const page = await ctx.newPage();
    await page.goto(STATUS_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(2500);
    const bodyText = await page.evaluate(() => document.body.innerText || '');
    if (!bodyText || bodyText.length < 40) throw new Error('empty page text');
    return bodyText;
  } finally {
    await browser.close();
  }
}

async function main() {
  let status;
  try {
    const text = await scrape();
    const declared = classifySnowText(text);
    // Keep a short, relevant snippet for debugging / transparency.
    const idx = text.toLowerCase().indexOf('snow');
    const snippet = (idx >= 0 ? text.slice(idx, idx + 280) : text.slice(0, 280))
      .replace(/\s+/g, ' ')
      .trim();
    status = {
      emergencyDeclared: declared,
      checkedAt: new Date().toISOString(),
      rawText: snippet,
    };
    console.log(`Scrape OK. emergencyDeclared=${declared}`);
  } catch (err) {
    // No checkedAt => the app treats it as stale and shows the fallback banner.
    status = {
      emergencyDeclared: false,
      checkedAt: null,
      rawText: `Scrape failed: ${err.message}`,
    };
    console.error(`Scrape failed: ${err.message}`);
  }
  await writeFile(OUT, JSON.stringify(status, null, 2) + '\n');
  console.log(`Wrote ${OUT}`);
}

main();
