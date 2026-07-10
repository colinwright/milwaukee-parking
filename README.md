# Milwaukee Parking

A mobile-first web app that gives a definitive **yes / no / odd / even** answer for
where you can park overnight on Milwaukee city streets tonight. It factors in the
year-round alternate-side rule, exception streets, through-highway / bus-route
restrictions, and declared snow emergencies — all client-side, hosted free on
GitHub Pages, with **no server, no database, and no API keys**.

> ⚠️ **Not legal advice.** Posted signs always take precedence. Overnight parking
> requires a valid Night Parking Permit or temporary permission. Verify before you
> rely on any verdict here.

## How it works

- **100% static.** React + Vite + Leaflet (OpenStreetMap tiles). The browser loads
  a pre-tagged street dataset and computes the verdict itself.
- **Data** comes from public City of Milwaukee GIS layers (CC-BY), fetched and
  tagged at build time — see [`pipeline/`](pipeline). No live city API is hit at
  runtime.
- **Snow emergencies** are handled by three independent layers (see below), and the
  app never presents stale scrape data as current.

## Rules encoded

Transcribed from the City's official parking-regulations page (see
`../MilwaukeeParkingApp-BuildPlan.md` §1). The load-bearing subtlety:

> The parking side matches the calendar date the night **started** on (the date
> before midnight). The evening of an **odd** date → park on the **ODD** side, and
> that stays legal through the 2–6 AM enforcement window the next morning.

All time math is forced to `America/Chicago` regardless of device timezone. The
rule engine ([`src/lib/rules.js`](src/lib/rules.js)) is covered by an exhaustive
test suite ([`src/lib/rules.test.js`](src/lib/rules.test.js)) including DST edges,
month/year boundaries, the 05:59-vs-06:00 flip, and the snow × season × street-type
matrix. **Run `npm test` before changing anything in `rules.js`.**

## Project layout

| Path | What |
|---|---|
| `src/lib/rules.js` | Date logic + verdict resolution tree (the core) |
| `src/lib/streets.js` | Loads tagged data, nearest-segment lookup |
| `src/lib/snow.js` | Snow-status fetch + staleness + NWS advisory |
| `src/components/` | Map, verdict banner, status banners |
| `pipeline/` | Build-time: fetch GIS layers → tag centerlines → `public/data/streets.json` |
| `scraper/` | Playwright snow-emergency scraper (runs in CI only) |
| `.github/workflows/` | Deploy, monthly data refresh, hourly winter snow scrape |

## Develop

```bash
npm install
npm test            # rule + classifier unit tests
npm run dev         # http://localhost:5173/milwaukee-night-park/
npm run data:all    # re-fetch + re-tag street data (writes public/data/streets.json)
```

## Deploy (GitHub Pages)

1. Push to a GitHub repo and enable **Settings → Pages → Source: GitHub Actions**.
2. `deploy.yml` builds and publishes on every push to `main`. It auto-derives the
   base path from the repo name and points the app at the `data` branch for live
   snow status. (Custom domain? Set `BASE_PATH=/` in the workflow.)
3. The app is served at `https://<user>.github.io/<repo>/`.

Everything runs within GitHub's free tier: public-repo Actions minutes are
unlimited, and there is no server to keep alive.

## Snow-emergency status (three layers)

1. **Live scrape** — `snow.yml` runs hourly during Nov 15 – Mar 15, driving headless
   Chromium (Playwright) against the DPW status page (which blocks plain HTTP
   clients), and publishes `snow-status.json` to the `data` branch. The app reads it
   cross-origin from `raw.githubusercontent.com`, so status updates never rebuild the
   site.
2. **Staleness fallback** — if that file is older than 3 hours (or the scrape fails),
   the app shows *"Live snow status unavailable — check milwaukee.gov/snow"* instead
   of trusting it.
3. **NWS advisory** — the browser independently queries the free National Weather
   Service API; an active winter-storm warning surfaces a heads-up even if the scrape
   is down.

If Playwright is ever blocked from Actions runners too, delete `snow.yml`; layers 2
and 3 keep the app honest and useful.

## Maintenance (~15 min/year)

- **Every November**, re-read the City parking-regulations page and confirm the rules
  in `src/lib/rules.js` still match. Milwaukee changed alternate-side from seasonal to
  year-round within the last few years — assume rules can change again.
- Street data refreshes automatically on the 1st of each month (`refresh-data.yml`);
  a failed run keeps the last-good data.

## Data sources

- Street centerlines & regulation layers — City of Milwaukee ArcGIS (CC-BY)
- Base map tiles — OpenStreetMap contributors
- Geocoding — OpenStreetMap Nominatim
- Weather alerts — U.S. National Weather Service (public domain)
