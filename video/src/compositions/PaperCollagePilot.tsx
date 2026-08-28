import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { BRAND, OUTPUT } from '../brand';

export type PaperCollagePilotProps = {
  imagePath: string;
  backgroundColor: string;
  accentColor: string;
  label: string;
  message?: string;
  audioPath?: string;
};

const PaperPiece: React.FC<{
  children: React.ReactNode;
  from: number;
  duration: number;
  x: number;
  y: number;
  rotate: number;
  scale?: number;
  color: string;
}> = ({ children, from, duration, x, y, rotate, scale = 1, color }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - from;
  const progress = interpolate(localFrame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const translateY = interpolate(progress, [0, 1], [180, 0]);
  const opacity = interpolate(progress, [0, 0.15, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const currentRotate = interpolate(progress, [0, 1], [rotate - 8, rotate]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity,
        transform: `translateY(${translateY}px) rotate(${currentRotate}deg) scale(${scale})`,
        transformOrigin: 'center center',
        padding: 20,
        backgroundColor: color,
        border: '8px solid #f8efd9',
        boxShadow: '0 18px 24px rgba(15, 18, 24, 0.22)',
      }}
    >
      {children}
    </div>
  );
};

export const PaperCollagePilot: React.FC<PaperCollagePilotProps> = ({
  imagePath,
  backgroundColor,
  accentColor,
  label,
  message = 'HISTORICAL VALUE',
  audioPath,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grainOpacity = interpolate(frame, [0, 1], [0.1, 0.18], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor, overflow: 'hidden' }}>
      {audioPath && <Audio src={staticFile(audioPath)} />}
      <div style={{ width: BRAND.width, height: BRAND.height, transform: `scale(${OUTPUT.width / BRAND.width})`, transformOrigin: 'top left' }}>
      <AbsoluteFill
        style={{
          opacity: grainOpacity,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'90\' height=\'90\' viewBox=\'0 0 90 90\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'.2\'/%3E%3C/svg%3E")',
          mixBlendMode: 'multiply',
        }}
      />
      <Sequence from={0} durationInFrames={fps * 200} layout="none">
        <PaperPiece from={0} duration={10} x={90} y={430} rotate={-4} color="#f8efd9" scale={1.05}>
          <div style={{ width: 900, height: 720 }} />
        </PaperPiece>
        <PaperPiece from={8} duration={12} x={180} y={270} rotate={3} color="#d86b3f" scale={0.94}>
          <Img src={staticFile(imagePath)} style={{ display: 'block', width: 720, height: 720, objectFit: 'cover', filter: 'grayscale(1) contrast(1.25)' }} />
        </PaperPiece>
        <PaperPiece from={18} duration={13} x={170} y={930} rotate={-5} color={accentColor} scale={0.82}>
          <div style={{ width: 740, height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#101b22', fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 52, letterSpacing: 2, textAlign: 'center' }}>
            {message}
          </div>
        </PaperPiece>
        <PaperPiece from={29} duration={14} x={300} y={1200} rotate={4} color="#f8efd9" scale={0.72}>
          <div style={{ width: 480, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 220, height: 220, borderRadius: '50%', background: '#b7bec0', border: '12px dotted #30363b', boxShadow: 'inset 0 0 0 12px #f8efd9' }} />
          </div>
        </PaperPiece>
        <div style={{ position: 'absolute', left: 74, bottom: 92, color: '#f8efd9', fontFamily: 'Arial, sans-serif', fontSize: 28, letterSpacing: 5, fontWeight: 700 }}>
          {label}
        </div>
      </Sequence>
      </div>
    </AbsoluteFill>
  );
};
