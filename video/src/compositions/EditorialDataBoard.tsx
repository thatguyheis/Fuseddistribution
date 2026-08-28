import React from 'react';
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { BEBAS, POPPINS } from '../fonts';
import type { StoryboardDataBoard } from '../storyboard';

const PAPER = '#f8efd9';
const INK = '#172027';

function formatValue(value: number, unit = ''): string {
  return unit === '$' ? `$${value}` : `${value}${unit}`;
}

export const EditorialDataBoard: React.FC<{
  board: StoryboardDataBoard;
  imagePath?: string;
  backgroundColor: string;
  accentColor: string;
}> = ({ board, imagePath, backgroundColor, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({ frame, fps, config: { damping: 22, stiffness: 120 }, durationInFrames: 24 });
  const draw = interpolate(entry, [0, 1], [0, 1], { easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const values = board.values ?? [];
  const max = Math.max(...values, board.threshold ?? 0, 1);

  const chart = board.chartType === 'line' ? (() => {
    const points = values.map((value, index) => `${76 + (index * 748) / Math.max(values.length - 1, 1)},${360 - (value / max) * 250 * draw}`).join(' ');
    return <svg width={900} height={440} viewBox="0 0 900 440" role="img" aria-label={board.title}>
      <text x="76" y="94" fontFamily={POPPINS} fontSize="18" letterSpacing="2" fill={INK}>{board.yAxisLabel}</text>
      {[0, 1, 2, 3, 4].map((row) => <line key={row} x1="76" y1={110 + row * 62.5} x2="824" y2={110 + row * 62.5} stroke="#17202722" strokeWidth="2" />)}
      {board.threshold !== undefined && <><line x1="76" y1={360 - (board.threshold / max) * 250} x2="824" y2={360 - (board.threshold / max) * 250} stroke="#d86b3f" strokeWidth="4" strokeDasharray="12 10" /><text x="824" y={350 - (board.threshold / max) * 250} textAnchor="end" fontFamily={POPPINS} fontSize="22" fill="#d86b3f">threshold {board.threshold}</text></>}
      <polyline points={points} fill="none" stroke={accentColor} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <text x="450" y="435" textAnchor="middle" fontFamily={POPPINS} fontSize="18" letterSpacing="2" fill={INK}>{board.xAxisLabel}</text>
      {values.map((value, index) => {
        const x = 76 + (index * 748) / Math.max(values.length - 1, 1);
        const y = 360 - (value / max) * 250 * draw;
        return <g key={index}><circle cx={x} cy={y} r="12" fill={PAPER} stroke={accentColor} strokeWidth="7" /><text x={x} y="405" textAnchor="middle" fontFamily={POPPINS} fontSize="20" fill={INK}>{board.labels?.[index]}</text><text x={x} y={y - 22} textAnchor="middle" fontFamily={BEBAS} fontSize="28" fill={INK}>{formatValue(value, board.unit)}</text></g>;
      })}
    </svg>;
  })() : board.chartType === 'bars' ? <svg width={900} height={440} viewBox="0 0 900 440" role="img" aria-label={board.title}>
    <text x="80" y="94" fontFamily={POPPINS} fontSize="18" letterSpacing="2" fill={INK}>{board.yAxisLabel}</text>
    {values.map((value, index) => { const x = 120 + index * 260; const height = (value / max) * 280 * draw; return <g key={index}><rect x={x} y={350 - height} width="150" height={height} rx="8" fill={index === values.length - 1 ? accentColor : `${accentColor}77`} /><text x={x + 75} y={330 - height} textAnchor="middle" fontFamily={BEBAS} fontSize="34" fill={INK}>{formatValue(value, board.unit)}</text><text x={x + 75} y="395" textAnchor="middle" fontFamily={POPPINS} fontSize="22" fill={INK}>{board.labels?.[index]}</text></g>; })}
    <line x1="80" y1="350" x2="840" y2="350" stroke="#17202755" strokeWidth="3" />
    <text x="460" y="435" textAnchor="middle" fontFamily={POPPINS} fontSize="18" letterSpacing="2" fill={INK}>{board.xAxisLabel}</text>
  </svg> : board.chartType === 'donut' ? <svg width={900} height={440} viewBox="0 0 900 440" role="img" aria-label={board.title}>
    {(() => { const total = values.reduce((sum, value) => sum + value, 0) || 1; const radius = 125; const circumference = 2 * Math.PI * radius; let offset = 0; return values.map((value, index) => { const dash = (value / total) * circumference * draw; const circle = <circle key={index} cx="260" cy="220" r={radius} fill="none" stroke={index === 0 ? accentColor : '#d86b3f'} strokeWidth="54" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} transform="rotate(-90 260 220)" />; offset += (value / total) * circumference; return circle; }); })()}
    <text x="510" y="90" fontFamily={POPPINS} fontSize="20" letterSpacing="2" fill={INK}>{board.axisLabel}</text>
    {values.map((value, index) => <text key={index} x="510" y={175 + index * 60} fontFamily={POPPINS} fontSize="25" fill={INK}>● {board.labels?.[index]}: {formatValue(value, board.unit)}</text>)}
  </svg> : <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: 820 }}>
    {board.steps?.map((step, index) => <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 18 }}><div style={{ width: 54, height: 54, borderRadius: '50%', background: index === 0 ? accentColor : '#d86b3f', color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BEBAS, fontSize: 30 }}>{index + 1}</div><div style={{ flex: 1, padding: '18px 24px', background: index % 2 === 0 ? `${accentColor}44` : '#d86b3f33', borderLeft: `8px solid ${index === 0 ? accentColor : '#d86b3f'}`, fontFamily: POPPINS, fontSize: 25, color: INK }}>{step}</div></div>)}
  </div>;

  return <AbsoluteFill style={{ backgroundColor, overflow: 'hidden' }}>
    <AbsoluteFill style={{ opacity: 0.13, backgroundImage: 'radial-gradient(#101b22 0.7px, transparent 0.7px)', backgroundSize: '8px 8px' }} />
    <div style={{ position: 'absolute', top: 120, left: 72, right: 72, bottom: 120, background: PAPER, transform: 'rotate(-1deg)', boxShadow: '0 24px 36px rgba(15,18,24,0.22)', padding: '56px 52px', color: INK, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 28 }}><div style={{ flex: 1 }}><div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 22, letterSpacing: 4, color: accentColor }}>{board.sourceNote}</div><div style={{ fontFamily: BEBAS, fontSize: 66, lineHeight: 0.98, marginTop: 14 }}>{board.title}</div><div style={{ fontFamily: POPPINS, fontSize: 25, lineHeight: 1.3, marginTop: 16, maxWidth: 700 }}>{board.subtitle}</div></div>{imagePath && <Img src={staticFile(imagePath)} style={{ width: 190, height: 190, objectFit: 'cover', filter: 'grayscale(1) contrast(1.2)', border: `10px solid ${backgroundColor}`, transform: 'rotate(4deg)' }} />}</div>
      <div style={{ marginTop: 24, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>{chart}</div>
      <div style={{ marginTop: 12, padding: '18px 24px', background: `${accentColor}33`, borderLeft: `10px solid ${accentColor}`, fontFamily: POPPINS, fontSize: 27, lineHeight: 1.25, color: INK }}><strong>READ THIS:</strong> {board.takeaway}</div>
      <div style={{ position: 'absolute', bottom: 32, left: 52, fontFamily: POPPINS, fontSize: 18, letterSpacing: 3, color: `${INK}99` }}>FUSED / EDITORIAL DATA BOARD</div>
    </div>
  </AbsoluteFill>;
};
