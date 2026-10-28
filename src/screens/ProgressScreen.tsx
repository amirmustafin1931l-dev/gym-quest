import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { Card, Empty, NumInput, Segmented, StatTile } from '../components/ui';
import { Bars, HBars, Lines } from '../components/charts';
import { MUSCLES } from '../data/muscles';
import { fmtDate, fmtNum } from '../lib/dates';
import { exerciseHistory, latestBodyweight, muscleStatuses, trends, weeklySeries } from '../lib/stats';
import { toast } from '../lib/toast';

type Period = '4' | '12' | '26';

export const ProgressScreen = ({ onExercise }: { onExercise: (id: string) => void }) => {
  const { state, exMap, dispatch, exercises } = useStore();
  const [period, setPeriod] = useState<Period>('12');
  const weeks = Number(period);
  const series = useMemo(() => weeklySeries(state.workouts, exMap, weeks), [state.workouts, exMap, weeks]);
  const tr = useMemo(() => trends(state.workouts, exMap, state.bodyweight), [state.workouts, exMap, state.bodyweight]);
  const statuses = useMemo(() => muscleStatuses(state.workouts, exMap, 30), [state.workouts, exMap]);
  const [bw, setBw] = useState<number | undefined>(undefined);
  const usedIds = useMemo(() => {
    const count = new Map<string, number>();
    state.workouts.forEach((w) => w.entries.forEach((e) => count.set(e.exerciseId, (count.get(e.exerciseId) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => exMap.get(id)?.kind === 'weight');
  }, [state.workouts, exMap]);
  const [exId, setExId] = useState<string>('');
  const chosen = exId || usedIds[0] || '';
  const chosenDef = exMap.get(chosen);
  const exData = useMemo(() => chosenDef ? exerciseHistory(state.workouts, chosen, chosenDef).map((h) => ({ date: fmtDate(h.date), e1rm: Math.round(h.bestE1rm), weight: h.maxWeight })) : [], [state.workouts, chosen, chosenDef]);

  const growth = tr.filter((t) => t.metric !== 'Вес тела');
  const score = growth.reduce((a, t) => a + Math.sign(Math.round(t.delta / 5)), 0);
  const verdict = state.workouts.length < 2 ? null : score > 0 ? { t: '📈 Рост', c: 'good', d: 'За последние 4 недели показатели выше, чем за предыдущие 4.' } : score < 0 ? { t: '📉 Спад', c: 'bad', d: 'Показатели ниже, чем месяц назад. Проверь советы тренера.' } : { t: '➡️ Стабильно', c: 'text-2', d: 'Показатели держатся на уровне прошлого месяца.' };

  const bwData = [...state.bodyweight].sort((a, b) => a.date.localeCompare(b.date)).map((b) => ({ date: fmtDate(b.date), kg: b.kg }));
  const maxSets = Math.max(1, ...statuses.map((s) => s.sets));

  if (!state.workouts.length) {
    return (
      <div className="screen">
        <h1 style={{ fontSize: 20 }}>Прогресс</h1>
        <Card><Empty icon="📊" title="Пока нечего показывать" text="После первых тренировок здесь появятся графики объёма, силы, веса тела и баланса мышц." /></Card>
        <BodyweightCard bw={bw} setBw={setBw} data={bwData} onSave={() => { if (bw) { dispatch({ type: 'logBodyweight', kg: bw }); setBw(undefined); toast('Вес записан'); } }} last={latestBodyweight(state.bodyweight)} />
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="row between"><h1 style={{ fontSize: 20 }}>Прогресс</h1></div>

      {verdict && (
        <Card>
          <div className={`bold ${verdict.c}`} style={{ fontSize: 18 }}>{verdict.t}</div>
          <p className="small text-2" style={{ margin: '4px 0 10px' }}>{verdict.d}</p>
          <div className="grid-2">
            {tr.map((t) => {
              const up = t.delta > 2, down = t.delta < -2;
              const goodWhenUp = t.metric !== 'Вес тела';
              const kind = t.metric === 'Вес тела' ? 'muted' : up ? 'good' : down ? 'bad' : 'muted';
              return <StatTile key={t.metric} value={`${fmtNum(t.now, t.unit === 'кг' && t.now < 1000 ? 1 : 0)}${t.unit ? ' ' + t.unit : ''}`} label={t.metric} delta={`${t.delta > 0 ? '↑' : t.delta < 0 ? '↓' : '='} ${Math.abs(Math.round(t.delta))}% к пред. 4 нед.`} deltaKind={goodWhenUp ? kind : 'muted'} />;
            })}
          </div>
        </Card>
      )}

      <Segmented value={period} onChange={setPeriod} options={[{ value: '4', label: '4 недели' }, { value: '12', label: '12 недель' }, { value: '26', label: 'Полгода' }]} />

      <Card title="Тоннаж по неделям" right={<span className="small muted">кг</span>}>
        <Bars data={series} x="label" y="tonnage" name="Тоннаж" unit="кг" />
      </Card>
      <Card title="Тренировок в неделю">
        <Bars data={series} x="label" y="workouts" name="Тренировок" color="var(--series-3)" integer />
      </Card>

      {usedIds.length > 0 && (
        <Card title="Сила: расчётный 1ПМ" right={<button className="btn sm ghost" onClick={() => chosen && onExercise(chosen)}>Подробнее →</button>}>
          <div className="chips scroll" style={{ marginBottom: 6 }}>
            {usedIds.slice(0, 8).map((id) => <button key={id} className={`chip ${id === chosen ? 'active' : ''}`} onClick={() => setExId(id)}>{exMap.get(id)?.name}</button>)}
          </div>
          {exData.length >= 2 ? <Lines data={exData} x="date" y="e1rm" name="1ПМ" unit="кг" digits={0} color="var(--series-2)" /> : <p className="small muted">Нужно минимум две сессии этого упражнения.</p>}
        </Card>
      )}

      <Card title="Баланс мышц за 30 дней" right={<span className="small muted">подходы</span>}>
        <HBars rows={[...statuses].sort((a, b) => b.sets - a.sets).map((s) => ({ label: MUSCLES[s.id].short, value: s.sets, max: maxSets, warn: s.lagging }))} />
        <p className="tiny muted" style={{ marginTop: 8 }}>Оранжевым — отстающие (меньше половины среднего или меньше 4 подходов). Основные мышцы считаются как 1 подход, вспомогательные — 0.5.</p>
      </Card>

      <BodyweightCard bw={bw} setBw={setBw} data={bwData} onSave={() => { if (bw) { dispatch({ type: 'logBodyweight', kg: bw }); setBw(undefined); toast('Вес записан'); } }} last={latestBodyweight(state.bodyweight)} />
      <span className="sr-only">{exercises.length}</span>
    </div>
  );
};

const BodyweightCard = ({ bw, setBw, data, onSave, last }: { bw: number | undefined; setBw: (v: number | undefined) => void; data: { date: string; kg: number }[]; onSave: () => void; last?: number }) => (
  <Card title="Вес тела" right={last ? <span className="small muted">сейчас {last} кг</span> : undefined}>
    <div className="row" style={{ marginBottom: data.length >= 2 ? 6 : 0 }}>
      <NumInput value={bw} step={0.1} placeholder={last ? `${last}` : 'кг'} onChange={setBw} />
      <button className="btn primary" disabled={!bw} onClick={onSave}>Записать</button>
    </div>
    {data.length >= 2 ? <Lines data={data} x="date" y="kg" name="Вес" unit="кг" digits={1} color="var(--violet)" /> : <p className="small muted" style={{ marginTop: 8 }}>Записывай вес раз в неделю — появится график и относительная сила.</p>}
  </Card>
);
