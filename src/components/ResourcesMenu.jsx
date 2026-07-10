import { useEffect, useRef, useState } from 'react';

// Official City of Milwaukee resources people tend to need in the moment.
// These open on the city site (which works fine in a normal browser).
const LINKS = [
  {
    label: 'Get tonight’s parking permission',
    sub: 'Free temporary night permission',
    url: 'https://city.milwaukee.gov/Parking/ParkingPermits/Online-Night-Parking-Permission-Request',
  },
  {
    label: 'Buy a night parking permit',
    sub: 'Daily, weekly, or annual',
    url: 'https://city.milwaukee.gov/Parking/ParkingPermits',
  },
  {
    label: 'Snow emergency status',
    sub: 'Official DPW page',
    url: 'https://city.milwaukee.gov/snow',
  },
  {
    label: 'Look up posted signs by address',
    sub: 'Sign-posted restrictions this app can’t see',
    url: 'https://city.milwaukee.gov/Parking/ParkingRegulations/Street-Parking-Regulations',
  },
  {
    label: 'Full parking regulations',
    url: 'https://city.milwaukee.gov/Parking/ParkingRegulations',
  },
  {
    label: 'Pay a parking citation',
    url: 'https://city.milwaukee.gov/Parking/ParkingCitations',
  },
];

export default function ResourcesMenu({ className = '' }) {
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
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="City resources"
        className="w-full rounded-md border border-white/15 px-3 py-2 text-center text-sm font-medium text-white/90 transition-colors hover:bg-white/10 active:bg-white/15"
      >
        Resources
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-[700] max-h-[70vh] w-72 overflow-y-auto rounded-lg border border-white/10 bg-[#111318] py-1"
        >
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
            City of Milwaukee
          </p>
          {LINKS.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noreferrer noopener"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-white transition-colors hover:bg-white/5"
            >
              <span className="block text-sm font-medium leading-snug">{l.label}</span>
              {l.sub && <span className="mt-0.5 block text-xs text-white/50">{l.sub}</span>}
            </a>
          ))}
          <p className="border-t border-white/10 px-3 py-2 text-[11px] leading-snug text-white/40">
            Opens the official city website. Not affiliated with the City of Milwaukee.
          </p>
        </div>
      )}
    </div>
  );
}
