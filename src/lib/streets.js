// Street data loading + nearest-segment lookup, all client-side.
//
// Data file: { meta, segments: [ [label, flags, [lng,lat,lng,lat,...] ], ... ] }
//   flags bit 1 = exception (exempt from alternate-side)
//   flags bit 2 = no-night-parking (through-highway / bus route, Dec1–Mar1)
//
// A coarse grid index makes nearest-segment queries fast enough to run on every
// map move without a server.

const M_PER_DEG_LAT = 111132;
const CELL_DEG = 0.003; // ~330 m grid cells

let dataPromise = null;

function metersPerDegLng(lat) {
  return 111320 * Math.cos((lat * Math.PI) / 180);
}

function buildIndex(segments) {
  const grid = new Map();
  const put = (cx, cy, i) => {
    const k = `${cx}:${cy}`;
    let b = grid.get(k);
    if (!b) grid.set(k, (b = new Set()));
    b.add(i);
  };
  segments.forEach((seg, i) => {
    const flat = seg[2];
    for (let j = 0; j < flat.length; j += 2) {
      put(Math.floor(flat[j] / CELL_DEG), Math.floor(flat[j + 1] / CELL_DEG), i);
    }
  });
  return grid;
}

export function loadStreets(baseUrl = import.meta.env.BASE_URL) {
  if (!dataPromise) {
    dataPromise = fetch(`${baseUrl}data/streets.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`streets.json: HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => ({ ...data, grid: buildIndex(data.segments) }));
  }
  return dataPromise;
}

// Distance (m) from point P to segment AB, all in a local planar meter frame.
function pointSegDistM(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Nearest street segment to a lat/lng.
 * @returns {{label:string, flags:number, ex:boolean, nnp:boolean, distanceM:number}|null}
 */
export function nearestSegment(data, lat, lng) {
  const mLng = metersPerDegLng(lat);
  const toM = (plng, plat) => [(plng - lng) * mLng, (plat - lat) * M_PER_DEG_LAT];

  const cx = Math.floor(lng / CELL_DEG);
  const cy = Math.floor(lat / CELL_DEG);
  // Expand the search ring until we find candidates (handles sparse areas).
  let candidates = null;
  for (let ring = 1; ring <= 6; ring++) {
    const set = new Set();
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        const b = data.grid.get(`${cx + dx}:${cy + dy}`);
        if (b) for (const i of b) set.add(i);
      }
    }
    if (set.size > 0) {
      candidates = set;
      // one extra ring so a segment just past the first hit isn't missed
      if (ring < 6) {
        const r2 = ring + 1;
        for (let dx = -r2; dx <= r2; dx++) {
          for (let dy = -r2; dy <= r2; dy++) {
            const b = data.grid.get(`${cx + dx}:${cy + dy}`);
            if (b) for (const i of b) set.add(i);
          }
        }
      }
      break;
    }
  }
  if (!candidates) return null;

  let best = null;
  let bestD = Infinity;
  for (const i of candidates) {
    const seg = data.segments[i];
    const flat = seg[2];
    for (let j = 0; j < flat.length - 2; j += 2) {
      const [ax, ay] = toM(flat[j], flat[j + 1]);
      const [bx, by] = toM(flat[j + 2], flat[j + 3]);
      const d = pointSegDistM(0, 0, ax, ay, bx, by);
      if (d < bestD) {
        bestD = d;
        best = seg;
      }
    }
  }
  if (!best) return null;
  return {
    label: best[0] || 'this street',
    flags: best[1],
    ex: Boolean(best[1] & 1),
    nnp: Boolean(best[1] & 2),
    distanceM: bestD,
  };
}
