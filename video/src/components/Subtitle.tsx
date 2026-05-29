import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';
import { POPPINS } from '../fonts';

function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation, keep each chunk short
  const raw = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  // If a sentence is very long, split further at commas
  const out: string[] = [];
  for (const s of raw) {
    const trimmed = s.trim();
    if (trimmed.length > 80) {
      const parts = trimmed.split(/,\s+/);
      // Recombine into chunks of ≤ 80 chars
      let buf = '';
      for (const p of parts) {
        if (buf && (buf + ', ' + p).length > 80) {
          out.push(buf.trim());
          buf = p;
        } else {
          buf = buf ? buf + ', ' + p : p;
        }
      }
      if (buf) out.push(buf.trim());
    } else {
      out.push(trimmed);
    }
  }
  return out.filter(Boolean);
}

export const Subtitle: React.FC<{ narration: string }> = ({ narration }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const sentences = splitSentences(narration);

  // Proportional timing: longer sentences get more screen time (speech rate ∝ char count)
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
  const frameCounts = sentences.map(s => Math.round((s.length / totalChars) * durationInFrames));
  // Fix rounding drift so frameCounts sum exactly equals durationInFrames
  const drift = durationInFrames - frameCounts.reduce((a, b) => a + b, 0);
  frameCounts[frameCounts.length - 1] += drift;

  // Cumulative start frame per sentence
  const frameStarts: number[] = [0];
  for (let i = 1; i < sentences.length; i++) {
    frameStarts.push(frameStarts[i - 1] + frameCounts[i - 1]);
  }

  // Find which sentence we're currently in
  let currentIndex = sentences.length - 1;
  for (let i = 0; i < frameStarts.length - 1; i++) {
    if (frame < frameStarts[i + 1]) { currentIndex = i; break; }
  }

  const sentence = sentences[currentIndex];
  const slotStart = frameStarts[currentIndex];
  const slotDuration = frameCounts[currentIndex];
  const frameInSlot = frame - slotStart;
  const fadeFrames = Math.min(6, Math.floor(slotDuration * 0.2));

  const opacity = interpolate(
    frameInSlot,
    [0, fadeFrames, slotDuration - fadeFrames, slotDuration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div style={{
      position: 'absolute',
      bottom: 120,
      left: 40,
      right: 40,
      opacity,
      textAlign: 'center',
    }}>
      <span style={{
        fontFamily: POPPINS,
        fontSize: 36,
        fontWeight: 600,
        color: BRAND.white,
        lineHeight: 1.4,
        textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.8)',
        background: 'rgba(4,16,24,0.55)',
        padding: '8px 20px',
        borderRadius: 8,
        display: 'inline-block',
        maxWidth: '90%',
      }}>
        {sentence}
      </span>
    </div>
  );
};
