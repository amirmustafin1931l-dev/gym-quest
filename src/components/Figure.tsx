import { useMemo } from 'react';
import type { MuscleId } from '../types';
import { drawFigure, type FigureOpts } from '../lib/figure';

interface Props extends FigureOpts { b: number; onPickMuscle?: (m: MuscleId) => void; className?: string; style?: React.CSSProperties }

/** Качок. SVG строится из параметров; клики по мышцам — через data-muscle */
export const Figure = ({ b, onPickMuscle, className, style, ...opts }: Props) => {
  const html = useMemo(() => drawFigure(b, { ...opts, interactive: !!onPickMuscle }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [b, opts.view, opts.stage, opts.gear, opts.w, opts.h, opts.headOnly, opts.shadow, JSON.stringify(opts.look), JSON.stringify(opts.muscles), !!onPickMuscle]);
  return (
    <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }}
      onClick={(e) => { const t = (e.target as HTMLElement).closest('[data-muscle]') as HTMLElement | null; const m = t?.dataset.muscle as MuscleId | undefined; if (m && onPickMuscle) onPickMuscle(m); }} />
  );
};
