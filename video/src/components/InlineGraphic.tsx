import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND } from '../brand';
import { POPPINS } from '../fonts';
import type { GraphicType, GraphicData } from '../types';

function useEntryProgress(durationSecs = 0.6): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame, fps, config: { damping: 30, stiffness: 160 },
    durationInFrames: Math.round(fps * durationSecs) });
}

const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  fontFamily: POPPINS, fontSize: 13, color: BRAND.muted,
};

function GapGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const max = Math.max(data.a_value ?? 1, data.b_value ?? 1);
  const aW = interpolate(p, [0, 1], [0, ((data.a_value ?? 0) / max) * 340]);
  const bW = interpolate(p, [0, 1], [0, ((data.b_value ?? 0) / max) * 340]);
  const unit = data.unit ? ` ${data.unit}` : '';
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={row}>
          <span style={{ color: '#4dffb8', minWidth: 80 }}>{data.a_label}</span>
          <span style={{ color: BRAND.muted, fontSize: 11 }}>{data.a_value}{unit}</span>
        </div>
        <div style={{ height: 12, background: '#4dffb8', width: aW, borderRadius: 3 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={row}>
          <span style={{ color: '#ff6b6b', minWidth: 80 }}>{data.b_label}</span>
          <span style={{ color: BRAND.muted, fontSize: 11 }}>{data.b_value}{unit}</span>
        </div>
        <div style={{ height: 12, borderRadius: 3, display: 'flex', width: bW }}>
          <div style={{ flex: data.a_value ?? 1, background: BRAND.cyan, borderRadius: '3px 0 0 3px' }} />
          <div style={{ flex: Math.max((data.b_value ?? 0) - (data.a_value ?? 0), 0), background: '#ff6b6b', borderRadius: '0 3px 3px 0' }} />
        </div>
      </div>
      <div style={{ ...row, fontSize: 11, color: '#ff6b6b', justifyContent: 'flex-end' }}>
        ▲ {(data.b_value ?? 0) - (data.a_value ?? 0)}{unit} gap
      </div>
    </div>
  );
}

function PercentFillGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const fillPct = interpolate(p, [0, 1], [0, data.value ?? 0]);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${fillPct}%`, background: BRAND.cyan, borderRadius: 3 }} />
      </div>
      <div style={{ ...row, justifyContent: 'space-between', marginTop: 5, fontSize: 12 }}>
        <span style={{ color: BRAND.cyan }}>{data.value}% {data.label}</span>
        <span>{100 - (data.value ?? 0)}% {data.remainder_label}</span>
      </div>
    </div>
  );
}

function PercentPieGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const R = 52;
  const C = 2 * Math.PI * R;
  const arc = interpolate(p, [0, 1], [0, ((data.value ?? 0) / 100) * C]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={14} />
        <circle cx={60} cy={60} r={R} fill="none" stroke={BRAND.cyan} strokeWidth={14}
          strokeDasharray={`${arc} ${C}`} strokeLinecap="round"
          transform="rotate(-90 60 60)" />
        <text x={60} y={65} textAnchor="middle" fontSize={22} fill={BRAND.white}
          fontFamily="sans-serif" fontWeight="bold">{data.value}%</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: POPPINS, fontSize: 13 }}>
        <div><span style={{ color: BRAND.cyan }}>■</span> {data.label} {data.value}%</div>
        <div><span style={{ color: 'rgba(255,255,255,0.2)' }}>■</span> {data.remainder_label} {100 - (data.value ?? 0)}%</div>
      </div>
    </div>
  );
}

function GrowthGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const max = Math.max(data.from_value ?? 1, data.to_value ?? 1);
  const fromH = interpolate(p, [0, 1], [0, ((data.from_value ?? 0) / max) * 100]);
  const toH = interpolate(p, [0, 1], [0, ((data.to_value ?? 0) / max) * 100]);
  const unit = data.unit ? ` ${data.unit}` : '';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, justifyContent: 'center', height: 130 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 60, height: fromH, background: 'rgba(88,214,255,0.35)', borderRadius: '4px 4px 0 0' }} />
        <div style={{ ...row, flexDirection: 'column', fontSize: 12, gap: 2 }}>
          <span style={{ color: BRAND.muted }}>{data.from_label}</span>
          <span style={{ color: BRAND.muted }}>{data.from_value}{unit}</span>
        </div>
      </div>
      <div style={{ fontSize: 22, color: '#4dffb8', marginBottom: 40 }}>→</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 60, height: toH, background: BRAND.cyan, borderRadius: '4px 4px 0 0' }} />
        <div style={{ ...row, flexDirection: 'column', fontSize: 12, gap: 2 }}>
          <span style={{ color: BRAND.cyan }}>{data.to_label}</span>
          <span style={{ color: BRAND.cyan }}>{data.to_value}{unit}</span>
        </div>
      </div>
    </div>
  );
}

function TimelineGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const fillW = interpolate(p, [0, 1], [0, 100]);
  const unit = data.unit ?? '';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ ...row, marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: BRAND.muted }}>{data.label}</span>
      </div>
      <div style={{ height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${fillW}%`,
          background: `linear-gradient(90deg, ${BRAND.cyan}, #4dffb8)`, borderRadius: 3,
        }} />
      </div>
      <div style={{ ...row, justifyContent: 'space-between', marginTop: 5, fontSize: 11 }}>
        <span>Start</span>
        <span style={{ color: BRAND.cyan }}>{data.min}{data.max ? `–${data.max}` : ''} {unit}</span>
        <span style={{ color: '#4dffb8' }}>Complete</span>
      </div>
    </div>
  );
}

function StreakGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const count = data.count ?? 3;
  const current = data.current ?? count;
  const unit = data.unit ?? '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {Array.from({ length: count }, (_, i) => {
        const dotP = interpolate(p, [i / count, Math.min((i + 0.6) / count, 1)], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const isActive = i + 1 === current;
        const isFilled = i + 1 <= current;
        return (
          <div key={i} style={{
            width: 40, height: 40, borderRadius: '50%',
            background: isFilled ? (isActive ? '#4dffb8' : BRAND.cyan) : 'rgba(255,255,255,0.08)',
            border: `2px solid ${isFilled ? 'transparent' : 'rgba(255,255,255,0.15)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: dotP,
            fontFamily: POPPINS, fontSize: 14, fontWeight: 600,
            color: isFilled ? '#041018' : BRAND.muted,
          }}>
            {i + 1}
          </div>
        );
      })}
      <div style={{ ...row, fontSize: 12, marginLeft: 4 }}>
        <span style={{ color: '#4dffb8' }}>← {current}{count > 1 ? `/${count}` : ''} {unit}</span>
      </div>
    </div>
  );
}

function DrainGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const pct = ((data.current_value ?? 0) / (data.peak_value ?? 1)) * 100;
  const fillW = interpolate(p, [0, 1], [0, pct]);
  const unit = data.unit ? ` ${data.unit}` : '';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ ...row, justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
        <span style={{ color: BRAND.muted }}>Peak: {data.peak_value}{unit}</span>
        <span style={{ color: '#ff6b6b' }}>Now: {data.current_value}{unit}</span>
      </div>
      <div style={{ height: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${fillW}%`, background: 'linear-gradient(90deg,#ff6b6b,#ff9f43)', borderRadius: 3 }} />
      </div>
      <div style={{ ...row, fontSize: 11, color: '#ff6b6b', justifyContent: 'flex-end', marginTop: 4 }}>
        ▼ {Math.round(100 - pct)}% drawn down
      </div>
    </div>
  );
}

function GaugeGraphic({ data }: { data: GraphicData }) {
  const p = useEntryProgress();
  const R = 65;
  const C = Math.PI * R;
  const range = (data.max ?? 100) - (data.min ?? 0);
  const valuePct = ((data.value ?? 0) - (data.min ?? 0)) / (range || 1);
  const arc = interpolate(p, [0, 1], [0, valuePct * C]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={160} height={90} viewBox="0 0 160 90">
        <defs>
          <linearGradient id="gauge-g" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4dffb8" />
            <stop offset="100%" stopColor="#ff6b6b" />
          </linearGradient>
        </defs>
        <path d={`M 15 80 A ${R} ${R} 0 0 1 145 80`}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={12} strokeLinecap="round" />
        <path d={`M 15 80 A ${R} ${R} 0 0 1 145 80`}
          fill="none" stroke="url(#gauge-g)" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={`${arc} ${C}`} />
        <text x={80} y={72} textAnchor="middle" fontSize={18} fill={BRAND.white}
          fontFamily="sans-serif" fontWeight="bold">{data.value}</text>
      </svg>
      <div style={{ ...row, justifyContent: 'space-between', width: 160, fontSize: 11 }}>
        <span style={{ color: '#4dffb8' }}>{data.low_label}</span>
        <span style={{ color: '#ff6b6b' }}>{data.high_label}</span>
      </div>
    </div>
  );
}

export const InlineGraphic: React.FC<{
  type: GraphicType;
  data: GraphicData;
}> = ({ type, data }) => {
  if (type === 'none' || !data) return null;
  const wrap: React.CSSProperties = { width: '100%', marginTop: 16, padding: '12px 0' };
  switch (type) {
    case 'gap':          return <div style={wrap}><GapGraphic data={data} /></div>;
    case 'percent_fill': return <div style={wrap}><PercentFillGraphic data={data} /></div>;
    case 'percent_pie':  return <div style={wrap}><PercentPieGraphic data={data} /></div>;
    case 'growth':       return <div style={wrap}><GrowthGraphic data={data} /></div>;
    case 'timeline':     return <div style={wrap}><TimelineGraphic data={data} /></div>;
    case 'streak':       return <div style={wrap}><StreakGraphic data={data} /></div>;
    case 'drain':        return <div style={wrap}><DrainGraphic data={data} /></div>;
    case 'gauge':        return <div style={wrap}><GaugeGraphic data={data} /></div>;
    default:             return null;
  }
};
