// Snow-emergency + weather advisory banners shown above the map.
export default function StatusBanners({ snow, weather, inSeason }) {
  const banners = [];

  if (snow?.emergencyDeclared) {
    banners.push({
      key: 'emergency',
      style: { backgroundColor: '#b3261e', color: '#fff' },
      text: 'Snow emergency declared — night parking rules are 10 PM–6 AM citywide. No parking on through-highways or bus routes.',
    });
  } else if (inSeason && snow && !snow.available) {
    banners.push({
      key: 'stale',
      style: { backgroundColor: '#e08a1e', color: '#111318' },
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
      style: { backgroundColor: '#1f4e8c', color: '#fff' },
      text: `${weather.event} active for Milwaukee — the city may declare a snow emergency.`,
    });
  }

  if (!banners.length) return null;
  return (
    <div className="space-y-px">
      {banners.map((b) => (
        <div
          key={b.key}
          role={b.key === 'emergency' ? 'alert' : 'status'}
          style={b.style}
          className="px-4 py-2 text-center text-xs font-medium"
        >
          {b.text}
        </div>
      ))}
    </div>
  );
}
