import { formatNightDate } from '../lib/rules.js';
import { VERDICT_BG } from '../lib/palette.js';

// rules.js returns color 'no' | 'either' | 'odd' | 'even'. Odd and even both map
// to the single alternate-side color; the large ODD/EVEN word carries the detail.
const BG = {
  no: VERDICT_BG.no,
  either: VERDICT_BG.either,
  odd: VERDICT_BG.alt,
  even: VERDICT_BG.alt,
};

export default function VerdictBanner({ verdict, segment, now, tooFar }) {
  if (tooFar) {
    return (
      <div className="border-t border-white/10 bg-[#111318] px-5 py-6 text-white">
        <p className="text-lg font-semibold">Move the crosshair onto a Milwaukee street</p>
        <p className="mt-1 text-sm text-white/60">
          No street found within 50&nbsp;m of the center point.
        </p>
      </div>
    );
  }
  if (!verdict) {
    return (
      <div className="border-t border-white/10 bg-[#111318] px-5 py-6 text-white">
        <p className="text-lg font-semibold">Loading map data…</p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-5 pt-4 text-white" style={{ backgroundColor: BG[verdict.color] }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-xs font-medium uppercase tracking-wide text-white/75">
          {segment?.label || 'This location'}
        </span>
        <span className="shrink-0 text-xs text-white/75">Tonight · {formatNightDate(now)}</span>
      </div>

      <p className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight">{verdict.headline}</p>
      <p className="mt-1 text-sm text-white/85">Enforced {verdict.hours}</p>

      <ul className="mt-3.5 space-y-1.5 border-t border-white/20 pt-3 text-xs leading-relaxed text-white/85">
        {verdict.notes.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
