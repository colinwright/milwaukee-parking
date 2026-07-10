import { useEffect, useRef, useState } from 'react';

// Official City of Milwaukee resources people tend to need in the moment.
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

export default function ResourcesMenu({ onAbout, buttonRef }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);

  // Close on outside interaction or Escape; focus the first item on open.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef?.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, buttonRef]);

  // Arrow-key navigation between menu items (WAI-ARIA menu pattern).
  function onMenuKeyDown(e) {
    const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(i + 1) % items.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu"
        className="rounded-md border border-white/15 p-2 text-white/90 transition-colors hover:bg-white/10 active:bg-white/15"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            d="M2 4.5h14M2 9h14M2 13.5h14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Menu"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-[700] mt-1.5 max-h-[70dvh] w-72 overflow-y-auto rounded-lg border border-white/10 bg-[#111318] py-1"
        >
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-white/55">
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
              className="block px-3 py-2 text-white transition-colors hover:bg-white/5 focus:bg-white/5"
            >
              <span className="block text-sm font-medium leading-snug">
                {l.label}
                <span className="sr-only"> (opens the city website in a new tab)</span>
              </span>
              {l.sub && <span className="mt-0.5 block text-xs text-white/60">{l.sub}</span>}
            </a>
          ))}
          <div className="mt-1 border-t border-white/10 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onAbout?.();
              }}
              className="block w-full px-3 py-2 text-left text-white transition-colors hover:bg-white/5 focus:bg-white/5"
            >
              <span className="block text-sm font-medium leading-snug">About this app</span>
              <span className="mt-0.5 block text-xs text-white/60">Version, data sources, and credits</span>
            </button>
          </div>
          <p className="border-t border-white/10 px-3 py-2 text-[11px] leading-snug text-white/60">
            City links open the official milwaukee.gov site. This app is an independent project, not
            affiliated with the City of Milwaukee.
          </p>
        </div>
      )}
    </div>
  );
}
