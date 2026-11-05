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

function captionWidthUnits(text: string): number {
  return [...text].reduce((width, character) => {
    if (/[MW@%&]/.test(character)) return width + 0.9;
    if (/[A-Z0-9]/.test(character)) return width + 0.68;
    if (/[il1.,'!:;]/.test(character)) return width + 0.3;
    if (/\s/.test(character)) return width + 0.32;
    if (/[mw]/.test(character)) return width + 0.75;
    return width + 0.54;
  }, 0);
}

function splitBusinessCaption(text: string): [string, string] | null {
  const words = text.trim().split(/\s+/);
  if (words.length < 2 || text.length > 80) return null;
  let best: [string, string] | null = null;
  let smallestWidestLine = Number.POSITIVE_INFINITY;
  for (let split = 1; split < words.length; split += 1) {
    const first = words.slice(0, split).join(' ');
    const second = words.slice(split).join(' ');
    const widestLine = Math.max(captionWidthUnits(first), captionWidthUnits(second));
    if (widestLine < smallestWidestLine) {
      smallestWidestLine = widestLine;
      best = [first, second];
    }
  }
  return best;
}

export const Subtitle: React.FC<{ narration: string; captions?: CaptionChunk[]; maxFontSize?: number; presentationProfile?: string }> = ({ narration, captions, maxFontSize = 28, presentationProfile }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const businessProfile = presentationProfile === 'business-growth-v1';

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

  const balancedBusinessCaption = businessProfile ? splitBusinessCaption(sentence) : null;
  const businessCaptionSize = balancedBusinessCaption
    ? Math.min(maxFontSize, Math.floor((780 - 48) / (Math.max(...balancedBusinessCaption.map(captionWidthUnits)) * 1.1)))
    : maxFontSize;

  return (
    <div style={{
      position: 'absolute',
      bottom: businessProfile ? 300 : 120,
      left: businessProfile ? 150 : 40,
      right: businessProfile ? 150 : 40,
      opacity,
      textAlign: 'center',
    }}>
      {balancedBusinessCaption
        ? <div style={{width: 780, fontFamily: POPPINS, fontSize: businessCaptionSize, fontWeight: 600, lineHeight: 1.5, color: BRAND.white, textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.8)', whiteSpace: 'nowrap', background: 'rgba(4,16,24,0.6)', padding: '10px 24px', borderRadius: 10, display: 'inline-block'}}>
          <span>{balancedBusinessCaption[0]}</span><br/><span>{balancedBusinessCaption[1]}</span>
        </div>
        : <FittedText
          text={sentence}
          fontFamily={POPPINS}
          fontWeight={600}
          maxFontSize={maxFontSize}
          maxLines={businessProfile ? 3 : 3}
          maxWidth={businessProfile ? 780 : 920}
          lineHeight={1.5}
          color={BRAND.white}
          textShadow="0 2px 8px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.8)"
          style={{
            background: 'rgba(4,16,24,0.6)',
            padding: '10px 24px',
            borderRadius: 10,
            display: 'inline-block',
          }}
        />}
    </div>
  );
};
