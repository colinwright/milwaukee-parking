import { useEffect, useMemo, useRef, useState } from 'react';
import MapView from './components/MapView.jsx';
import VerdictBanner from './components/VerdictBanner.jsx';
import StatusBanners from './components/StatusBanners.jsx';
import ResourcesMenu from './components/ResourcesMenu.jsx';
import AboutDialog from './components/AboutDialog.jsx';
import { resolveVerdict } from './lib/rules.js';
import { loadStreets, nearestSegment } from './lib/streets.js';
import { fetchSnowStatus, fetchWeatherAdvisory, inSnowSeason } from './lib/snow.js';

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
  const [aboutOpen, setAboutOpen] = useState(false);
  const menuButtonRef = useRef(null);

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
      setGeoMsg('Location isn’t available on this device — search an address instead.');
      return;
    }
    setGeoMsg('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoMsg('');
        setTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() });
      },
      () => setGeoMsg('Location access was denied — search an address or move the map instead.'),
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
        setGeoMsg('No match found. Try a street address in Milwaukee.');
      }
    } catch {
      setGeoMsg('Address search isn’t available right now — move the map instead.');
    } finally {
      setSearching(false);
    }
  }

  function closeAbout() {
    setAboutOpen(false);
    // Return focus to the menu button for keyboard/VoiceOver users.
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#111318]">
      <MapView
        data={data}
        target={target}
        selectedLabel={tooFar ? null : segment?.label}
        onCenterChange={setCenter}
      />

      {/* Top: title, actions, search, status banners. Sits above the bottom
          panel so the menu is never clipped by the verdict card. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[700] flex flex-col gap-2 p-3">
        <div className="pointer-events-auto mx-auto w-full max-w-md rounded-xl border border-white/10 bg-[#111318] p-2.5 text-white">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h1 className="text-base font-semibold tracking-tight">Milwaukee Parking</h1>
            <ResourcesMenu buttonRef={menuButtonRef} onAbout={() => setAboutOpen(true)} />
          </div>
          {/* Primary action: filled. Search: attached field + button. */}
          <button
            type="button"
            onClick={useMyLocation}
            className="mt-2 w-full rounded-md bg-[#2160a8] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a6fbd] active:bg-[#1d5695]"
          >
            Use my location
          </button>
          <form onSubmit={search} role="search" aria-label="Find an address" className="mt-1.5 flex">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a Milwaukee address"
              aria-label="Search a Milwaukee address"
              autoComplete="street-address"
              className="min-w-0 flex-1 rounded-l-md border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/50 outline-none focus:border-white/40"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-r-md border border-l-0 border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/15 active:bg-white/20 disabled:opacity-50"
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>
          {geoMsg && (
            <p role="status" className="px-0.5 pt-1.5 text-xs text-amber-200">
              {geoMsg}
            </p>
          )}
        </div>
        <div className="pointer-events-auto mx-auto w-full max-w-md overflow-hidden rounded-xl">
          <StatusBanners snow={snow} weather={weather} inSeason={inSeason} />
        </div>
      </header>

      {/* Bottom: the verdict */}
      <main className="absolute inset-x-0 bottom-0 z-[600] mx-auto w-full max-w-md">
        {dataError ? (
          <div className="border-t-4 border-[#b3261e] bg-[#111318] px-5 py-6 text-white">
            <p className="font-semibold">The street data didn’t load.</p>
            <p className="mt-1 text-sm text-white/70">Refresh the page to try again. ({dataError})</p>
          </div>
        ) : (
          <VerdictBanner verdict={verdict} segment={segment} now={now} tooFar={tooFar} />
        )}
      </main>

      <AboutDialog open={aboutOpen} onClose={closeAbout} />
    </div>
  );
}
