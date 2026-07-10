import { useEffect, useRef } from 'react';
import { version } from '../../package.json';

const CREDITS = [
  {
    name: 'City of Milwaukee Open Data',
    detail: 'Street centerlines and parking-regulation map layers (CC-BY)',
    url: 'https://data.milwaukee.gov',
  },
  {
    name: 'OpenStreetMap contributors',
    detail: 'Base map tiles and address search (Nominatim)',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    name: 'National Weather Service',
    detail: 'Winter storm alerts',
    url: 'https://www.weather.gov',
  },
  {
    name: 'Source code on GitHub',
    detail: 'See how it works, or report a problem',
    url: 'https://github.com/colinwright/milwaukee-parking',
  },
];

const FAQ = [
  {
    q: 'Which side do I park on?',
    a: 'Park on the side whose house numbers match tonight’s date: odd date, odd side; even date, even side. What counts is tonight’s date, not tomorrow morning’s. So on July 10th you park on the even side, since 10 is even, and you’re fine there until 6 AM on the 11th.',
  },
  {
    q: 'What counts as overnight, and do I need a permit?',
    a: 'In Milwaukee, overnight parking means parking on the street between 2 and 6 AM. During those hours you need a city night parking permit or free temporary permission, except on Sunday mornings and several holidays. You’ll find links to both in the menu.',
  },
  {
    q: 'What changes during a snow emergency?',
    a: 'The hours start earlier, running 10 PM to 6 AM citywide, and you can’t park on through-highways or bus routes at all. Cars left on them get towed.',
  },
];

export default function AboutDialog({ open, onClose }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Keep Tab focus inside the dialog (simple trap).
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll('a[href], button');
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[800] flex items-end justify-center bg-black/60 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-xl border border-white/10 bg-[#111318] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="about-title" className="text-lg font-semibold tracking-tight">
              About Milwaukee Parking
            </h2>
            <p className="mt-0.5 text-xs text-white/60">
              Version {version} · by{' '}
              <a href="https://colin.io" target="_blank" rel="noreferrer noopener" className="underline decoration-white/40 underline-offset-2 hover:decoration-white">
                Colin Wright
              </a>
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-2.5 py-1 text-sm text-white/90 transition-colors hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-white/85">
          Milwaukee’s overnight parking rules are a hassle to keep straight: which side of the
          street, which nights, plus the winter and snow-emergency exceptions. This app works it out
          for you. Point the crosshair at a street or search an address, and it tells you where to
          park tonight and when the rules apply.
        </p>

        <h3 className="mt-5 text-sm font-semibold">Common questions</h3>
        <dl className="mt-2 space-y-3">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="text-sm font-medium text-white/90">{f.q}</dt>
              <dd className="mt-0.5 text-xs leading-relaxed text-white/70">{f.a}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-5 text-sm font-semibold">Data &amp; credits</h3>
        <ul className="mt-2 space-y-2">
          {CREDITS.map((c) => (
            <li key={c.url} className="text-xs leading-snug">
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
              >
                {c.name}
              </a>
              <span className="text-white/60"> — {c.detail}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 border-t border-white/10 pt-3 text-[11px] leading-snug text-white/60">
          This is an independent project, not affiliated with the City of Milwaukee. Always follow
          posted signs; they override anything shown here, and none of this is legal advice.
        </p>
      </div>
    </div>
  );
}
