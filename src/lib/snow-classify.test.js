import { describe, it, expect } from 'vitest';
import { classifySnowText, isSnowStatusPage } from '../../scraper/classify.mjs';

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

describe('isSnowStatusPage', () => {
  it('rejects the bot-check page GitHub runners receive', () => {
    expect(
      isSnowStatusPage(
        'city.milwaukee.gov Performing security verification This website uses a security service to protect against malicious bots. This page is displayed while the website verifies you are not a bot. Ray ID: a5aa935a5cb2c568 Performance and Security by Cloudflare Privacy'
      )
    ).toBe(false);
    expect(isSnowStatusPage('Just a moment... Enable JavaScript and cookies to continue')).toBe(false);
  });
  it('accepts the snow operations page text', () => {
    expect(isSnowStatusPage('Snow Operation Status. No snow emergency is in effect. Normal operations.')).toBe(true);
    expect(isSnowStatusPage('The Snow Emergency has concluded. Cleanup continues.')).toBe(true);
  });
  it('rejects unrelated pages', () => {
    expect(isSnowStatusPage('Garbage and recycling collection resumes Monday.')).toBe(false);
    expect(isSnowStatusPage('')).toBe(false);
  });
});

