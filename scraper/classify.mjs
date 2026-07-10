// Pure classification of DPW snow-operations page text → emergency declared?
// Kept separate from the scraper entry point so it can be unit-tested.
export function classifySnowText(text) {
  const t = (text || '').toLowerCase();
  const mentionsEmergency = /snow emergency/.test(t);
  const positive = /(declared|in effect|is in effect|has been declared)/.test(t);
  const negative = /(no snow emergency|concluded|has concluded|ended|is over|not in effect|lifted)/.test(t);
  return mentionsEmergency && positive && !negative;
}
