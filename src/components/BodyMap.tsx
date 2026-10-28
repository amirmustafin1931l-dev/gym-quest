import type { MuscleId } from '../types';
import type { MuscleStatus } from '../lib/stats';
import { MUSCLES } from '../data/muscles';

interface Props { statuses: MuscleStatus[]; today: MuscleId[]; onPick?: (m: MuscleId) => void; selected?: MuscleId | null }

const SEQ = ['var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)', 'var(--seq-6)'];

const fillFor = (st: MuscleStatus | undefined, isToday: boolean) => {
  if (isToday) return 'var(--good)';
  if (!st || st.sets <= 0) return 'color-mix(in srgb, var(--text) 7%, transparent)';
  const idx = Math.min(SEQ.length - 1, Math.floor(st.ratio * SEQ.length));
  return SEQ[idx];
};

type Shape = { m: MuscleId; d?: string; el?: { cx: number; cy: number; rx: number; ry: number } };

const FRONT: Shape[] = [
  { m: 'front_delts', el: { cx: 57, cy: 82, rx: 13, ry: 11 } }, { m: 'front_delts', el: { cx: 143, cy: 82, rx: 13, ry: 11 } },
  { m: 'side_delts', el: { cx: 46, cy: 90, rx: 7, ry: 12 } }, { m: 'side_delts', el: { cx: 154, cy: 90, rx: 7, ry: 12 } },
  { m: 'chest', el: { cx: 82, cy: 98, rx: 19, ry: 15 } }, { m: 'chest', el: { cx: 118, cy: 98, rx: 19, ry: 15 } },
  { m: 'biceps', el: { cx: 45, cy: 128, rx: 9, ry: 22 } }, { m: 'biceps', el: { cx: 155, cy: 128, rx: 9, ry: 22 } },
  { m: 'forearms', el: { cx: 36, cy: 188, rx: 8, ry: 28 } }, { m: 'forearms', el: { cx: 164, cy: 188, rx: 8, ry: 28 } },
  { m: 'abs', d: 'M86 118 h28 a4 4 0 0 1 4 4 v62 a4 4 0 0 1 -4 4 h-28 a4 4 0 0 1 -4 -4 v-62 a4 4 0 0 1 4 -4 z' },
  { m: 'obliques', el: { cx: 72, cy: 155, rx: 7, ry: 28 } }, { m: 'obliques', el: { cx: 128, cy: 155, rx: 7, ry: 28 } },
  { m: 'quads', el: { cx: 81, cy: 262, rx: 16, ry: 46 } }, { m: 'quads', el: { cx: 119, cy: 262, rx: 16, ry: 46 } },
  { m: 'calves', el: { cx: 80, cy: 362, rx: 9, ry: 26 } }, { m: 'calves', el: { cx: 120, cy: 362, rx: 9, ry: 26 } },
];
const BACK: Shape[] = [
  { m: 'upper_back', d: 'M70 68 H130 L116 126 H84 Z' },
  { m: 'rear_delts', el: { cx: 55, cy: 84, rx: 12, ry: 11 } }, { m: 'rear_delts', el: { cx: 145, cy: 84, rx: 12, ry: 11 } },
  { m: 'lats', d: 'M82 112 L64 118 L74 186 L92 176 Z' }, { m: 'lats', d: 'M118 112 L136 118 L126 186 L108 176 Z' },
  { m: 'lower_back', d: 'M88 172 h24 a4 4 0 0 1 4 4 v34 a4 4 0 0 1 -4 4 h-24 a4 4 0 0 1 -4 -4 v-34 a4 4 0 0 1 4 -4 z' },
  { m: 'triceps', el: { cx: 45, cy: 128, rx: 9, ry: 22 } }, { m: 'triceps', el: { cx: 155, cy: 128, rx: 9, ry: 22 } },
  { m: 'forearms', el: { cx: 36, cy: 188, rx: 8, ry: 28 } }, { m: 'forearms', el: { cx: 164, cy: 188, rx: 8, ry: 28 } },
  { m: 'glutes', el: { cx: 84, cy: 228, rx: 16, ry: 18 } }, { m: 'glutes', el: { cx: 116, cy: 228, rx: 16, ry: 18 } },
  { m: 'hamstrings', el: { cx: 81, cy: 292, rx: 15, ry: 40 } }, { m: 'hamstrings', el: { cx: 119, cy: 292, rx: 15, ry: 40 } },
  { m: 'calves', el: { cx: 80, cy: 362, rx: 11, ry: 30 } }, { m: 'calves', el: { cx: 120, cy: 362, rx: 11, ry: 30 } },
];

const Silhouette = () => (
  <g fill="var(--surface-3)" stroke="var(--border)" strokeWidth="1.5">
    <circle cx="100" cy="32" r="22" />
    <rect x="90" y="52" width="20" height="16" rx="5" />
    <path d="M60 68 Q100 60 140 68 L146 100 L134 212 Q100 224 66 212 L54 100 Z" />
    <path d="M58 72 L38 150 L28 220" fill="none" stroke="var(--surface-3)" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M142 72 L162 150 L172 220" fill="none" stroke="var(--surface-3)" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M80 212 L80 300 L80 395" fill="none" stroke="var(--surface-3)" strokeWidth="36" strokeLinecap="round" />
    <path d="M120 212 L120 300 L120 395" fill="none" stroke="var(--surface-3)" strokeWidth="36" strokeLinecap="round" />
  </g>
);

const Figure = ({ shapes, label, statuses, today, onPick, selected }: Props & { shapes: Shape[]; label: string }) => {
  const byId = new Map(statuses.map((s) => [s.id, s]));
  return (
    <svg viewBox="0 0 200 420" role="img" aria-label={`Карта мышц, вид ${label}`}>
      <Silhouette />
      {shapes.map((s, i) => {
        const st = byId.get(s.m);
        const isToday = today.includes(s.m);
        const isSel = selected === s.m;
        const common = {
          fill: fillFor(st, isToday),
          stroke: isSel ? 'var(--accent)' : st?.lagging ? 'var(--warn)' : 'rgba(0,0,0,0.25)',
          strokeWidth: isSel ? 2.5 : st?.lagging ? 2 : 1,
          strokeDasharray: st?.lagging && !isSel ? '4 3' : undefined,
          style: { cursor: onPick ? 'pointer' : 'default', transition: 'fill .3s' },
          onClick: () => onPick?.(s.m),
        };
        return s.d
          ? <path key={i} d={s.d} {...common}><title>{MUSCLES[s.m].name}</title></path>
          : <ellipse key={i} cx={s.el!.cx} cy={s.el!.cy} rx={s.el!.rx} ry={s.el!.ry} {...common}><title>{MUSCLES[s.m].name}</title></ellipse>;
      })}
      <text x="100" y="414" textAnchor="middle" fontSize="12" fill="var(--muted)">{label}</text>
    </svg>
  );
};

export const BodyMap = (p: Props) => (
  <div>
    <div className="bodymap">
      <Figure {...p} shapes={FRONT} label="спереди" />
      <Figure {...p} shapes={BACK} label="сзади" />
    </div>
    <div className="legend">
      <span><i style={{ background: 'var(--good)' }} />сегодня</span>
      <span><i style={{ background: 'var(--seq-5)' }} />много за 30 дней</span>
      <span><i style={{ background: 'var(--seq-1)' }} />мало</span>
      <span><i style={{ background: 'transparent', border: '2px dashed var(--warn)' }} />отстаёт</span>
    </div>
  </div>
);
