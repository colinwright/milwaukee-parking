// Fetch the three source GIS layers as GeoJSON (WGS84) into pipeline/.cache/.
// All endpoints verified working 2026-07-10; no API keys required.
//
//   streets    – 18,673 official street centerlines (nearest-segment lookup + names)
//   exceptions – streets exempt from alternate-side parking ("Two Sided Parking")
//   nnp        – no-night-parking streets Dec1–Mar1 (through-highways / bus routes)
//
// ArcGIS layers cap pages at maxRecordCount (2000), so we page with resultOffset.

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CACHE = join(dirname(fileURLToPath(import.meta.url)), '.cache');

const LAYERS = {
  streets: {
    url: 'https://milwaukeemaps.milwaukee.gov/arcgis/rest/services/reference/reference_map/MapServer/20/query',
    outFields: 'StreetName,StreetDirection,StreetType',
    pageSize: 2000,
  },
  exceptions: {
    url: 'https://services1.arcgis.com/5ly0cVV70qsN8Soc/arcgis/rest/services/TwoSidedParking/FeatureServer/0/query',
    outFields: 'Entity',
    pageSize: 2000,
  },
  nnp: {
    url: 'https://services1.arcgis.com/5ly0cVV70qsN8Soc/arcgis/rest/services/noNightParkingD1M1/FeatureServer/0/query',
    outFields: 'Street',
    pageSize: 2000,
  },
};

async function fetchLayer(name, cfg) {
  const features = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: cfg.outFields,
      outSR: '4326',
      f: 'geojson',
      resultOffset: String(offset),
      resultRecordCount: String(cfg.pageSize),
    });
    const res = await fetch(`${cfg.url}?${params}`, {
      headers: { 'User-Agent': 'milwaukee-night-park data pipeline (github.com/milwaukee-night-park)' },
    });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status} at offset ${offset}`);
    const gj = await res.json();
    const batch = gj.features || [];
    features.push(...batch);
    process.stdout.write(`\r  ${name}: ${features.length} features`);
    // Stop when the server signals no more, or a short page comes back.
    if (!gj.exceededTransferLimit && batch.length < cfg.pageSize) break;
    if (batch.length === 0) break;
    offset += batch.length;
  }
  process.stdout.write('\n');
  return { type: 'FeatureCollection', features };
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  for (const [name, cfg] of Object.entries(LAYERS)) {
    const fc = await fetchLayer(name, cfg);
    await writeFile(join(CACHE, `${name}.geojson`), JSON.stringify(fc));
  }
  console.log('Done. Raw layers written to pipeline/.cache/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
