import { useState } from 'react';
import { formatNightDate } from '../lib/rules.js';
import { VERDICT_BG, MAP } from '../lib/palette.js';

// rules.js returns color 'no' | 'either' | 'odd' | 'even'. Odd and even both map
// to the single alternate-side color; the large ODD/EVEN word carries the detail.
const BG = {
  no: VERDICT_BG.no,
  either: VERDICT_BG.either,
  odd: VERDICT_BG.alt,
  even: VERDICT_BG.alt,
};

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block h-1 w-4 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export default function VerdictBanner({ verdict, segment, now, tooFar }) {
  const [expanded, setExpanded] = useState(false);

  if (tooFar) {
    return (
      <section aria-label="Parking verdict" className="border-t border-white/10 bg-[#111318] px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white">
        <p className="text-lg font-semibold">Aim the crosshair at a street</p>
        <p className="mt-1 text-sm text-white/60">
          No Milwaukee street is within about 150 feet of the center point. Drag the map until the
          crosshair rests on a street.
        </p>
      </section>
    );
  }
  if (!verdict) {
    return (
      <section aria-label="Parking verdict" className="border-t border-white/10 bg-[#111318] px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white">
        <p className="text-lg font-semibold">Loading street data…</p>
      </section>
    );
  }

  return (
    <section aria-label="Tonight’s parking verdict" className="bg-[#111318] pb-[env(safe-area-inset-bottom)] text-white">
      {/* The whole visible card toggles the details — a large, thumb-friendly target. */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="verdict-details"
        className="block w-full px-5 pb-3.5 pt-4 text-left"
        style={{ backgroundColor: BG[verdict.color] }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-xs font-medium uppercase tracking-wide text-white/90">
            {segment?.label || 'This location'}
          </span>
          <span className="shrink-0 text-xs text-white/90">Tonight · {formatNightDate(now)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-2xl font-bold leading-tight tracking-tight">
            {verdict.headline}
          </p>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className={`h-5 w-5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-1 text-sm text-white/90">
          Enforced {verdict.hours}
          <span className="ml-2 text-white/75">{expanded ? '· Hide details' : '· Details'}</span>
        </p>
      </button>

      {expanded && (
        <div
          id="verdict-details"
          // Capped so the expanded card never grows under the top card in
          // landscape; it scrolls instead. Portrait never hits the cap.
          className="max-h-[25dvh] overflow-y-auto px-5 pb-3 pt-3"
        >
          <ul className="space-y-1.5 text-xs leading-relaxed text-white/80">
            {verdict.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 pt-2.5 text-[11px] text-white/70">
            <Legend color={MAP.no} label="No overnight parking (Dec–Mar)" />
            <Legend color={MAP.either} label="Either side" />
            <Legend color={MAP.selected} label="Selected street" />
          </div>
        </div>
      )}
    </section>
  );
}
