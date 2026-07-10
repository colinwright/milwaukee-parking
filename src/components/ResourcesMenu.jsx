import { useEffect, useRef, useState } from 'react';

// Official City of Milwaukee resources people tend to need in the moment.
// These open on the city site (which works fine in a normal browser).
const LINKS = [
  {
    icon: '🅿️',
    label: 'Get tonight’s parking permission',
    sub: 'Free temporary night permission',
    url: 'https://city.milwaukee.gov/Parking/ParkingPermits/Online-Night-Parking-Permission-Request',
  },
  {
    icon: '🎫',
    label: 'Buy a night parking permit',
    sub: 'Daily, weekly, or annual',
    url: 'https://city.milwaukee.gov/Parking/ParkingPermits',
  },
  {
    icon: '❄️',
    label: 'Snow emergency status',
    sub: 'Official DPW page',
    url: 'https://city.milwaukee.gov/snow',
  },
  {
    icon: '🪧',
    label: 'Look up posted signs by address',
    sub: 'Sign-posted restrictions this app can’t see',
    url: 'https://city.milwaukee.gov/Parking/ParkingRegulations/Street-Parking-Regulations',
  },
  {
    icon: '📋',
    label: 'Full parking regulations',
    url: 'https://city.milwaukee.gov/Parking/ParkingRegulations',
  },
  {
    icon: '💳',
    label: 'Pay a parking citation',
    url: 'https://city.milwaukee.gov/Parking/ParkingCitations',
  },
];

export default function ResourcesMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="City resources"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-lg leading-none active:bg-white/25"
      >
        ☰
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-[700] max-h-[70vh] w-72 overflow-y-auto rounded-xl bg-slate-800 p-1 shadow-2xl ring-1 ring-white/10"
        >
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/50">
            City of Milwaukee resources
          </p>
          {LINKS.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noreferrer noopener"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 rounded-lg px-3 py-2 text-white hover:bg-white/10"
            >
              <span className="mt-0.5 text-base leading-none">{l.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-snug">{l.label}</span>
                {l.sub && <span className="block text-xs text-white/60">{l.sub}</span>}
              </span>
              <span className="ml-auto self-center text-white/40">↗</span>
            </a>
          ))}
          <p className="px-3 py-2 text-[11px] leading-snug text-white/40">
            Opens the official city website. Not affiliated with the City of Milwaukee.
          </p>
        </div>
      )}
    </div>
  );
}
