import { useEffect, useMemo, useState } from 'react';
import type { Category, Exercise, SetEntry, Workout, WorkoutEntry, WorkoutSummary } from '../types';
import { useStore } from '../store';
import { Empty, Modal, NumInput } from '../components/ui';
import { ExercisePickerModal } from '../components/ExercisePicker';
import { Figure } from '../components/Figure';
import { Cta, Hud, Panel, Stencil, Sunset } from '../components/gta';
import { MUSCLES, CATEGORIES } from '../data/muscles';
import { fmtDateTime, fmtNum, fmtDuration, plural } from '../lib/dates';
import { exerciseHistory, isSetFilled, totals, weekStreak, workoutDurationMin, workoutSets, workoutTonnage } from '../lib/stats';
import { ACHIEVEMENT_MAP } from '../lib/achievements';
import { levelFromXp, LEVEL_TITLES } from '../lib/xp';
import { bulkFromLevel, stageOf, DEFAULT_LOOK } from '../lib/figure';
import { haptic } from '../lib/telegram';
import { toast } from '../lib/toast';
import { useClock } from './HeroScreen';
import { TaskCard } from '../components/TaskCard';
import { CYCLE_WEEKS, programWeek, todayTask, trainedToday } from '../lib/programs';
import { isTrainingDay, nextTrainingLabel, weekPlan } from '../lib/schedule';
import { WeekList } from './ScheduleScreen';

const levelTitle = (level: number) => [...LEVEL_TITLES].reverse().find(([l]) => level >= l)?.[1] ?? 'Новичок';
const useElapsed = (startIso?: string) => {
  const [, tick] = useState(0);
  useEffect(() => { if (!startIso) return; const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, [startIso]);
  return startIso ? Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 1000)) : 0;
};
const fmtClock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const setLabel = (s: SetEntry, kind: Exercise['kind']) => {
  if (kind === 'weight') return `${s.weight ?? 0}×${s.reps ?? 0}`;
  if (kind === 'bodyweight') return s.weight ? `+${s.weight}×${s.reps ?? 0}` : `×${s.reps ?? 0}`;
  if (kind === 'time') return `${s.seconds ?? 0} с`;
  return `${Math.round((s.seconds ?? 0) / 60)} мин${s.km ? ` ${s.km} км` : ''}`;
};
const DAY_NAMES: Record<Category, string> = { chest: 'ДЕНЬ ГРУДИ', back: 'ДЕНЬ СПИНЫ', legs: 'ДЕНЬ НОГ', shoulders: 'ДЕНЬ ПЛЕЧ', arms: 'ДЕНЬ РУК', core: 'ДЕНЬ ПРЕССА', cardio: 'КАРДИО', other: 'МИССИЯ' };
export const missionName = (w: Workout, exMap: Map<string, Exercise>) => {
  const cats = [...new Set(w.entries.map((e) => exMap.get(e.exerciseId)?.category).filter((c): c is Category => !!c))];
  if (!cats.length) return 'МИССИЯ'; if (cats.length >= 3) return 'ФУЛБОДИ';
  return cats.map((c) => DAY_NAMES[c]).join(' + ').replace(' + ДЕНЬ', ' + ');
};

export const WorkoutScreen = ({ onExercise, onPrograms, onCoach, onSchedule }: { onExercise: (id: string) => void; onPrograms: () => void; onCoach: () => void; onSchedule: () => void }) => {
  const { state, dispatch, exMap, finishWorkout } = useStore();
  const clock = useClock();
  const [picker, setPicker] = useState(false);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const draft = state.draft;
  const elapsed = useElapsed(draft?.date);
  const t = useMemo(() => totals(state.workouts, exMap), [state.workouts, exMap]);
  const recent = useMemo(() => { const ids: string[] = []; for (const w of [...state.workouts].reverse()) for (const e of w.entries) if (!ids.includes(e.exerciseId)) ids.push(e.exerciseId); return ids.slice(0, 12); }, [state.workouts]);
  const filledSets = draft ? workoutSets(draft, exMap) : 0;
  const finish = () => { if (!draft) return; if (filledSets === 0) { toast('Заполни хотя бы один подход'); return; } const s = finishWorkout(); if (s) { haptic('success'); setSummary(s); } };

  if (!draft) {
    const history = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date));
    return (
      <div className="screen">
        <Sunset /><div className="halftone" />
        <div className="head">
          <div><div className="tag">МИССИИ</div><div style={{ marginTop: 6 }}><Stencil kind="y">{history.length} {plural(history.length, 'выполнена', 'выполнены', 'выполнено')}</Stencil></div></div>
          <Hud clock={clock} money={t.tonnage} bars={[]} stars={weekStreak(state.workouts)} compact />
        </div>
        <div className="z stack">
          <TodayBlock onPrograms={onPrograms} onCoach={onCoach} onSchedule={onSchedule} />
          <Cta dark onClick={() => { haptic('medium'); dispatch({ type: 'startWorkout' }); }}>＋ Свободная миссия без задания</Cta>
          <Panel>
            <div className="pm-title"><span>Журнал миссий</span></div>
            {history.length ? <div className="list">{history.map((w) => <HistoryItem key={w.id} w={w} onExercise={onExercise} onDelete={() => { if (confirm('Удалить миссию? Respect за неё будет снят.')) dispatch({ type: 'deleteWorkout', id: w.id }); }} />)}</div>
              : <Empty icon="📓" title="Журнал пуст" text="Начни миссию, добавь упражнения и записывай подходы. За каждую миссию герой получает Respect." />}
          </Panel>
        </div>
        <MissionPassed summary={summary} onClose={() => setSummary(null)} />
      </div>
    );
  }

  return (
    <div className="screen">
      <Sunset /><div className="halftone" />
      <div className="head">
        <div><div className="tag sm">{draft.task?.title.toUpperCase() ?? missionName(draft, exMap)}</div><div style={{ marginTop: 6 }}><Stencil kind="y">Миссия идёт · {filledSets} подх.</Stencil></div></div>
        <Hud clock={fmtClock(elapsed)} money={workoutTonnage(draft, exMap)} moneyLabel="тоннаж миссии, кг" bars={[]} stars={weekStreak(state.workouts)} compact />
      </div>
      <div className="z stack">
        {draft.entries.map((entry) => { const def = exMap.get(entry.exerciseId); return def ? <EntryCard key={entry.id} entry={entry} def={def} prior={state.workouts} onExercise={onExercise} /> : null; })}
        <Cta dark onClick={() => setPicker(true)}>+ Упражнение</Cta>
        <Panel><textarea rows={2} placeholder="Заметка: самочувствие, что пошло не так…" value={draft.note ?? ''} onChange={(e) => dispatch({ type: 'setNote', note: e.target.value })} /></Panel>
        <div className="row">
          <Cta danger onClick={() => setConfirmDiscard(true)} style={{ width: 110 }}>Отмена</Cta>
          <Cta onClick={finish} style={{ flex: 1, height: 54 }}>🏁 Завершить</Cta>
        </div>
      </div>
      <ExercisePickerModal open={picker} onClose={() => setPicker(false)} recent={recent} onPick={(e) => { dispatch({ type: 'addEntry', exerciseId: e.id }); setPicker(false); }} />
      <Modal open={confirmDiscard} onClose={() => setConfirmDiscard(false)}>
        <div className="mono goldc">Отменить миссию?</div>
        <p className="t2 small">Записанные подходы будут потеряны, Respect не начислится.</p>
        <div className="row"><Cta dark onClick={() => setConfirmDiscard(false)} style={{ flex: 1 }}>Продолжить</Cta><Cta danger onClick={() => { dispatch({ type: 'discardWorkout' }); setConfirmDiscard(false); }} style={{ flex: 1 }}>Отменить</Cta></div>
      </Modal>
      <MissionPassed summary={summary} onClose={() => setSummary(null)} />
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
  const kind = def.kind; const single = kind === 'time';
  const heads = kind === 'weight' ? ['кг', 'повт.'] : kind === 'bodyweight' ? ['+кг', 'повт.'] : kind === 'time' ? ['секунд'] : ['минут', 'км'];
  const addSet = () => { const l = entry.sets[entry.sets.length - 1]; dispatch({ type: 'addSet', entryId: entry.id, set: l ? { weight: l.weight, reps: l.reps, seconds: l.seconds, km: l.km } : {} }); haptic('light'); };
  const fillFromLast = () => { if (!lastSets.length) return; entry.sets.forEach((s) => dispatch({ type: 'removeSet', entryId: entry.id, setId: s.id })); lastSets.forEach((s) => dispatch({ type: 'addSet', entryId: entry.id, set: { weight: s.weight, reps: s.reps, seconds: s.seconds, km: s.km } })); };
  return (
    <Panel accent="var(--gold)">
      <div className="row between">
        <button className="grow" style={{ textAlign: 'left' }} onClick={() => onExercise(def.id)}>
          <div className="mono" style={{ fontSize: 12, color: '#fff' }}>{CATEGORIES[def.category].icon} {def.name}</div>
          <div className="osw tiny mut" style={{ marginTop: 2 }}>{def.primary.map((m) => MUSCLES[m].short).join(', ')}{best > 0 && ` · рекорд ${kind === 'time' ? fmtDuration(best) : kind === 'cardio' ? `${best} км` : `${best} кг`}`}</div>
        </button>
        <button className="x" style={{ color: '#999', fontSize: 18, padding: 4 }} aria-label="Убрать упражнение" onClick={() => dispatch({ type: 'removeEntry', entryId: entry.id })}>✕</button>
      </div>
      {lastSets.length > 0 && <div style={{ marginTop: 6 }}><Stencil small onClick={fillFromLast}>🕒 Прошлый раз {lastSets.map((s) => setLabel(s, kind)).join(', ')} — повторить</Stencil></div>}
      <div className={`set-head ${single ? 'single' : ''}`}><span>#</span>{heads.map((h) => <span key={h}>{h}</span>)}<span /></div>
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
      <Cta dark className="sm" onClick={addSet} style={{ marginTop: 8 }}>+ Подход</Cta>
    </Panel>
  );
};

const HistoryItem = ({ w, onExercise, onDelete }: { w: Workout; onExercise: (id: string) => void; onDelete: () => void }) => {
  const { exMap } = useStore();
  const dur = workoutDurationMin(w);
  return (
    <details>
      <summary className="list-item">
        <span className="ic">🏋️</span>
        <span className="grow"><div className="t">{w.task ? `📋 ${w.task.title}` : missionName(w, exMap)} · {fmtDateTime(w.date)}</div><div className="s">{w.entries.length} упр. · {workoutSets(w, exMap)} подх. · {fmtNum(workoutTonnage(w, exMap))} кг{dur ? ` · ${dur} мин` : ''}</div></span>
        <span className="chip active">+{w.xp}</span>
      </summary>
      <div className="stack" style={{ padding: '4px 0 12px 50px' }}>
        {w.entries.map((e) => { const def = exMap.get(e.exerciseId); if (!def) return null; return (
          <button key={e.id} className="small" style={{ textAlign: 'left' }} onClick={() => onExercise(def.id)}><b>{def.name}</b> <span className="t2">{e.sets.map((s) => setLabel(s, def.kind)).join(', ')}</span>{w.prs.some((p) => p.exerciseId === def.id) && <span className="chip active" style={{ marginLeft: 6, padding: '1px 6px', fontSize: 8 }}>PR</span>}</button>); })}
        {w.note && <div className="small mut">«{w.note}»</div>}
        <button className="btn sm danger" style={{ width: 'fit-content' }} onClick={onDelete}>Удалить</button>
      </div>
    </details>
  );
};

/** Полноэкранные итоги: MISSION PASSED! */
export const MissionPassed = ({ summary, onClose }: { summary: WorkoutSummary | null; onClose: () => void }) => {
  const { exMap, state } = useStore();
  if (!summary) return null;
  const { workout, levelBefore, levelAfter, newAchievements, musclesWorked } = summary;
  const achXp = newAchievements.reduce((a, x) => a + x.xp, 0);
  const lvl = levelFromXp(state.profile.xp); const b = bulkFromLevel(lvl.level);
  return (
    <div className="overlay">
      <Sunset className="full" />
      <div className="inner z" style={{ position: 'relative' }}>
        <div className="center">
          <div className="bowl gold-text pop" style={{ fontSize: 38, lineHeight: 1 }}>MISSION PASSED!</div>
          <div className="osw small" style={{ color: '#fff', textShadow: '1px 1px 0 #000', marginTop: 6 }}>{missionName(workout, exMap)} · {workoutDurationMin(workout)} мин · {workoutSets(workout, exMap)} подх. · {fmtNum(workoutTonnage(workout, exMap))} кг</div>
          <div className="bowl" style={{ fontSize: 18, color: '#fff', WebkitTextStroke: '1px #000', textShadow: '3px 3px 0 #000', marginTop: 10 }}>RESPECT +</div>
          <div className="mono yellow pop" style={{ fontSize: 46, marginTop: 2 }}>{workout.xp + achXp}</div>
          {levelAfter > levelBefore && <div style={{ marginTop: 8 }}><Stencil kind="y">⬆ Уровень {levelAfter} · {levelTitle(levelAfter)}</Stencil></div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 -30px' }}>
          <Figure b={b} stage={stageOf(b)} gear={state.profile.gear || 'street'} look={state.profile.look || DEFAULT_LOOK} muscles={{ today: musclesWorked }} w={200} h={346} />
        </div>
        <Panel>
          {workout.xpBreakdown.map((l, i) => <div key={i} className="xrow"><span>{l.label}</span><b>+{l.xp}</b></div>)}
          {workout.prs.length > 0 && <div className="pm-title" style={{ marginTop: 8 }}><span>★ Личные рекорды</span></div>}
          {workout.prs.map((p, i) => { const d = exMap.get(p.exerciseId); const label = p.kind === 'weight' ? `${p.value} кг` : p.kind === 'e1rm' ? `1ПМ ${Math.round(p.value)} кг` : p.kind === 'reps' ? `${p.value} повт.` : p.kind === 'time' ? fmtDuration(p.value) : `${p.value} км`; return <div key={i} className="xrow"><span>{d?.name}</span><b>{label}{p.prev ? <span className="mut"> ← {p.kind === 'e1rm' ? Math.round(p.prev) : p.prev}</span> : null}</b></div>; })}
          {newAchievements.map((a) => { const d = ACHIEVEMENT_MAP.get(a.id); return d ? <div key={a.id} className="xrow" style={{ color: 'var(--green-2)' }}><span>🏆 Трофей: {d.title}</span><b>+{d.xp}</b></div> : null; })}
        </Panel>
        {musclesWorked.length > 0 && <div className="chips" style={{ marginTop: 10 }}>{musclesWorked.map((m) => <span key={m} className="chip g">{MUSCLES[m].short}</span>)}</div>}
        <Cta onClick={onClose} style={{ marginTop: 14 }}>Отлично</Cta>
      </div>
    </div>
  );
};

/** Блок «задание на сегодня» над журналом миссий */
const TodayBlock = ({ onPrograms, onCoach, onSchedule }: { onPrograms: () => void; onCoach: () => void; onSchedule: () => void }) => {
  const { state, exMap, dispatch } = useStore();
  const [anyway, setAnyway] = useState(false);
  const task = useMemo(() => todayTask(state, exMap), [state, exMap]);
  const rows = useMemo(() => weekPlan(state, (id) => exMap.get(id)?.name), [state, exMap]);
  const done = trainedToday(state);
  const sched = state.schedule;
  const weekBtn = <Cta dark className="sm" onClick={onSchedule}>📅 Неделя{state.program ? ` ${programWeek(state.program.start)}/${CYCLE_WEEKS}` : ''} · расписание</Cta>;

  if (!sched && !task) {
    return (
      <Panel>
        <div className="pm-title"><span>Задание на сегодня</span></div>
        <p className="small t2">Настрой неделю: выбери Full Body или сплит и дни тренировок. Игра разложит программу по календарю и каждый день будет выдавать тренировку с весами по твоему прогрессу.</p>
        <div className="row" style={{ marginTop: 10 }}>
          <Cta onClick={onSchedule} style={{ flex: 1 }}>📅 Настроить неделю</Cta>
          <Cta dark onClick={onCoach} style={{ width: 120 }}>📱 Тренер</Cta>
        </div>
      </Panel>
    );
  }
  if (done) {
    return (
      <>
        <Panel>
          <div className="pm-title"><span>✓ Сегодня миссия выполнена</span></div>
          <p className="small t2">Мышцы растут на отдыхе. Следующая тренировка — {nextTrainingLabel(rows)}.</p>
        </Panel>
        {sched && <WeekList rows={rows} compact />}
        {weekBtn}
      </>
    );
  }
  const restDay = sched && !isTrainingDay(state) && task?.source !== 'coach';
  if (restDay && !anyway) {
    return (
      <>
        <section className="rest-card">
          <div className="task-hd" style={{ color: '#8fd3ff' }}><span>☾ Сегодня отдых</span></div>
          <div className="task-title">Восстановление</div>
          <p className="small t2" style={{ marginTop: 8 }}>Мышцы растут на отдыхе. По желанию — 20–30 мин лёгкого кардио и растяжка. Белок 1,6–2 г на кг веса, сон 8 часов.</p>
          {task && <p className="small green" style={{ marginTop: 6 }}>Следующая миссия: <b>{task.title}</b> — {nextTrainingLabel(rows)}</p>}
          <div className="row" style={{ marginTop: 10 }}>
            <Cta dark className="sm" onClick={() => { dispatch({ type: 'startWorkout' }); dispatch({ type: 'addEntry', exerciseId: 'walk' }); }} style={{ flex: 1 }}>🏃 Лёгкое кардио</Cta>
            <Cta dark className="sm" onClick={() => setAnyway(true)} style={{ flex: 1 }} disabled={!task}>Всё равно тренируюсь</Cta>
          </div>
        </section>
        <WeekList rows={rows} compact />
        {weekBtn}
      </>
    );
  }
  if (!task) return null;
  return (
    <>
      <TaskCard task={task} onStart={() => dispatch({ type: 'startTask', task })} onChange={sched ? onSchedule : onPrograms} />
      {sched ? <WeekList rows={rows} compact /> : <Cta dark className="sm" onClick={onSchedule}>📅 Разложить программу по дням недели</Cta>}
      {sched && weekBtn}
    </>
  );
};
