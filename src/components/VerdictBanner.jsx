import { formatNightDate } from '../lib/rules.js';

const BG = {
  no: 'bg-red-600',
  either: 'bg-green-600',
  odd: 'bg-blue-600',
  even: 'bg-cyan-600',
};

export default function VerdictBanner({ verdict, segment, now, tooFar }) {
  if (tooFar) {
    return (
      <div className="rounded-t-2xl bg-slate-700 px-5 py-6 text-white shadow-2xl">
        <p className="text-lg font-semibold">Move the crosshair onto a Milwaukee street</p>
        <p className="mt-1 text-sm text-slate-200">
          No street found within 50&nbsp;m of the center point.
        </p>
      </div>
    );
  }
  if (!verdict) {
    return (
      <div className="rounded-t-2xl bg-slate-700 px-5 py-6 text-white shadow-2xl">
        <p className="text-lg font-semibold">Loading map data…</p>
      </div>
    );
  }

  return (
    <div className={`rounded-t-2xl px-5 pb-5 pt-4 text-white shadow-2xl ${BG[verdict.color]}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-white/80">
          {segment?.label || 'This location'}
        </span>
        <span className="text-xs text-white/80">Tonight · {formatNightDate(now)}</span>
      </div>

      <p className="mt-1 text-2xl font-extrabold leading-tight">{verdict.headline}</p>
      <p className="mt-0.5 text-sm font-medium text-white/90">Enforced {verdict.hours}</p>

      <ul className="mt-3 space-y-1 border-t border-white/25 pt-3 text-xs text-white/90">
        {verdict.notes.map((n, i) => (
          <li key={i}>• {n}</li>
        ))}
      </ul>
    </div>
  );
}
