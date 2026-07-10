import { describe, it, expect } from 'vitest';
import { classifySnowText } from '../../scraper/classify.mjs';

describe('classifySnowText', () => {
  it('is false for the "has concluded" wording seen live', () => {
    expect(
      classifySnowText('The Snow Emergency has concluded. Cleanup continues with service requests and corners.')
    ).toBe(false);
  });
  it('is false when no emergency is in effect', () => {
    expect(classifySnowText('No snow emergency is in effect. Normal operations.')).toBe(false);
    expect(classifySnowText('Normal winter operations are underway.')).toBe(false);
  });
  it('is true when an emergency is declared / in effect', () => {
    expect(classifySnowText('A Snow Emergency has been declared and is in effect from 10 p.m. to 6 a.m.')).toBe(true);
    expect(classifySnowText('SNOW EMERGENCY DECLARED. Alternate side parking enforced 10PM-6AM.')).toBe(true);
  });
  it('is false on empty or unrelated text', () => {
    expect(classifySnowText('')).toBe(false);
    expect(classifySnowText('Garbage and recycling collection resumes Monday.')).toBe(false);
  });
});
