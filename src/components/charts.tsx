import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps,
} from 'recharts';
import { fmtNum } from '../lib/dates';

/** 12 500 → 12,5k, чтобы подписи оси влезали */
const compact = (v: number) => (Math.abs(v) >= 10000 ? `${fmtNum(v / 1000, 1)}k` : fmtNum(v));

const axis = { stroke: 'var(--line)', tick: { fill: 'var(--mut)', fontSize: 10, fontFamily: 'Oswald' }, tickLine: false, axisLine: false } as const;

export const ChartTooltip = ({ active, payload, label, unit = '', digits = 0 }: TooltipProps<number, string> & { unit?: string; digits?: number }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip">
      <div className="muted">{label}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)}><span className="text-2">{p.name}: </span><b>{fmtNum(Number(p.value), digits)}{unit && ` ${unit}`}</b></div>
      ))}
    </div>
  );
};

interface SeriesProps { data: object[]; x: string; y: string; name: string; unit?: string; color?: string; digits?: number; tall?: boolean; integer?: boolean }

export const Bars = ({ data, x, y, name, unit, color = 'var(--gold)', digits = 0, tall, integer }: SeriesProps) => (
  <div className={`chart ${tall ? 'tall' : ''}`}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="var(--line-2)" strokeDasharray="2 4" />
        <XAxis dataKey={x} {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={52} allowDecimals={!integer} tickFormatter={(v) => compact(Number(v))} />
        <Tooltip cursor={{ fill: 'color-mix(in srgb, var(--text) 6%, transparent)' }} content={<ChartTooltip unit={unit} digits={digits} />} />
        <Bar dataKey={y} name={name} fill={color} stroke="#000" strokeWidth={2} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const Lines = ({ data, x, y, name, unit, color = 'var(--gold)', digits = 1, tall }: SeriesProps) => (
  <div className={`chart ${tall ? 'tall' : ''}`}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 10, left: -6, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line-2)" strokeDasharray="2 4" />
        <XAxis dataKey={x} {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={52} domain={['auto', 'auto']} tickFormatter={(v) => fmtNum(Number(v), digits)} />
        <Tooltip cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} content={<ChartTooltip unit={unit} digits={digits} />} />
        <Line type="monotone" dataKey={y} name={name} stroke={color} strokeWidth={2} dot={{ r: 3.5, fill: color, stroke: '#000', strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

/** Горизонтальные полосы без recharts — для баланса мышц */
export const HBars = ({ rows }: { rows: { label: string; value: number; max: number; warn?: boolean; hint?: string }[] }) => (
  <div className="stack" style={{ gap: 6 }}>
    {rows.map((r) => (
      <div key={r.label} className="stat-row" style={{ gridTemplateColumns: '120px 1fr 44px' }}>
        <span className={`small ${r.warn ? 'orange' : 't2'}`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
        <div className="bar thin"><i style={{ width: `${(r.value / Math.max(1, r.max)) * 100}%`, background: r.warn ? 'var(--orange)' : 'var(--gold)' }} /></div>
        <span className="small mut" style={{ textAlign: 'right' }}>{r.hint ?? fmtNum(r.value, 1)}</span>
      </div>
    ))}
  </div>
);
