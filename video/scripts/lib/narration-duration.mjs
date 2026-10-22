export function narrationDurationPreflight(script) {
  const words=(script.segments||[]).reduce((n,s)=>n+String(s.narration||'').trim().split(/\s+/).filter(Boolean).length,0);
  // Full Chatterbox Standard is measured near 2.15 words per second on the
  // approved local voice. Keep a planning margin; encoded audio remains the
  // final authority because speech pace varies by script and punctuation.
  const estimatedSeconds=words/2.15+1.9;
  const minimumEstimate=95;
  const maximumEstimate=135;
  return {
    pass:estimatedSeconds>=minimumEstimate && estimatedSeconds<=maximumEstimate,
    words,
    estimatedSeconds:Math.round(estimatedSeconds*10)/10,
    minimumEstimate,
    maximumEstimate,
  };
}
