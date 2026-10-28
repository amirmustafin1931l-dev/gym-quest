import { useMemo, useState } from 'react';
import type { Exercise, MuscleId } from '../types';
import { useStore } from '../store';
import { Card, Empty, Segmented } from '../components/ui';
import { ExerciseList, KIND_LABEL, NewExerciseForm } from '../components/ExercisePicker';
import { Lines, Bars } from '../components/charts';
import { CATEGORIES, MUSCLES } from '../data/muscles';
import { fmtDate, fmtDuration, fmtNum } from '../lib/dates';
import { exerciseBests, exerciseHistory, isSetFilled } from '../lib/stats';
import { ACHIEVEMENTS } from '../lib/achievements';

export const ExercisesScreen = ({ selectedId, muscle, onSelect, onBack }: { selectedId: string | null; muscle: MuscleId | null; onSelect: (id: string | null) => void; onBack: () => void }) => {
  const { exMap, exercises } = useStore();
  const [creating, setCreating] = useState(false);
  const def = selectedId ? exMap.get(selectedId) : undefined;
  if (def) return <ExerciseDetail def={def} onBack={() => onSelect(null)} />;

  if (muscle) {
    const list = exercises.filter((e) => e.primary.includes(muscle) || e.secondary.includes(muscle)).sort((a, b) => Number(b.primary.includes(muscle)) - Number(a.primary.includes(muscle)));
    return (
      <div className="screen">
        <div className="row"><button className="btn icon ghost" onClick={onBack}>←</button><h1 style={{ fontSize: 20 }}>{MUSCLES[muscle].name}</h1></div>
        <Card title="Упражнения на эту мышцу">
          <div className="list">
            {list.map((e) => (
              <button key={e.id} className="list-item" onClick={() => onSelect(e.id)}>
                <span className="ic">{CATEGORIES[e.category].icon}</span>
                <span className="grow"><div className="t">{e.name}</div><div className="s">{e.primary.includes(muscle) ? 'основная' : 'вспомогательная'} · {KIND_LABEL[e.kind]}</div></span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="row between">
        <h1 style={{ fontSize: 20 }}>Упражнения</h1>
        <button className="btn sm" onClick={() => setCreating((v) => !v)}>{creating ? 'К списку' : '+ Своё'}</button>
      </div>
      <Card>
        {creating ? <NewExerciseForm onDone={(e) => { setCreating(false); onSelect(e.id); }} /> : <ExerciseList onPick={(e) => onSelect(e.id)} />}
      </Card>
    </div>
  );
};

const ExerciseDetail = ({ def, onBack }: { def: Exercise; onBack: () => void }) => {
  const { state, exMap, dispatch } = useStore();
  const hist = useMemo(() => exerciseHistory(state.workouts, def.id, def), [state.workouts, def]);
  const best = exerciseBests(hist);
  const [metric, setMetric] = useState<'e1rm' | 'weight' | 'tonnage'>(def.kind === 'weight' ? 'e1rm' : 'tonnage');
  const strength = def.kind === 'weight' || def.kind === 'bodyweight';
  const related = ACHIEVEMENTS.filter((a) => a.id.startsWith(def.id + '_'));
  const unlocked = new Set(state.achievements.map((a) => a.id));

  const chartData = hist.map((h) => ({
    date: fmtDate(h.date),
    e1rm: Math.round(h.bestE1rm * 10) / 10,
    weight: h.maxWeight,
    tonnage: h.tonnage,
    reps: h.maxReps,
    seconds: h.bestSeconds,
    km: h.km,
    min: Math.round(h.bestSeconds / 60),
  }));

  // Рекомендация по следующей тренировке
  const advice = useMemo(() => {
    if (!hist.length) return 'Ещё нет записей. Начни с веса, с которым сделаешь 8–10 чистых повторений.';
    const last = hist[hist.length - 1];
    if (def.kind === 'weight') {
      const l3 = hist.slice(-3);
      const stuck = l3.length === 3 && l3.every((x) => x.maxWeight === last.maxWeight) && l3.every((x) => x.bestE1rm <= l3[0].bestE1rm * 1.01);
      if (stuck) return `Три тренировки подряд на ${last.maxWeight} кг без роста 1ПМ. Попробуй ${fmtNum(last.maxWeight + 2.5, 1)} кг на 3–5 повторений или добавь ещё подход на ${last.maxWeight} кг.`;
      if (last.maxReps >= 10) return `В прошлый раз ${last.maxReps} повторений с ${last.maxWeight} кг — вес стал лёгким. Повышай до ${fmtNum(last.maxWeight * 1.05, 1)}–${fmtNum(last.maxWeight + 5, 1)} кг.`;
      if (last.maxReps <= 3) return `Тяжёлая работа на ${last.maxReps} повт. Для объёма добавь подходы на ${fmtNum(last.maxWeight * 0.85, 1)} кг × 6–8.`;
      return `Цель на следующий раз: ${last.maxWeight} кг × ${last.maxReps + 1} или ${fmtNum(last.maxWeight + 2.5, 1)} кг × ${last.maxReps}. Расчётный 1ПМ сейчас ${Math.round(best.bestE1rm)} кг.`;
    }
    if (def.kind === 'bodyweight') return `Рекорд ${best.maxReps} повт. Цель: ${best.maxReps + 1}+ в первом подходе, либо добавь отягощение, если делаешь больше 12.`;
    if (def.kind === 'time') return `Лучшее время ${fmtDuration(best.bestSeconds)}. Добавляй по 10–15 секунд, либо усложняй вариант упражнения.`;
    return `Лучшая дистанция ${best.maxKm} км. Увеличивай объём не больше чем на 10% в неделю.`;
  }, [hist, def, best]);

  return (
    <div className="screen">
      <div className="row">
        <button className="btn icon ghost" onClick={onBack} aria-label="Назад">←</button>
        <div className="grow">
          <h1 style={{ fontSize: 20 }}>{def.name}</h1>
          <div className="small muted">{CATEGORIES[def.category].name} · {def.primary.map((m) => MUSCLES[m].short).join(', ')}{def.secondary.length ? ` (+ ${def.secondary.map((m) => MUSCLES[m].short).join(', ')})` : ''}</div>
        </div>
      </div>

      <div className="grid-3">
        {strength ? (<>
          <div className="stat-tile"><div className="v">{best.maxWeight || '—'}</div><div className="l">макс. вес, кг</div></div>
          <div className="stat-tile"><div className="v">{best.bestE1rm ? Math.round(best.bestE1rm) : '—'}</div><div className="l">расч. 1ПМ, кг</div></div>
          <div className="stat-tile"><div className="v">{best.maxReps || '—'}</div><div className="l">макс. повт.</div></div>
        </>) : def.kind === 'time' ? (<>
          <div className="stat-tile"><div className="v">{best.bestSeconds ? fmtDuration(best.bestSeconds) : '—'}</div><div className="l">лучшее время</div></div>
          <div className="stat-tile"><div className="v">{best.sessions}</div><div className="l">сессий</div></div>
          <div className="stat-tile"><div className="v">{hist.reduce((a, h) => a + h.sets, 0)}</div><div className="l">подходов</div></div>
        </>) : (<>
          <div className="stat-tile"><div className="v">{best.maxKm || '—'}</div><div className="l">макс. км</div></div>
          <div className="stat-tile"><div className="v">{fmtNum(hist.reduce((a, h) => a + h.bestSeconds, 0) / 60)}</div><div className="l">минут всего</div></div>
          <div className="stat-tile"><div className="v">{best.sessions}</div><div className="l">сессий</div></div>
        </>)}
      </div>

      <Card title="Что дорабатывать">
        <p className="text-2">{advice}</p>
      </Card>

      {hist.length >= 2 ? (
        <Card title="Динамика">
          {def.kind === 'weight' && <Segmented value={metric} onChange={setMetric} options={[{ value: 'e1rm', label: '1ПМ' }, { value: 'weight', label: 'Макс. вес' }, { value: 'tonnage', label: 'Тоннаж' }]} />}
          {def.kind === 'weight' && metric === 'e1rm' && <Lines data={chartData} x="date" y="e1rm" name="Расч. 1ПМ" unit="кг" />}
          {def.kind === 'weight' && metric === 'weight' && <Lines data={chartData} x="date" y="weight" name="Макс. вес" unit="кг" digits={1} />}
          {def.kind === 'weight' && metric === 'tonnage' && <Bars data={chartData} x="date" y="tonnage" name="Тоннаж" unit="кг" />}
          {def.kind === 'bodyweight' && <Lines data={chartData} x="date" y="reps" name="Макс. повторений" digits={0} color="var(--series-3)" />}
          {def.kind === 'time' && <Lines data={chartData} x="date" y="seconds" name="Секунд" unit="с" digits={0} color="var(--series-3)" />}
          {def.kind === 'cardio' && <Bars data={chartData} x="date" y="min" name="Минут" unit="мин" color="var(--series-3)" />}
        </Card>
      ) : null}

      {related.length > 0 && (
        <Card title="Достижения упражнения">
          <div className="chips">{related.map((a) => <span key={a.id} className={`chip ${unlocked.has(a.id) ? 'gold' : ''}`}>{a.icon} {a.title}</span>)}</div>
        </Card>
      )}

      <Card title="История" right={<span className="small muted">{hist.length} сессий</span>}>
        {hist.length ? (
          <table className="table">
            <thead><tr><th>Дата</th><th>Подходы</th>{strength && <th className="num">1ПМ</th>}</tr></thead>
            <tbody>
              {[...hist].reverse().map((h) => {
                const w = state.workouts.find((x) => x.id === h.workoutId);
                const sets = w?.entries.filter((e) => e.exerciseId === def.id).flatMap((e) => e.sets).filter((s) => isSetFilled(s, def.kind)) ?? [];
                const isPr = w?.prs.some((p) => p.exerciseId === def.id);
                return (
                  <tr key={h.workoutId}>
                    <td className="muted">{fmtDate(h.date)}{isPr && ' 🏅'}</td>
                    <td className="mono">{sets.map((s) => def.kind === 'time' ? `${s.seconds}с` : def.kind === 'cardio' ? `${Math.round((s.seconds ?? 0) / 60)}м${s.km ? `/${s.km}км` : ''}` : `${s.weight ?? 0}×${s.reps ?? 0}`).join('  ')}</td>
                    {strength && <td className="num">{h.bestE1rm ? Math.round(h.bestE1rm) : '—'}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <Empty icon="📈" title="Пока нет записей" text="Добавь упражнение в тренировку — история и рекорды появятся здесь." />}
      </Card>

      {def.custom && !hist.length && (
        <button className="btn danger block" onClick={() => { if (confirm('Удалить своё упражнение?')) { dispatch({ type: 'deleteCustomExercise', id: def.id }); onBack(); } }}>Удалить упражнение</button>
      )}
      <span className="sr-only">{exMap.size}</span>
    </div>
  );
};
