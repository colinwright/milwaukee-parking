// Pure classification of DPW snow-operations page text → emergency declared?
// Kept separate from the scraper entry point so it can be unit-tested.
export function classifySnowText(text) {
  const t = (text || '').toLowerCase();
  const mentionsEmergency = /snow emergency/.test(t);
  const positive = /(declared|in effect|is in effect|has been declared)/.test(t);
  const negative = /(no snow emergency|concluded|has concluded|ended|is over|not in effect|lifted)/.test(t);
  return mentionsEmergency && positive && !negative;
}

// Whether scraped text is the DPW snow-operations page itself. GitHub's
// runners often get a bot-check page instead; reading that as "no emergency"
// would be a false all-clear, so the scraper treats it as a failed check.
export function isSnowStatusPage(text) {
  const t = (text || '').toLowerCase();
  if (
    /security verification|verify (that )?you are (not a bot|human)|just a moment|attention required|cloudflare|enable javascript and cookies/.test(
      t,
    )
  )
    return false;
  return /snow/.test(t) && /(operation|emergency|plow|salt)/.test(t);
}

