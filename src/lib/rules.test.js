import { describe, it, expect } from 'vitest';
import {
  ctParts,
  nightDate,
  parkingSide,
  inD1M1,
  isPermitExemptNight,
  resolveVerdict,
} from './rules.js';

// Build the UTC instant whose America/Chicago wall clock matches the given
// components, by finding the offset that round-trips. Handles CST/CDT and DST
// edges without hardcoding offsets.
function ctInstant(y, mo, d, h, mi = 0) {
  for (const off of [4, 5, 6, 7]) {
    const t = new Date(Date.UTC(y, mo - 1, d, h + off, mi));
    const p = ctParts(t);
    if (p.year === y && p.month === mo && p.day === d && p.hour === h && p.minute === mi) {
      return t;
    }
  }
  throw new Error(`no CT instant for ${y}-${mo}-${d} ${h}:${mi}`);
}

describe('nightDate + parkingSide — the 10 required vectors', () => {
  const cases = [
    ['2026-01-01 20:00', ctInstant(2026, 1, 1, 20, 0), { y: 2026, m: 1, d: 1 }, 'ODD'],
    ['2026-01-02 01:30', ctInstant(2026, 1, 2, 1, 30), { y: 2026, m: 1, d: 1 }, 'ODD'],
    ['2026-01-02 05:59', ctInstant(2026, 1, 2, 5, 59), { y: 2026, m: 1, d: 1 }, 'ODD'],
    ['2026-01-02 06:00', ctInstant(2026, 1, 2, 6, 0), { y: 2026, m: 1, d: 2 }, 'EVEN'],
    ['2026-01-31 22:00', ctInstant(2026, 1, 31, 22, 0), { y: 2026, m: 1, d: 31 }, 'ODD'],
    ['2026-02-01 22:00 (two odd nights)', ctInstant(2026, 2, 1, 22, 0), { y: 2026, m: 2, d: 1 }, 'ODD'],
    ['2026-03-08 03:00 (spring forward)', ctInstant(2026, 3, 8, 3, 0), { y: 2026, m: 3, d: 7 }, 'ODD'],
    ['2026-11-01 01:30 (fall back)', ctInstant(2026, 11, 1, 1, 30), { y: 2026, m: 10, d: 31 }, 'ODD'],
    ['2025-12-31 23:59', ctInstant(2025, 12, 31, 23, 59), { y: 2025, m: 12, d: 31 }, 'ODD'],
  ];
  for (const [label, instant, expDate, expSide] of cases) {
    it(label, () => {
      const nd = nightDate(instant);
      expect({ y: nd.year, m: nd.month, d: nd.day }).toEqual(expDate);
      expect(parkingSide(instant)).toBe(expSide);
    });
  }

  it('is independent of how the Date was constructed (device timezone)', () => {
    // 2026-01-02T02:00Z is 2026-01-01 20:00 CST regardless of device TZ.
    const utcInstant = new Date('2026-01-02T02:00:00Z');
    const nd = nightDate(utcInstant);
    expect({ y: nd.year, m: nd.month, d: nd.day }).toEqual({ y: 2026, m: 1, d: 1 });
    expect(parkingSide(utcInstant)).toBe('ODD');
  });
});

describe('inD1M1 season boundaries', () => {
  it('includes Dec, Jan, Feb and Mar 1', () => {
    expect(inD1M1({ month: 12, day: 1 })).toBe(true);
    expect(inD1M1({ month: 12, day: 31 })).toBe(true);
    expect(inD1M1({ month: 1, day: 15 })).toBe(true);
    expect(inD1M1({ month: 2, day: 28 })).toBe(true);
    expect(inD1M1({ month: 3, day: 1 })).toBe(true);
  });
  it('excludes Mar 2 and Nov 30', () => {
    expect(inD1M1({ month: 3, day: 2 })).toBe(false);
    expect(inD1M1({ month: 11, day: 30 })).toBe(false);
    expect(inD1M1({ month: 7, day: 4 })).toBe(false);
  });
  it('applies to the nightDate at the 05:59 vs 06:00 boundary', () => {
    expect(inD1M1(nightDate(ctInstant(2026, 3, 1, 5, 59)))).toBe(true); // nightDate Feb 28
    expect(inD1M1(nightDate(ctInstant(2026, 3, 1, 6, 0)))).toBe(true); // nightDate Mar 1
    expect(inD1M1(nightDate(ctInstant(2026, 3, 2, 6, 0)))).toBe(false); // nightDate Mar 2
    expect(inD1M1(nightDate(ctInstant(2026, 12, 1, 6, 0)))).toBe(true); // nightDate Dec 1
  });
});

describe('isPermitExemptNight', () => {
  it('is exempt when the morning after is a Sunday', () => {
    // Jan 3 2026 is a Saturday; its morning (Jan 4) is Sunday.
    expect(isPermitExemptNight(ctInstant(2026, 1, 3, 20, 0))).toBe(true);
  });
  it('is exempt the morning of and morning after New Year’s', () => {
    expect(isPermitExemptNight(ctInstant(2025, 12, 31, 20, 0))).toBe(true); // morning Jan 1
    expect(isPermitExemptNight(ctInstant(2026, 1, 1, 20, 0))).toBe(true); // morning Jan 2
  });
  it('is exempt the morning of and morning after Christmas', () => {
    expect(isPermitExemptNight(ctInstant(2026, 12, 24, 20, 0))).toBe(true); // morning Dec 25
    expect(isPermitExemptNight(ctInstant(2026, 12, 25, 20, 0))).toBe(true); // morning Dec 26
  });
  it('is NOT exempt on an ordinary weeknight', () => {
    // Jan 6 2026 is a Tuesday; morning Jan 7 Wednesday, not a holiday.
    expect(isPermitExemptNight(ctInstant(2026, 1, 6, 20, 0))).toBe(false);
  });
});

describe('resolveVerdict — rule tree matrix', () => {
  const winterNight = ctInstant(2026, 1, 15, 20, 0); // odd date, Dec1–Mar1, Thu night
  const summerNight = ctInstant(2026, 7, 15, 20, 0); // odd date, off-season, Wed night

  it('snow emergency + no-night-parking street => tow', () => {
    const v = resolveVerdict({ nnp: true, snowEmergency: true, instant: winterNight });
    expect(v.kind).toBe('no-parking');
    expect(v.color).toBe('no');
    expect(v.hours).toMatch(/snow emergency/i);
  });
  it('snow emergency + exception street => either side', () => {
    const v = resolveVerdict({ ex: true, snowEmergency: true, instant: winterNight });
    expect(v.kind).toBe('either-side');
    expect(v.color).toBe('either');
    expect(v.hours).toMatch(/10 PM/);
  });
  it('snow emergency + normal street => alternate side per parity', () => {
    const v = resolveVerdict({ snowEmergency: true, instant: winterNight });
    expect(v.kind).toBe('alternate-side');
    expect(v.side).toBe('ODD');
    expect(v.hours).toMatch(/10 PM/);
  });
  it('no emergency, winter, no-night-parking street => no parking 2–6', () => {
    const v = resolveVerdict({ nnp: true, instant: winterNight });
    expect(v.kind).toBe('no-parking');
    expect(v.hours).toMatch(/Dec 1/);
  });
  it('no emergency, summer, no-night-parking street => falls through to alternate side w/ warning note', () => {
    const v = resolveVerdict({ nnp: true, instant: summerNight });
    expect(v.kind).toBe('alternate-side');
    expect(v.side).toBe('ODD');
    expect(v.notes.some((n) => /through-highway or bus route/i.test(n))).toBe(true);
  });
  it('no emergency, exception street => either side', () => {
    const v = resolveVerdict({ ex: true, instant: summerNight });
    expect(v.kind).toBe('either-side');
    expect(v.color).toBe('either');
  });
  it('no emergency, normal street => alternate side per parity', () => {
    const v = resolveVerdict({ instant: summerNight });
    expect(v.kind).toBe('alternate-side');
    expect(v.side).toBe('ODD');
    expect(v.color).toBe('odd');
  });

  it('always includes the posted-signs disclaimer', () => {
    for (const inst of [winterNight, summerNight]) {
      const v = resolveVerdict({ instant: inst });
      expect(v.notes.some((n) => /posted signs/i.test(n))).toBe(true);
    }
  });
  it('shows the permit note on a normal night and waives it on a holiday night', () => {
    const normal = resolveVerdict({ instant: ctInstant(2026, 1, 6, 20, 0) }); // Tue night
    expect(normal.notes.some((n) => /permit.*required/i.test(n))).toBe(true);
    const holiday = resolveVerdict({ instant: ctInstant(2026, 1, 1, 20, 0) }); // morning Jan 2
    expect(holiday.notes.some((n) => /No permit required/i.test(n))).toBe(true);
  });
  it('no-parking verdicts never attach a permit note', () => {
    const v = resolveVerdict({ nnp: true, instant: winterNight });
    expect(v.notes.some((n) => /permit/i.test(n))).toBe(false);
  });
});
