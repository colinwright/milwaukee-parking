import { useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView.jsx';
import VerdictBanner from './components/VerdictBanner.jsx';
import StatusBanners from './components/StatusBanners.jsx';
import ResourcesMenu from './components/ResourcesMenu.jsx';
import { resolveVerdict } from './lib/rules.js';
import { loadStreets, nearestSegment } from './lib/streets.js';
import { fetchSnowStatus, fetchWeatherAdvisory, inSnowSeason } from './lib/snow.js';
import { MAP } from './lib/palette.js';

const MAX_SNAP_M = 50;

export default function App() {
  const [data, setData] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [center, setCenter] = useState(null);
  const [target, setTarget] = useState(null);
  const [snow, setSnow] = useState(null);
  const [weather, setWeather] = useState(null);
  const [now, setNow] = useState(new Date());
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');

  const inSeason = inSnowSeason(now);

  useEffect(() => {
    loadStreets().then(setData).catch((e) => setDataError(e.message));
    fetchSnowStatus().then(setSnow);
    fetchWeatherAdvisory().then(setWeather);
  }, []);

  // Keep the verdict fresh across the 6 AM / midnight boundaries.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const segment = useMemo(() => {
    if (!data || !center) return null;
    return nearestSegment(data, center.lat, center.lng);
  }, [data, center]);

  const tooFar = Boolean(segment && segment.distanceM > MAX_SNAP_M);

  const verdict = useMemo(() => {
    if (!segment || tooFar) return null;
    return resolveVerdict({
      ex: segment.ex,
      nnp: segment.nnp,
      snowEmergency: Boolean(snow?.emergencyDeclared),
      instant: now,
    });
  }, [segment, tooFar, snow, now]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoMsg('Geolocation not supported on this device.');
      return;
    }
    setGeoMsg('Locating…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoMsg('');
        setTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() });
      },
      () => setGeoMsg('Location denied — search an address or drag the map instead.'),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  async function search(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setGeoMsg('');
    try {
      const params = new URLSearchParams({
        q: `${query}, Milwaukee, WI`,
        format: 'json',
        limit: '1',
        viewbox: '-88.07,43.19,-87.83,42.92',
        bounded: '1',
        email: 'milwaukee-night-park@example.com',
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      const results = await res.json();
      if (results.length) {
        setTarget({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon), ts: Date.now() });
      } else {
        setGeoMsg('Address not found in Milwaukee.');
      }
    } catch {
      setGeoMsg('Address search failed — drag the map instead.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      <MapView
        data={data}
        target={target}
        selectedLabel={tooFar ? null : segment?.label}
        onCenterChange={setCenter}
      />

      {/* Top: title, status banners, search. Sits above the bottom panel so the
          Resources dropdown is never clipped by the verdict card. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[700] flex flex-col gap-2 p-3">
        <div className="pointer-events-auto mx-auto w-full max-w-md rounded-xl border border-white/10 bg-[#111318] p-2.5 text-white">
          <h1 className="px-0.5 text-base font-semibold tracking-tight">Milwaukee Parking</h1>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={useMyLocation}
              className="flex-1 rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 active:bg-white/15"
            >
              Use my location
            </button>
            <ResourcesMenu className="flex-1" />
          </div>
          <form onSubmit={search} className="mt-1.5 flex gap-1.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search an address…"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-white/30"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-md border border-white/15 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-white/10 active:bg-white/15 disabled:opacity-50"
            >
              {searching ? '…' : 'Go'}
            </button>
          </form>
          {geoMsg && <p className="px-0.5 pt-1.5 text-xs text-amber-200">{geoMsg}</p>}
        </div>
        <div className="pointer-events-auto mx-auto w-full max-w-md overflow-hidden rounded-xl shadow-lg">
          <StatusBanners snow={snow} weather={weather} inSeason={inSeason} />
        </div>
      </div>

      {/* Bottom: verdict + legend */}
      <div className="absolute inset-x-0 bottom-0 z-[600] mx-auto w-full max-w-md">
        {dataError ? (
          <div className="border-t-4 border-[#b3261e] bg-[#111318] px-5 py-6 text-white">
            <p className="font-semibold">Couldn’t load street data.</p>
            <p className="mt-1 text-sm text-white/80">{dataError}</p>
          </div>
        ) : (
          <VerdictBanner verdict={verdict} segment={segment} now={now} tooFar={tooFar} />
        )}
        <div className="flex items-center justify-center gap-4 border-t border-white/10 bg-[#111318] px-3 py-2 text-[11px] text-white/70">
          <Legend color={MAP.no} label="No overnight (Dec–Mar)" />
          <Legend color={MAP.either} label="Either side" />
          <Legend color={MAP.selected} label="Selected" />
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-1 w-4 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
