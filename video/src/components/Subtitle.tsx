import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';

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
  const framesEach = durationInFrames / sentences.length;
  const currentIndex = Math.min(Math.floor(frame / framesEach), sentences.length - 1);
  const sentence = sentences[currentIndex];

  const frameInSlot = frame - currentIndex * framesEach;
  const fadeFrames = 6;
  const opacity = interpolate(
    frameInSlot,
    [0, fadeFrames, framesEach - fadeFrames, framesEach],
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
        fontFamily: '"Trebuchet MS", Arial, sans-serif',
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
