import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { Empty, NumInput } from '../components/ui';
import { Lines } from '../components/charts';
import { Cta, Hud, Panel, PmTabs, Stencil, Sunset } from '../components/gta';
import { MUSCLES } from '../data/muscles';
import { fmtDate, fmtNum } from '../lib/dates';
import { exerciseHistory, latestBodyweight, muscleStatuses, totals, trends, weeklySeries, weekStreak } from '../lib/stats';
import { toast } from '../lib/toast';
import { useClock } from './HeroScreen';

type Period = '4' | '12' | '26';

export const ProgressScreen = ({ onExercise }: { onExercise: (id: string) => void }) => {
  const { state, exMap, dispatch } = useStore();
  const clock = useClock();
  const [period, setPeriod] = useState<Period>('12');
  const weeks = Number(period);
  const series = useMemo(() => weeklySeries(state.workouts, exMap, weeks), [state.workouts, exMap, weeks]);
  const tr = useMemo(() => trends(state.workouts, exMap, state.bodyweight), [state.workouts, exMap, state.bodyweight]);
  const statuses = useMemo(() => muscleStatuses(state.workouts, exMap, 30), [state.workouts, exMap]);
  const t = useMemo(() => totals(state.workouts, exMap), [state.workouts, exMap]);
  const [bw, setBw] = useState<number | undefined>(undefined);
  const usedIds = useMemo(() => { const c = new Map<string, number>(); state.workouts.forEach((w) => w.entries.forEach((e) => c.set(e.exerciseId, (c.get(e.exerciseId) ?? 0) + 1))); return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => exMap.get(id)?.kind === 'weight'); }, [state.workouts, exMap]);
  const [exId, setExId] = useState('');
  const chosen = exId || usedIds[0] || ''; const chosenDef = exMap.get(chosen);
  const exData = useMemo(() => chosenDef ? exerciseHistory(state.workouts, chosen, chosenDef).map((h) => ({ date: fmtDate(h.date), e1rm: Math.round(h.bestE1rm) })) : [], [state.workouts, chosen, chosenDef]);
  const growth = tr.filter((x) => x.metric !== 'Вес тела');
  const score = growth.reduce((a, x) => a + Math.sign(Math.round(x.delta / 5)), 0);
  const ton = tr.find((x) => x.metric === 'Тоннаж');
  const hasPrev = (tr.find((x) => x.metric === 'Тренировок')?.before ?? 0) > 0;
  const verdict = !hasPrev ? null : score > 0 ? { t: `рост ${ton && ton.delta > 0 ? `+${Math.round(ton.delta)}%` : '↑'}`, c: 'var(--green)' } : score < 0 ? { t: `спад ${ton ? `${Math.round(ton.delta)}%` : '↓'}`, c: '#ff6b6b' } : { t: 'стабильно', c: '#ddd' };
  const bwData = [...state.bodyweight].sort((a, b) => a.date.localeCompare(b.date)).map((x) => ({ date: fmtDate(x.date), kg: x.kg }));
  const maxSets = Math.max(1, ...statuses.map((s) => s.sets));
  const maxTon = Math.max(1, ...series.map((s) => s.tonnage)); const maxW = Math.max(1, ...series.map((s) => s.workouts));
  const last = latestBodyweight(state.bodyweight);
  const saveBw = () => { if (bw) { dispatch({ type: 'logBodyweight', kg: bw }); setBw(undefined); toast('Вес записан'); } };

  return (
    <div className="screen">
      <Sunset /><div className="halftone" />
      <div className="head">
        <div><div className="mono gold-text" style={{ fontSize: 28 }}>СТАТЫ</div>{verdict && <div className="spray" style={{ fontSize: 22, color: verdict.c, textShadow: '2px 2px 0 #000', marginTop: 2 }}>{verdict.t}</div>}</div>
        <Hud clock={clock} money={t.tonnage} bars={[]} stars={weekStreak(state.workouts)} compact />
      </div>
      <div className="z stack">
        {!state.workouts.length && <Panel><Empty icon="📊" title="Пока нечего показывать" text="После первых миссий здесь появятся тоннаж, сила, вес тела и баланс мышц." /></Panel>}
        {hasPrev && (
          <Panel><div className="pm-title"><span>Тренд · 4 недели к предыдущим</span></div>
            <div className="grid-2">{tr.map((x) => { const up = x.delta > 2, down = x.delta < -2; const col = x.metric === 'Вес тела' ? '#ddd' : up ? 'var(--green)' : down ? '#ff6b6b' : '#ddd'; return (
              <div key={x.metric} className="stat-tile"><div className="v" style={{ color: col }}>{x.delta > 0 ? '+' : ''}{Math.round(x.delta)}%</div><div className="l">{x.metric}: {fmtNum(x.now, x.unit === 'кг' && x.now < 1000 ? 1 : 0)}{x.unit ? ` ${x.unit}` : ''}</div></div>); })}</div>
          </Panel>
        )}
        {state.workouts.length > 0 && (<>
          <PmTabs value={period} onChange={setPeriod} items={[{ id: '4', label: '4 нед' }, { id: '12', label: '12 нед' }, { id: '26', label: 'Полгода' }]} />
          <Panel><div className="pm-title"><span>Тоннаж по неделям</span><span className="mut">кг</span></div>
            <div className="bars2">{series.map((s) => <i key={s.weekStart} style={{ height: `${Math.max(2, (s.tonnage / maxTon) * 100)}%` }} data-v={`${fmtNum(s.tonnage)} кг`} />)}</div>
            <div className="axis"><span>{series[0]?.label}</span><span>{series[Math.floor(series.length / 2)]?.label}</span><span>{series[series.length - 1]?.label}</span></div></Panel>
          <Panel><div className="pm-title"><span>Миссий в неделю</span></div>
            <div className="bars2" style={{ height: 70 }}>{series.map((s) => <i key={s.weekStart} className="green" style={{ height: `${Math.max(2, (s.workouts / maxW) * 100)}%` }} data-v={`${s.workouts}`} />)}</div>
            <div className="axis"><span>{series[0]?.label}</span><span>{series[series.length - 1]?.label}</span></div></Panel>
          {usedIds.length > 0 && (
            <Panel><div className="pm-title"><span>Сила · расч. 1ПМ</span><button className="btn ghost sm" onClick={() => chosen && onExercise(chosen)}>Подробнее →</button></div>
              <div className="chips scroll" style={{ marginBottom: 6 }}>{usedIds.slice(0, 8).map((id) => <button key={id} className={`chip ${id === chosen ? 'active' : ''}`} onClick={() => setExId(id)}>{exMap.get(id)?.name}</button>)}</div>
              {exData.length >= 2 ? <Lines data={exData} x="date" y="e1rm" name="1ПМ" unit="кг" digits={0} /> : <p className="tiny mut">Нужно минимум две сессии этого упражнения.</p>}</Panel>
          )}
          <Panel><div className="pm-title"><span>Баланс мышц · 30 дней</span><span className="mut">подходы</span></div>
            {[...statuses].sort((a, b) => b.sets - a.sets).map((s) => <div key={s.id} className="pm-row" style={{ margin: '3px 0' }}><span style={{ color: s.lagging ? 'var(--orange)' : undefined }}>{MUSCLES[s.id].short}</span><div className="bar" style={{ height: 7 }}><i style={{ width: `${(s.sets / maxSets) * 100}%`, background: s.lagging ? 'var(--orange)' : 'var(--gold)' }} /></div><span className="v">{fmtNum(s.sets, 1)}</span></div>)}
            <p className="tiny mut" style={{ marginTop: 6 }}>Оранжевым — отстающие (меньше половины среднего или меньше 4 подходов). За их проработку +25 respect.</p></Panel>
        </>)}
        <Panel><div className="row between"><div><div className="pm-title" style={{ marginBottom: 2 }}><span>Вес тела</span></div><div className="mono" style={{ fontSize: 18, color: '#fff' }}>{last ? `${last} кг` : '—'}</div></div><div className="row" style={{ width: 190 }}><NumInput value={bw} step={0.1} placeholder="кг" onChange={setBw} /><Cta dark className="sm" disabled={!bw} onClick={saveBw} style={{ width: 90 }}>Записать</Cta></div></div>
          {bwData.length >= 2 ? <Lines data={bwData} x="date" y="kg" name="Вес" unit="кг" digits={1} color="#e8692a" /> : <p className="tiny mut" style={{ marginTop: 8 }}>Записывай вес раз в неделю — появится график и относительная сила.</p>}</Panel>
        {state.workouts.length > 0 && <div className="center"><Stencil small>{t.workouts} миссий · {t.sets} подходов · {t.prs} рекордов</Stencil></div>}
      </div>
    </div>
  );
};
