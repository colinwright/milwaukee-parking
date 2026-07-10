// Snow-emergency + weather advisory banners shown above the map.
export default function StatusBanners({ snow, weather, inSeason }) {
  const banners = [];

  if (snow?.emergencyDeclared) {
    banners.push({
      key: 'emergency',
      className: 'bg-red-700 text-white',
      text: '❄️ SNOW EMERGENCY DECLARED — night parking rules are 10 PM–6 AM citywide. No parking on through-highways or bus routes.',
    });
  } else if (inSeason && snow && !snow.available) {
    banners.push({
      key: 'stale',
      className: 'bg-amber-500 text-black',
      text: (
        <>
          Live snow status unavailable — check{' '}
          <a className="underline" href="https://city.milwaukee.gov/snow" target="_blank" rel="noreferrer">
            milwaukee.gov/snow
          </a>{' '}
          before relying on this.
        </>
      ),
    });
  }

  if (weather?.active) {
    banners.push({
      key: 'weather',
      className: 'bg-sky-700 text-white',
      text: `⚠️ ${weather.event} active for Milwaukee — the city may declare a snow emergency.`,
    });
  }

  if (!banners.length) return null;
  return (
    <div className="space-y-px">
      {banners.map((b) => (
        <div key={b.key} className={`px-4 py-2 text-center text-xs font-medium ${b.className}`}>
          {b.text}
        </div>
      ))}
    </div>
  );
}
