// Tag street centerlines with parking flags by geometrically matching them
// against the exception and no-night-parking layers, then emit a compact
// data file for the browser.
//
// The special layers come from different sources than the centerlines and do
// not share vertices, so we match by COVERAGE: densify both to ~15 m points,
// index the special points in a grid, and flag a centerline when enough of its
// length lies within THRESHOLD_M of a special point. Grid indexing keeps this
// near-linear instead of O(streets × specials).

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, '.cache');
const OUT = join(HERE, '..', 'public', 'data', 'streets.json');

const LAT0 = 43.05; // Milwaukee, for the local equirectangular approximation
const M_PER_DEG_LAT = 111132;
const M_PER_DEG_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const STEP_M = 15; // densify spacing
const THRESHOLD_M = 25; // "near" distance for coverage
const COVERAGE = 0.5; // fraction of a centerline that must be near to tag it
const CELL_DEG = 0.0004; // grid cell (~44 m lat) so a 3×3 search covers >25 m

function distM(a, b) {
  const dx = (a[0] - b[0]) * M_PER_DEG_LNG;
  const dy = (a[1] - b[1]) * M_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

// Yield each LineString's coordinate arrays from a GeoJSON geometry.
function* lines(geom) {
  if (!geom) return;
  if (geom.type === 'LineString') yield geom.coordinates;
  else if (geom.type === 'MultiLineString') yield* geom.coordinates;
}

// Densify a coordinate array to points spaced ~STEP_M apart (endpoints kept).
function densify(coords) {
  const out = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const d = distM(a, b);
    const n = Math.max(1, Math.round(d / STEP_M));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  if (coords.length) out.push(coords[coords.length - 1]);
  return out;
}

const cellKey = (lng, lat) => `${Math.floor(lng / CELL_DEG)}:${Math.floor(lat / CELL_DEG)}`;

function buildGrid(featureCollection, skip) {
  const grid = new Map();
  for (const f of featureCollection.features) {
    if (skip && skip(f)) continue;
    for (const coords of lines(f.geometry)) {
      for (const p of densify(coords)) {
        const k = cellKey(p[0], p[1]);
        let bucket = grid.get(k);
        if (!bucket) grid.set(k, (bucket = []));
        bucket.push(p);
      }
    }
  }
  return grid;
}

function nearGrid(grid, p) {
  const cx = Math.floor(p[0] / CELL_DEG);
  const cy = Math.floor(p[1] / CELL_DEG);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const bucket = grid.get(`${cx + dx}:${cy + dy}`);
      if (!bucket) continue;
      for (const q of bucket) if (distM(p, q) <= THRESHOLD_M) return true;
    }
  }
  return false;
}

function coverage(coords, grid) {
  const pts = densify(coords);
  if (pts.length === 0) return 0;
  let near = 0;
  for (const p of pts) if (nearGrid(grid, p)) near++;
  return near / pts.length;
}

function streetLabel(props) {
  const parts = [props.StreetDirection, props.StreetName, props.StreetType]
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

const round5 = (n) => Math.round(n * 1e5) / 1e5;

async function main() {
  console.log('Loading layers…');
  const streets = JSON.parse(await readFile(join(CACHE, 'streets.geojson'), 'utf8'));
  const exceptions = JSON.parse(await readFile(join(CACHE, 'exceptions.geojson'), 'utf8'));
  const nnp = JSON.parse(await readFile(join(CACHE, 'nnp.geojson'), 'utf8'));

  console.log('Indexing special layers…');
  // Drop CAD decoration polygons (legend boxes) from the exception layer.
  const exGrid = buildGrid(exceptions, (f) => f.properties?.Entity === 'Closed Shape');
  const nnpGrid = buildGrid(nnp, null);

  console.log('Tagging centerlines…');
  const segments = [];
  let exCount = 0;
  let nnpCount = 0;
  let done = 0;
  for (const f of streets.features) {
    for (const coords of lines(f.geometry)) {
      if (coords.length < 2) continue;
      let flags = 0;
      if (coverage(coords, exGrid) > COVERAGE) {
        flags |= 1;
        exCount++;
      }
      if (coverage(coords, nnpGrid) > COVERAGE) {
        flags |= 2;
        nnpCount++;
      }
      const flat = [];
      for (const [lng, lat] of coords) flat.push(round5(lng), round5(lat));
      segments.push([streetLabel(f.properties), flags, flat]);
    }
    if (++done % 4000 === 0) process.stdout.write(`\r  ${done}/${streets.features.length}`);
  }
  process.stdout.write('\n');

  const out = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'City of Milwaukee (CC-BY) + Milwaukee parking regulation layers',
      segments: segments.length,
      exceptionSegments: exCount,
      noNightParkingSegments: nnpCount,
      format: '[label, flags(1=exception,2=noNightParking), [lng,lat,...]]',
    },
    segments,
  };
  await writeFile(OUT, JSON.stringify(out));
  const bytes = Buffer.byteLength(JSON.stringify(out));
  console.log(
    `Wrote ${segments.length} segments (${exCount} exception, ${nnpCount} no-night-parking) → ` +
      `${(bytes / 1e6).toFixed(2)} MB → ${OUT}`
  );

  // Spot check: North Ave is a major through-highway/bus route → expect nnp.
  // (Centerline labels use the "AV" abbreviation, e.g. "E NORTH AV".)
  const northAve = segments.filter((s) => /\bNORTH AV$/i.test(s[0]));
  const northAveTagged = northAve.filter((s) => s[1] & 2).length;
  console.log(
    `Spot check — "…NORTH AV" segments: ${northAve.length}, tagged no-night-parking: ${northAveTagged}` +
      (northAve.length && northAveTagged / northAve.length > 0.8 ? '  ✓' : '  ⚠️ EXPECTED MOST TAGGED')
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
