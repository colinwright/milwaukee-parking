// Snow-emergency status, three independent layers (see build plan §4):
//   1. snow-status.json  – best-effort scrape published by GitHub Actions
//   2. staleness check    – if that file is old, we don't trust it
//   3. NWS alerts         – independent winter-storm advisory, direct from browser
//
// The app NEVER presents stale scrape data as current.

const STALE_MS = 3 * 60 * 60 * 1000; // 3 hours
const MKE_POINT = '43.0389,-87.9065';

// Winter window during which we bother checking snow status at all.
export function inSnowSeason(now = new Date()) {
  const m = now.getMonth() + 1; // local month is fine for a coarse seasonal gate
  const d = now.getDate();
  if (m === 12 || m === 1 || m === 2) return true;
  if (m === 11 && d >= 15) return true;
  if (m === 3 && d <= 15) return true;
  return false;
}

/**
 * Read the published snow status.
 * @returns {Promise<{emergencyDeclared:boolean, stale:boolean, checkedAt:string|null, available:boolean}>}
 */
export async function fetchSnowStatus(baseUrl = import.meta.env.BASE_URL, now = new Date()) {
  // VITE_SNOW_URL lets the scrape output live on a decoupled branch/host
  // (e.g. raw.githubusercontent.com/<user>/<repo>/data/snow-status.json), so
  // hourly status updates never trigger a site rebuild. Falls back to the
  // bundled seed file, which is intentionally stale → manual-check banner.
  const url = import.meta.env.VITE_SNOW_URL || `${baseUrl}snow-status.json`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const checkedAt = data.checkedAt || null;
    const age = checkedAt ? now.getTime() - new Date(checkedAt).getTime() : Infinity;
    const stale = age > STALE_MS;
    return {
      emergencyDeclared: !stale && Boolean(data.emergencyDeclared),
      stale,
      checkedAt,
      available: !stale,
    };
  } catch {
    return { emergencyDeclared: false, stale: true, checkedAt: null, available: false };
  }
}

/**
 * Independent winter-storm advisory from the National Weather Service.
 * Free, keyless, CORS-enabled. Returns the active headline if any.
 * @returns {Promise<{active:boolean, event:string|null}>}
 */
export async function fetchWeatherAdvisory() {
  try {
    const res = await fetch(`https://api.weather.gov/alerts/active?point=${MKE_POINT}`, {
      headers: { Accept: 'application/geo+json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const snowy = (data.features || []).find((f) => {
      const e = (f.properties?.event || '').toLowerCase();
      return e.includes('winter') || e.includes('snow') || e.includes('blizzard') || e.includes('ice');
    });
    return { active: Boolean(snowy), event: snowy ? snowy.properties.event : null };
  } catch {
    return { active: false, event: null };
  }
}
