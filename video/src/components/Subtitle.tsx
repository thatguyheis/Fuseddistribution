import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from '../brand';
import { POPPINS } from '../fonts';
import type { CaptionChunk } from '../types';
import { FittedText } from './FittedText';

function splitSentences(text: string): string[] {
  const raw = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const out: string[] = [];
  for (const s of raw) {
    const trimmed = s.trim();
    if (trimmed.length > 120) {
      const parts = trimmed.split(/,\s+/);
      let buf = '';
      for (const p of parts) {
        if (buf && (buf + ', ' + p).length > 120) {
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

export const Subtitle: React.FC<{ narration: string; captions?: CaptionChunk[] }> = ({ narration, captions }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  let sentence: string;
  let opacity: number;

  if (captions && captions.length > 0) {
    // Whisper-verified timestamps — frame-accurate
    const currentSec = frame / fps;
    const idx = captions.findIndex((c, i) => {
      const next = captions[i + 1];
      return currentSec >= c.startSec && (next ? currentSec < next.startSec : true);
    });
    const chunk = captions[Math.max(0, idx)];
    sentence = chunk.text;

    const chunkStartFrame = Math.round(chunk.startSec * fps);
    const chunkEndFrame = Math.round(chunk.endSec * fps);
    const chunkDuration = Math.max(chunkEndFrame - chunkStartFrame, 1);
    const frameInChunk = frame - chunkStartFrame;
    const fadeFrames = Math.max(1, Math.min(4, Math.floor(chunkDuration * 0.15)));
    const safeEnd = chunkDuration - fadeFrames;

    opacity = safeEnd > fadeFrames
      ? interpolate(frameInChunk, [0, fadeFrames, safeEnd, chunkDuration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : 1;
  } else {
    // Fallback: proportional timing by char count
    const sentences = splitSentences(narration);
    const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
    const frameCounts = sentences.map(s => Math.round((s.length / totalChars) * durationInFrames));
    const drift = durationInFrames - frameCounts.reduce((a, b) => a + b, 0);
    frameCounts[frameCounts.length - 1] += drift;

    const frameStarts: number[] = [0];
    for (let i = 1; i < sentences.length; i++) {
      frameStarts.push(frameStarts[i - 1] + frameCounts[i - 1]);
    }

    let currentIndex = sentences.length - 1;
    for (let i = 0; i < frameStarts.length - 1; i++) {
      if (frame < frameStarts[i + 1]) { currentIndex = i; break; }
    }

    sentence = sentences[currentIndex];
    const slotStart = frameStarts[currentIndex];
    const slotDuration = frameCounts[currentIndex];
    const frameInSlot = frame - slotStart;
    const fadeFrames = Math.max(1, Math.min(6, Math.floor(slotDuration * 0.2)));
    const safeEnd = slotDuration - fadeFrames;

    opacity = safeEnd > fadeFrames
      ? interpolate(frameInSlot, [0, fadeFrames, safeEnd, slotDuration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : 1;
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 120,
      left: 40,
      right: 40,
      opacity,
      textAlign: 'center',
    }}>
      <FittedText
        text={sentence}
        fontFamily={POPPINS}
        fontWeight={600}
        maxFontSize={28}
        maxLines={3}
        maxWidth={920}
        lineHeight={1.5}
        color={BRAND.white}
        textShadow="0 2px 8px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.8)"
        style={{
          background: 'rgba(4,16,24,0.6)',
          padding: '10px 24px',
          borderRadius: 10,
          display: 'inline-block',
        }}
      />
    </div>
  );
};
