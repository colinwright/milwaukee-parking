// Milwaukee Parking — parking rule engine.
//
// This module is the entire value of the app. Every rule here is transcribed
// from the City of Milwaukee's official parking-regulations page (see
// MilwaukeeParkingApp-BuildPlan.md §1). Do not "simplify" the date logic
// without re-running rules.test.js — the odd/even direction is the single
// most common bug in parking apps and is counterintuitive.
//
// Key facts:
//  - The parking side matches the calendar date the night STARTED on (the date
//    before midnight), not the morning date. Evening of Jan 1 (odd) => ODD side,
//    legal through the 2–6 AM enforcement window of Jan 2.
//  - All time math is forced to America/Chicago regardless of device timezone.

const CT = 'America/Chicago';

/**
 * Wall-clock calendar/time components in Central Time for a given instant.
 * @param {Date} instant
 * @returns {{year:number, month:number, day:number, hour:number, minute:number, weekday:number}}
 *          weekday: 0=Sunday .. 6=Saturday
 */
export function ctParts(instant = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: CT,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = {};
  for (const p of fmt.formatToParts(instant)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  let hour = parseInt(parts.hour, 10);
  if (hour === 24) hour = 0; // some engines emit "24" at midnight
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour,
    minute: parseInt(parts.minute, 10),
    weekday: weekdayMap[parts.weekday],
  };
}

// Add days to a {year,month,day} using a UTC anchor at noon to dodge all DST
// edges. Returns a normalized {year,month,day,weekday}.
function addDays({ year, month, day }, delta) {
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() + delta);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
  };
}

/**
 * The operative "parking night" date — the calendar date the current overnight
 * period began on, in Central Time.
 *   - 00:00–05:59 CT  -> yesterday (you're inside a night that started yesterday)
 *   - 06:00–23:59 CT  -> today (tonight)
 */
export function nightDate(instant = new Date()) {
  const p = ctParts(instant);
  const base = { year: p.year, month: p.month, day: p.day };
  return p.hour < 6 ? addDays(base, -1) : { ...base, weekday: p.weekday };
}

/** 'ODD' or 'EVEN' — the house-number side to park on for tonight. */
export function parkingSide(instant = new Date()) {
  return nightDate(instant).day % 2 === 1 ? 'ODD' : 'EVEN';
}

/**
 * Winter no-night-parking season for through-highways / bus routes: Dec 1–Mar 1
 * inclusive. Evaluated on the given {month, day}.
 */
export function inD1M1({ month, day }) {
  if (month === 12 || month === 1 || month === 2) return true;
  if (month === 3 && day === 1) return true;
  return false;
}

// ---- U.S. federal-ish holidays that waive the night-parking permit ----
function nthWeekdayOfMonth(year, month, weekday, n) {
  // month 1-12, weekday 0-6 (Sun=0), n=1..5. Returns day-of-month.
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (weekday - first + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}
function lastWeekdayOfMonth(year, month, weekday) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDow = new Date(Date.UTC(year, month - 1, daysInMonth)).getUTCDay();
  return daysInMonth - ((lastDow - weekday + 7) % 7);
}

/** Set of "MM-DD" strings for the permit-exempt holidays in a given year. */
function permitExemptHolidays(year) {
  const pad = (n) => String(n).padStart(2, '0');
  const mmdd = (m, d) => `${pad(m)}-${pad(d)}`;
  return new Set([
    mmdd(1, 1), // New Year's Day
    mmdd(1, nthWeekdayOfMonth(year, 1, 1, 3)), // MLK Day (3rd Mon Jan)
    mmdd(5, lastWeekdayOfMonth(year, 5, 1)), // Memorial Day (last Mon May)
    mmdd(7, 4), // Independence Day
    mmdd(9, nthWeekdayOfMonth(year, 9, 1, 1)), // Labor Day (1st Mon Sep)
    mmdd(11, nthWeekdayOfMonth(year, 11, 4, 4)), // Thanksgiving (4th Thu Nov)
    mmdd(12, 25), // Christmas
  ]);
}

/**
 * Is the 2–6 AM window that follows this parking night permit-exempt?
 * Exempt on: Sunday mornings, and the morning OF and morning AFTER each holiday.
 * The morning window belongs to the calendar day AFTER nightDate.
 */
export function isPermitExemptNight(instant = new Date()) {
  const nd = nightDate(instant);
  const morning = addDays(nd, 1); // the calendar day the 2–6 AM window lands on
  if (morning.weekday === 0) return true; // Sunday morning
  const pad = (n) => String(n).padStart(2, '0');
  const key = (dt) => `${pad(dt.month)}-${pad(dt.day)}`;
  // Exempt on the morning OF a holiday and the morning of the day FOLLOWING it,
  // so check both the morning date and the day before it against the holiday set.
  const prev = addDays(morning, -1);
  return (
    permitExemptHolidays(morning.year).has(key(morning)) ||
    permitExemptHolidays(prev.year).has(key(prev))
  );
}

const PERMIT_NOTE =
  'An Overnight Parking Permit or Temporary Night Parking Permission is required.';
const SIGNS_NOTE = 'Posted signs always take precedence over this app.';

/**
 * Resolve the parking verdict for a location.
 *
 * @param {object} opts
 * @param {boolean} opts.nnp   Segment is a no-night-parking street (through-highway / bus route).
 * @param {boolean} opts.ex    Segment is an alternate-side exception street.
 * @param {boolean} opts.snowEmergency  A snow emergency is currently declared.
 * @param {Date}    opts.instant        Evaluation instant (defaults to now).
 * @returns {{
 *   kind: 'no-parking'|'either-side'|'alternate-side',
 *   side: 'ODD'|'EVEN'|null,
 *   color: 'no'|'either'|'odd'|'even',
 *   headline: string,
 *   hours: string,
 *   notes: string[],
 *   nightDate: {year:number,month:number,day:number},
 * }}
 */
export function resolveVerdict({ nnp = false, ex = false, snowEmergency = false, instant = new Date() } = {}) {
  const nd = nightDate(instant);
  const winter = inD1M1(nd);
  const side = parkingSide(instant);
  const notes = [];
  const permitExempt = isPermitExemptNight(instant);

  const finalize = (v) => {
    if (v.kind !== 'no-parking') {
      notes.push(permitExempt ? 'No permit required tonight (Sunday or holiday morning).' : PERMIT_NOTE);
    }
    notes.push(SIGNS_NOTE);
    return { ...v, notes, nightDate: { year: nd.year, month: nd.month, day: nd.day } };
  };

  // 1. Snow emergency overrides everything: 10 PM – 6 AM citywide.
  if (snowEmergency) {
    if (nnp) {
      return finalize({
        kind: 'no-parking',
        side: null,
        color: 'no',
        headline: 'NO PARKING — vehicle will be towed',
        hours: '10 PM–6 AM (snow emergency)',
      });
    }
    if (ex) {
      return finalize({
        kind: 'either-side',
        side: null,
        color: 'either',
        headline: 'Park on EITHER side',
        hours: '10 PM–6 AM (snow emergency)',
      });
    }
    return finalize({
      kind: 'alternate-side',
      side,
      color: side === 'ODD' ? 'odd' : 'even',
      headline: `Park on the ${side} side tonight`,
      hours: '10 PM–6 AM (snow emergency)',
    });
  }

  // 2. No emergency, Dec 1 – Mar 1: through-highways / bus routes are no-parking.
  if (winter && nnp) {
    return finalize({
      kind: 'no-parking',
      side: null,
      color: 'no',
      headline: 'NO PARKING on this street overnight',
      hours: '2–6 AM (Dec 1–Mar 1: through-highway or bus route)',
    });
  }

  // 3. Exception street: exempt from alternate-side.
  if (ex) {
    return finalize({
      kind: 'either-side',
      side: null,
      color: 'either',
      headline: 'Park on EITHER side',
      hours: '2–6 AM',
    });
  }

  // 4. Standard alternate-side baseline.
  const v = {
    kind: 'alternate-side',
    side,
    color: side === 'ODD' ? 'odd' : 'even',
    headline: `Park on the ${side} side tonight`,
    hours: '2–6 AM',
  };
  if (nnp) notes.push('This is a through-highway or bus route; posted signs likely restrict parking.');
  return finalize(v);
}

/** Human-readable nightDate, e.g. "Thu, Jan 1". */
export function formatNightDate(instant = new Date()) {
  const nd = nightDate(instant);
  const d = new Date(Date.UTC(nd.year, nd.month - 1, nd.day, 12));
  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
