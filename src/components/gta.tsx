import type { ReactNode } from 'react';
import type { MuscleStatus } from '../lib/stats';
import { fmtNum } from '../lib/dates';

/** Закат Лос-Сантоса: небо, солнце, пальмы, город */
export const Sunset = ({ height = 812, className = '' }: { height?: number; className?: string }) => {
  const h = height;
  const palm = (x: number, hh: number, k: number) => (
    <g key={k}>
      <path d={`M${x} ${h * 0.8} q${k > 0 ? 6 : -4} -${hh * 0.6} ${k > 0 ? -10 : 14} -${hh} l14 0 q${k > 0 ? 10 : -12} ${hh * 0.4} ${k > 0 ? 8 : -12} ${hh}z`} fill="#0a0708" />
      <g transform={`translate(${x + (k > 0 ? -4 : 13)} ${h * 0.8 - hh})`} fill="#0a0708">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <ellipse key={a} rx={34 + (k < 0 ? 4 : 0)} ry={8} transform={`rotate(${a}) translate(${26 + (k < 0 ? 4 : 0)} 0)`} />)}
      </g>
    </g>
  );
  return (
    <svg className={`sunset ${className}`} viewBox={`0 0 375 ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="skyG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2b1b4d" /><stop offset=".35" stopColor="#8a2d5e" /><stop offset=".6" stopColor="#e8692a" /><stop offset=".78" stopColor="#f7b733" /><stop offset=".8" stopColor="#1a1410" /><stop offset="1" stopColor="#0d0c0b" /></linearGradient>
        <radialGradient id="sunG" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff0b0" /><stop offset=".6" stopColor="#f7b733" /><stop offset="1" stopColor="#f7b733" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="375" height={h} fill="url(#skyG)" />
      <circle cx="270" cy={h * 0.62} r="80" fill="url(#sunG)" /><circle cx="270" cy={h * 0.62} r="46" fill="#ffd877" />
      <g fill="#120d16">{[0, 40, 70, 110, 150, 200, 250, 300, 340].map((x, i) => <rect key={x} x={x} y={h * 0.78 - 20 - (i % 3) * 18 - (i % 2) * 10} width={30 + (i % 2) * 18} height="120" />)}</g>
      {palm(40, 150, 1)}{palm(330, 170, -1)}
      <rect y={h * 0.8} width="375" height={h * 0.2} fill="#0d0c0b" /><path d={`M0 ${h * 0.8} h375`} stroke="#f7b733" strokeWidth="2" opacity=".5" />
    </svg>
  );
};

export interface HudProps { clock: string; money: number; moneyLabel?: string; bars: { v: number; color: string }[]; barsLabel?: string; stars: number; compact?: boolean }
/** HUD как в San Andreas: часы, деньги, три шкалы, звёзды */
export const Hud = ({ clock, money, moneyLabel = 'тоннаж, кг', bars, barsLabel, stars, compact }: HudProps) => (
  <div className={`hud ${compact ? 'compact' : ''}`}>
    <div className="clock">{clock}</div>
    <div className="money">${String(Math.round(money)).padStart(8, '0')}</div>
    <div className="lbl">{moneyLabel}</div>
    {!compact && (<>
      <div className="bars">{bars.map((b, i) => <div className="b" key={i}><i style={{ width: `${Math.max(0, Math.min(100, b.v))}%`, background: b.color }} /></div>)}</div>
      {barsLabel && <div className="lbl">{barsLabel}</div>}
    </>)}
    <div className="stars">{'★'.repeat(Math.min(5, stars))}<b>{'★'.repeat(Math.max(0, 5 - Math.min(5, stars)))}</b></div>
  </div>
);

export const Stencil = ({ children, kind = '', onClick, small }: { children: ReactNode; kind?: '' | 'g' | 'w' | 'y'; onClick?: () => void; small?: boolean }) => (
  <button className={`stencil ${kind} ${small ? 'sm' : ''}`} onClick={onClick} type="button">{children}</button>
);

export const Panel = ({ children, className = '', accent }: { children: ReactNode; className?: string; accent?: string }) => (
  <section className={`pm ${className}`} style={accent ? { borderLeft: `6px solid ${accent}` } : undefined}>{children}</section>
);

export const PmTabs = <T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) => (
  <div className="pm-tabs" role="tablist">{items.map((t) => <button key={t.id} role="tab" aria-selected={t.id === value} className={t.id === value ? 'on' : ''} onClick={() => onChange(t.id)}>{t.label}</button>)}</div>
);

export const Cta = ({ children, onClick, dark, danger, disabled, className = '', style }: { children: ReactNode; onClick?: () => void; dark?: boolean; danger?: boolean; disabled?: boolean; className?: string; style?: React.CSSProperties }) => (
  <button className={`cta ${dark ? 'dark' : ''} ${danger ? 'danger' : ''} ${className}`} onClick={onClick} disabled={disabled} style={style} type="button">{children}</button>
);

export const StatRow = ({ label, value, color, max = 100 }: { label: string; value: number; color: string; max?: number }) => (
  <div className="pm-row"><span>{label}</span><div className="bar"><i style={{ width: `${(value / max) * 100}%`, background: color }} /></div><span className="v">{fmtNum(value)}</span></div>
);

const GROUPS: { label: string; ids: string[] }[] = [
  { label: 'ГРУДЬ', ids: ['chest'] }, { label: 'РУКИ', ids: ['biceps', 'triceps', 'forearms'] }, { label: 'НОГИ', ids: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { label: 'СПИНА', ids: ['lats', 'upper_back', 'lower_back'] }, { label: 'КОР', ids: ['abs', 'obliques'] }, { label: 'ПЛЕЧИ', ids: ['front_delts', 'side_delts', 'rear_delts'] },
];
/** Радар баланса мышц по 6 группам */
export const Radar = ({ statuses, size = 100 }: { statuses: MuscleStatus[]; size?: number }) => {
  const vals = GROUPS.map((g) => { const ms = statuses.filter((s) => g.ids.includes(s.id)); return { v: ms.reduce((a, s) => a + s.sets, 0) / Math.max(1, ms.length), lag: ms.some((s) => s.lagging) && ms.every((s) => s.lagging || s.sets === 0) }; });
  const max = Math.max(1, ...vals.map((x) => x.v));
  const pt = (i: number, r: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6; return [56 + r * Math.cos(a), 56 + r * Math.sin(a)] as const; };
  const poly = vals.map((x, i) => pt(i, 10 + 36 * (x.v / max)).join(',')).join(' ');
  return (
    <svg className="radar" viewBox="0 0 112 112" width={size} height={size} role="img" aria-label="Баланс мышц">
      <circle cx="56" cy="56" r="56" fill="#13331a" />
      {[0, 1, 2, 3].map((i) => <circle key={i} cx="56" cy="56" r={14 + i * 13} fill="none" stroke="rgba(255,255,255,.12)" />)}
      <path d="M56 4 V108 M4 56 H108" stroke="rgba(255,255,255,.12)" />
      <polygon points={poly} fill="rgba(245,197,66,.35)" stroke="#f5c542" strokeWidth="2" />
      <circle cx="56" cy="56" r="4" fill="#fff" />
      {GROUPS.map((g, i) => { const [x, y] = pt(i, 50); return <text key={g.label} x={x} y={y + 3} fontSize="7.5" textAnchor="middle" fontFamily="Oswald" fill={vals[i].lag ? '#ff9f1c' : '#9be38a'}>{g.label}</text>; })}
    </svg>
  );
};

/** Жёлтый «миссионный» текст */
export const MissionText = ({ children, size = 14 }: { children: ReactNode; size?: number }) => <div className="yellow mono" style={{ fontSize: size }}>{children}</div>;
