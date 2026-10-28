import { useEffect, useMemo, useState } from 'react';
import type { Exercise, SetEntry, Workout, WorkoutEntry, WorkoutSummary } from '../types';
import { useStore } from '../store';
import { Card, Empty, Modal, NumInput } from '../components/ui';
import { ExercisePickerModal } from '../components/ExercisePicker';
import { MUSCLES, CATEGORIES } from '../data/muscles';
import { fmtDateTime, fmtNum, fmtDuration, plural } from '../lib/dates';
import { exerciseHistory, isSetFilled, workoutDurationMin, workoutSets, workoutTonnage } from '../lib/stats';
import { ACHIEVEMENT_MAP } from '../lib/achievements';
import { LEVEL_TITLES } from '../lib/xp';

const levelTitle = (level: number) => [...LEVEL_TITLES].reverse().find(([l]) => level >= l)?.[1] ?? 'Новичок';
import { haptic } from '../lib/telegram';
import { toast } from '../lib/toast';

const useElapsed = (startIso?: string) => {
  const [, tick] = useState(0);
  useEffect(() => { if (!startIso) return; const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, [startIso]);
  if (!startIso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 1000));
};

const fmtClock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

const setLabel = (s: SetEntry, kind: Exercise['kind']) => {
  if (kind === 'weight') return `${s.weight ?? 0}×${s.reps ?? 0}`;
  if (kind === 'bodyweight') return s.weight ? `+${s.weight}×${s.reps ?? 0}` : `×${s.reps ?? 0}`;
  if (kind === 'time') return `${s.seconds ?? 0} с`;
  return `${Math.round((s.seconds ?? 0) / 60)} мин${s.km ? ` ${s.km} км` : ''}`;
};

export const WorkoutScreen = ({ onExercise }: { onExercise: (id: string) => void }) => {
  const { state, dispatch, exMap, finishWorkout } = useStore();
  const [picker, setPicker] = useState(false);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const draft = state.draft;
  const elapsed = useElapsed(draft?.date);

  const recent = useMemo(() => {
    const ids: string[] = [];
    for (const w of [...state.workouts].reverse()) for (const e of w.entries) if (!ids.includes(e.exerciseId)) ids.push(e.exerciseId);
    return ids.slice(0, 12);
  }, [state.workouts]);

  const filledSets = draft ? workoutSets(draft, exMap) : 0;

  const finish = () => {
    if (!draft) return;
    if (filledSets === 0) { toast('Заполни хотя бы один подход'); return; }
    const s = finishWorkout();
    if (s) { haptic('success'); setSummary(s); }
  };

  if (!draft) {
    const history = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date));
    return (
      <div className="screen">
        <button className="btn gold block" style={{ minHeight: 56, fontSize: 17 }} onClick={() => { haptic('medium'); dispatch({ type: 'startWorkout' }); }}>⚔️ Начать тренировку</button>
        <Card title="История" right={<span className="small muted">{history.length} {plural(history.length, 'тренировка', 'тренировки', 'тренировок')}</span>}>
          {history.length ? (
            <div className="list">
              {history.map((w) => <HistoryItem key={w.id} w={w} onExercise={onExercise} onDelete={() => { if (confirm('Удалить тренировку? XP за неё будет снят.')) dispatch({ type: 'deleteWorkout', id: w.id }); }} />)}
            </div>
          ) : <Empty icon="📓" title="Журнал пуст" text="Начни тренировку, добавь упражнения и записывай подходы. За каждую тренировку герой получает опыт." />}
        </Card>
        <SummaryModal summary={summary} onClose={() => setSummary(null)} />
      </div>
    );
  }

  return (
    <div className="screen">
      <Card>
        <div className="row between">
          <div>
            <div className="small muted">Тренировка идёт</div>
            <div className="timer">{fmtClock(elapsed)}</div>
          </div>
          <div className="row">
            <div className="stat-tile center" style={{ padding: '6px 10px' }}><div className="v" style={{ fontSize: 16 }}>{filledSets}</div><div className="l">подх.</div></div>
            <div className="stat-tile center" style={{ padding: '6px 10px' }}><div className="v" style={{ fontSize: 16 }}>{fmtNum(workoutTonnage(draft, exMap))}</div><div className="l">кг</div></div>
          </div>
        </div>
      </Card>

      {draft.entries.map((entry) => {
        const def = exMap.get(entry.exerciseId);
        if (!def) return null;
        return <EntryCard key={entry.id} entry={entry} def={def} prior={state.workouts} onExercise={onExercise} />;
      })}

      <button className="btn primary block" onClick={() => setPicker(true)}>+ Добавить упражнение</button>

      <Card>
        <textarea rows={2} placeholder="Заметка: самочувствие, что пошло не так…" value={draft.note ?? ''} onChange={(e) => dispatch({ type: 'setNote', note: e.target.value })} />
      </Card>

      <div className="row">
        <button className="btn danger" onClick={() => setConfirmDiscard(true)}>Отменить</button>
        <button className="btn gold grow" style={{ minHeight: 50 }} onClick={finish}>🏁 Завершить тренировку</button>
      </div>

      <ExercisePickerModal open={picker} onClose={() => setPicker(false)} recent={recent} onPick={(e) => { dispatch({ type: 'addEntry', exerciseId: e.id }); setPicker(false); }} />

      <Modal open={confirmDiscard} onClose={() => setConfirmDiscard(false)}>
        <h2>Отменить тренировку?</h2>
        <p className="text-2">Записанные подходы будут потеряны, XP не начислится.</p>
        <div className="row">
          <button className="btn grow" onClick={() => setConfirmDiscard(false)}>Продолжить</button>
          <button className="btn danger grow" onClick={() => { dispatch({ type: 'discardWorkout' }); setConfirmDiscard(false); }}>Отменить</button>
        </div>
      </Modal>

      <SummaryModal summary={summary} onClose={() => setSummary(null)} />
    </div>
  );
};

const EntryCard = ({ entry, def, prior, onExercise }: { entry: WorkoutEntry; def: Exercise; prior: Workout[]; onExercise: (id: string) => void }) => {
  const { dispatch } = useStore();
  const hist = useMemo(() => exerciseHistory(prior, def.id, def), [prior, def]);
  const last = hist[hist.length - 1];
  const lastWorkout = last ? prior.find((w) => w.id === last.workoutId) : undefined;
  const lastSets = lastWorkout?.entries.filter((e) => e.exerciseId === def.id).flatMap((e) => e.sets).filter((s) => isSetFilled(s, def.kind)) ?? [];
  const best = Math.max(0, ...hist.map((h) => (def.kind === 'time' ? h.bestSeconds : def.kind === 'cardio' ? h.km : h.maxWeight)));
  const kind = def.kind;
  const single = kind === 'time';
  const heads = kind === 'weight' ? ['кг', 'повт.'] : kind === 'bodyweight' ? ['+кг', 'повт.'] : kind === 'time' ? ['секунд'] : ['минут', 'км'];

  const addSet = () => {
    const lastSet = entry.sets[entry.sets.length - 1];
    const tpl = lastSet ? { weight: lastSet.weight, reps: lastSet.reps, seconds: lastSet.seconds, km: lastSet.km } : {};
    dispatch({ type: 'addSet', entryId: entry.id, set: tpl });
    haptic('light');
  };
  const fillFromLast = () => {
    if (!lastSets.length) return;
    entry.sets.forEach((s) => dispatch({ type: 'removeSet', entryId: entry.id, setId: s.id }));
    lastSets.forEach((s) => dispatch({ type: 'addSet', entryId: entry.id, set: { weight: s.weight, reps: s.reps, seconds: s.seconds, km: s.km } }));
  };

  return (
    <Card>
      <div className="row between" style={{ marginBottom: 8 }}>
        <button className="grow" style={{ textAlign: 'left' }} onClick={() => onExercise(def.id)}>
          <div className="bold">{CATEGORIES[def.category].icon} {def.name}</div>
          <div className="tiny muted">{def.primary.map((m) => MUSCLES[m].short).join(', ')}{best > 0 && ` · рекорд ${kind === 'time' ? fmtDuration(best) : kind === 'cardio' ? `${best} км` : `${best} кг`}`}</div>
        </button>
        <button className="x" aria-label="Убрать упражнение" onClick={() => dispatch({ type: 'removeEntry', entryId: entry.id })}>✕</button>
      </div>
      {lastSets.length > 0 && (
        <button className="chip" style={{ marginBottom: 8 }} onClick={fillFromLast}>🕒 Прошлый раз: {lastSets.map((s) => setLabel(s, kind)).join(', ')} — повторить</button>
      )}
      <div className={`set-head ${single ? 'single' : ''}`}><span>#</span>{heads.map((h) => <span key={h}>{h}</span>)}<span /></div>
      <div className="stack" style={{ marginTop: 6 }}>
        {entry.sets.map((s, i) => (
          <div key={s.id} className={`set-row ${single ? 'single' : ''}`}>
            <span className="n">{i + 1}</span>
            {kind === 'weight' || kind === 'bodyweight' ? (<>
              <NumInput value={s.weight} step={0.5} placeholder={kind === 'bodyweight' ? '0' : 'кг'} onChange={(v) => dispatch({ type: 'updateSet', entryId: entry.id, setId: s.id, patch: { weight: v } })} />
              <NumInput value={s.reps} inputMode="numeric" placeholder="повт." onChange={(v) => dispatch({ type: 'updateSet', entryId: entry.id, setId: s.id, patch: { reps: v } })} />
            </>) : kind === 'time' ? (
              <NumInput value={s.seconds} inputMode="numeric" placeholder="сек" onChange={(v) => dispatch({ type: 'updateSet', entryId: entry.id, setId: s.id, patch: { seconds: v } })} />
            ) : (<>
              <NumInput value={s.seconds !== undefined ? Math.round(s.seconds / 60) : undefined} inputMode="numeric" placeholder="мин" onChange={(v) => dispatch({ type: 'updateSet', entryId: entry.id, setId: s.id, patch: { seconds: v === undefined ? undefined : v * 60 } })} />
              <NumInput value={s.km} step={0.1} placeholder="км" onChange={(v) => dispatch({ type: 'updateSet', entryId: entry.id, setId: s.id, patch: { km: v } })} />
            </>)}
            <button className="x" aria-label="Удалить подход" onClick={() => dispatch({ type: 'removeSet', entryId: entry.id, setId: s.id })}>–</button>
          </div>
        ))}
      </div>
      <button className="btn sm block" style={{ marginTop: 10 }} onClick={addSet}>+ Подход</button>
    </Card>
  );
};

const HistoryItem = ({ w, onExercise, onDelete }: { w: Workout; onExercise: (id: string) => void; onDelete: () => void }) => {
  const { exMap } = useStore();
  const dur = workoutDurationMin(w);
  return (
    <details>
      <summary className="list-item">
        <span className="ic">🏋️</span>
        <span className="grow">
          <div className="t">{fmtDateTime(w.date)}</div>
          <div className="s">{w.entries.length} упр. · {workoutSets(w, exMap)} подх. · {fmtNum(workoutTonnage(w, exMap))} кг{dur ? ` · ${dur} мин` : ''}</div>
        </span>
        <span className="chip gold">+{w.xp} XP</span>
      </summary>
      <div className="stack" style={{ padding: '4px 0 12px 50px' }}>
        {w.entries.map((e) => {
          const def = exMap.get(e.exerciseId);
          if (!def) return null;
          return (
            <button key={e.id} className="small" style={{ textAlign: 'left' }} onClick={() => onExercise(def.id)}>
              <b>{def.name}</b> <span className="text-2">{e.sets.map((s) => setLabel(s, def.kind)).join(', ')}</span>
              {w.prs.some((p) => p.exerciseId === def.id) && <span className="chip gold" style={{ marginLeft: 6, padding: '1px 7px', fontSize: 10 }}>PR</span>}
            </button>
          );
        })}
        {w.note && <div className="small muted">«{w.note}»</div>}
        <button className="btn sm danger" style={{ alignSelf: 'flex-start', width: 'fit-content' }} onClick={onDelete}>Удалить</button>
      </div>
    </details>
  );
};

export const SummaryModal = ({ summary, onClose }: { summary: WorkoutSummary | null; onClose: () => void }) => {
  const { exMap } = useStore();
  if (!summary) return null;
  const { workout, levelBefore, levelAfter, newAchievements, musclesWorked } = summary;
  const achXp = newAchievements.reduce((a, x) => a + x.xp, 0);
  return (
    <Modal open={!!summary} onClose={onClose}>
      <h2 className="center">Итоги тренировки</h2>
      <div className="xp-pop">+{workout.xp + achXp} XP</div>
      {levelAfter > levelBefore && <div className="levelup">⬆️ Новый уровень {levelAfter} — {levelTitle(levelAfter)}!</div>}
      <div className="grid-3">
        <div className="stat-tile center"><div className="v">{workoutSets(workout, exMap)}</div><div className="l">подходов</div></div>
        <div className="stat-tile center"><div className="v">{fmtNum(workoutTonnage(workout, exMap))}</div><div className="l">кг тоннаж</div></div>
        <div className="stat-tile center"><div className="v">{workoutDurationMin(workout)}</div><div className="l">минут</div></div>
      </div>
      <Card flat title="Начислено">
        <div className="stack" style={{ gap: 6 }}>
          {workout.xpBreakdown.map((l, i) => <div key={i} className="row between small"><span className="text-2">{l.label}</span><b className="gold">+{l.xp}</b></div>)}
        </div>
      </Card>
      {workout.prs.length > 0 && (
        <Card flat title="🏅 Личные рекорды">
          <div className="stack" style={{ gap: 6 }}>
            {workout.prs.map((p, i) => {
              const d = exMap.get(p.exerciseId);
              const label = p.kind === 'weight' ? `${p.value} кг` : p.kind === 'e1rm' ? `1ПМ ${Math.round(p.value)} кг` : p.kind === 'reps' ? `${p.value} повт.` : p.kind === 'time' ? fmtDuration(p.value) : `${p.value} км`;
              return <div key={i} className="row between small"><span>{d?.name}</span><b>{label}{p.prev ? <span className="muted"> ← {p.kind === 'e1rm' ? Math.round(p.prev) : p.prev}</span> : null}</b></div>;
            })}
          </div>
        </Card>
      )}
      {newAchievements.length > 0 && (
        <Card flat title="🏆 Новые достижения">
          {newAchievements.map((a) => { const d = ACHIEVEMENT_MAP.get(a.id); return d ? (
            <div key={a.id} className="ach"><span className="ic">{d.icon}</span><span className="grow"><div className="t bold">{d.title}</div><div className="small muted">{d.desc}</div></span><span className="xp">+{d.xp} XP</span></div>
          ) : null; })}
        </Card>
      )}
      {musclesWorked.length > 0 && <div className="chips">{musclesWorked.map((m) => <span key={m} className="chip good">{MUSCLES[m].short}</span>)}</div>}
      <button className="btn gold block" onClick={onClose}>Отлично!</button>
    </Modal>
  );
};
