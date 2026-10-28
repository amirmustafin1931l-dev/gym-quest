/* Движок программ: выдаёт задание на сегодня с автоматической прогрессией по истории игрока */
import type { AppState, CoachId, Exercise, PlanExercise, SetEntry, Workout } from '../types';
import { CUES, HOME_SWAP, programById, type Program, type Slot } from '../data/programs';
import { DAY, dayKey, startOfDay } from './dates';
import { type ExerciseMap, e1rm, exerciseBests, exerciseHistory, isSetFilled } from './stats';
import { coachById, todayPlan } from './coach';

export const CYCLE_WEEKS = 6;

export interface DayTask {
  source: 'program' | 'coach';
  title: string;
  subtitle: string;
  minutes: number;
  warmup: string;
  exercises: PlanExercise[];
  progression: string;
  tip: string;
  greeting?: string;
  programId?: Program['id'];
  day?: number;
  week?: number;
  deload?: boolean;
  coach?: CoachId;
  coachDate?: string;
}

const LOWER_HEAVY = new Set(['squat', 'deadlift', 'leg_press', 'rdl', 'hip_thrust', 'front_squat']);
const roundTo = (x: number, step: number) => Math.max(step, Math.round(x / step) * step);
const fmtKg = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',');

/** Последние сессии упражнения: рабочие подходы (без разминочных), новые первыми */
const lastSessions = (workouts: Workout[], exId: string, def: Exercise, n = 2): SetEntry[][] => {
  const out: SetEntry[][] = [];
  for (const w of [...workouts].sort((a, b) => b.date.localeCompare(a.date))) {
    const sets = w.entries.filter((e) => e.exerciseId === exId).flatMap((e) => e.sets).filter((s) => isSetFilled(s, def.kind));
    if (!sets.length) continue;
    const top = Math.max(0, ...sets.map((s) => s.weight ?? 0));
    out.push(top > 0 ? sets.filter((s) => (s.weight ?? 0) >= top * 0.9) : sets);
    if (out.length >= n) break;
  }
  return out;
};

/** Назначение одного упражнения по правилам прогрессии */
const prescribe = (slot: Slot, exId: string, def: Exercise, workouts: Workout[], deload: boolean): PlanExercise => {
  const base: PlanExercise = { id: exId, sets: slot.sets, reps: slot.lo, weight: null, seconds: null, rest: slot.rest, rir: slot.rir, note: slot.why };
  const [last, prev] = lastSessions(workouts, exId, def);
  const compound = slot.role === 'main' || slot.role === 'secondary';
  const step = compound ? 2.5 : 1;
  const inc = LOWER_HEAVY.has(exId) && compound ? 5 : compound ? 2.5 : 1;

  let p: PlanExercise = base;
  if (def.kind === 'time') {
    const best = last ? Math.max(...last.map((s) => s.seconds ?? 0)) : 0;
    const target = best ? Math.min(slot.hi + 30, Math.max(slot.lo, best + 5)) : slot.lo;
    p = { ...base, reps: null, seconds: target, note: best ? `Прошлый раз ${best} с — держим ${target} с` : `Держи ${slot.lo}–${slot.hi} с с ровной спиной` };
  } else if (def.kind === 'bodyweight') {
    const reps = last ? last.map((s) => s.reps ?? 0) : [];
    const add = last ? Math.max(0, ...last.map((s) => s.weight ?? 0)) : 0;
    if (!reps.length) p = { ...base, reps: slot.lo, note: `${slot.why}. Сколько сможешь в диапазоне ${slot.lo}–${slot.hi}, 1 повтор в запасе` };
    else if (Math.min(...reps) >= slot.hi) p = { ...base, reps: slot.lo, weight: add + 2.5, note: `Все подходы по ${slot.hi} — добавь отягощение ${fmtKg(add + 2.5)} кг` };
    else if (Math.max(...reps) < slot.lo) p = { ...base, reps: Math.max(1, Math.max(...reps)), weight: add || null, note: `Пока меньше ${slot.lo} — делай сколько можешь, каждую неделю +1 повтор` };
    else p = { ...base, reps: Math.min(slot.hi, Math.min(...reps) + 1), weight: add || null, note: `Прошлый раз ${reps.join('/')} — добавь по повтору` };
  } else {
    if (!last) {
      const best = exerciseBests(exerciseHistory(workouts, exId, def)).bestE1rm;
      if (best) p = { ...base, weight: roundTo(best / (1 + (slot.lo + slot.rir) / 30), step), note: `${slot.why}. Стартовый вес от твоего расчётного 1ПМ` };
      else p = { ...base, weight: null, note: `${slot.why}. Подбери вес так, чтобы в последнем подходе оставался запас ${slot.rir} повт.` };
    } else {
      const W = Math.max(...last.map((s) => s.weight ?? 0));
      const atTop = last.filter((s) => (s.weight ?? 0) >= W);
      const reps = atTop.map((s) => s.reps ?? 0);
      const prevBelow = prev ? Math.min(...prev.map((s) => s.reps ?? 0)) < slot.lo : false;
      if (atTop.length < slot.sets && Math.min(...reps) >= slot.lo) p = { ...base, weight: W, reps: slot.lo, note: `Закрепи ${fmtKg(W)} кг во всех ${slot.sets} подходах — в прошлый раз было ${atTop.length}` };
      else if (Math.min(...reps) >= slot.hi) p = { ...base, weight: roundTo(W + inc, step), reps: slot.lo, note: `+${fmtKg(inc)} кг: прошлый раз все подходы на ${slot.hi}` };
      else if (Math.min(...reps) >= slot.lo) p = { ...base, weight: W, reps: Math.min(slot.hi, Math.min(...reps) + 1), note: `Тот же вес, добери до ${Math.min(slot.hi, Math.min(...reps) + 1)} повторов во всех подходах` };
      else if (prevBelow) p = { ...base, weight: roundTo(W * 0.9, step), reps: slot.lo, note: 'Два раза не дотянул до нижней границы — откат 10% и снова вверх' };
      else p = { ...base, weight: W, reps: slot.lo, note: `Тот же вес, цель — ${slot.lo} повторов во всех подходах` };
    }
  }
  if (deload) p = { ...p, sets: Math.max(1, Math.ceil(p.sets / 2)), weight: p.weight ? roundTo(p.weight * 0.9, step) : p.weight, reps: p.reps ? slot.lo : p.reps, rir: 3, note: 'Разгрузка: половина подходов, −10% веса, 3 повтора в запасе' };
  return p;
};

export const programWeek = (start?: string) => {
  if (!start) return 1;
  const weeks = Math.floor((startOfDay(new Date()).getTime() - startOfDay(new Date(start)).getTime()) / (7 * DAY));
  return (Math.max(0, weeks) % CYCLE_WEEKS) + 1;
};

/** Какой день программы следующий: после последнего выполненного дня этой программы */
export const nextProgramDay = (state: AppState, program: Program) => {
  const done = state.workouts.filter((w) => w.task?.programId === program.id && typeof w.task.day === 'number').sort((a, b) => b.date.localeCompare(a.date));
  return done.length ? (done[0].task!.day! + 1) % program.days.length : 0;
};

export const buildProgramDay = (state: AppState, ex: ExerciseMap, dayIdx?: number): DayTask | null => {
  const program = programById(state.program?.id);
  if (!program) return null;
  const idx = dayIdx ?? nextProgramDay(state, program);
  const day = program.days[idx];
  const week = programWeek(state.program?.start);
  const deload = week === CYCLE_WEEKS;
  const home = state.profile.goal?.place === 'home';
  const seen = new Set<string>();
  const exercises: PlanExercise[] = [];
  for (const slot of day.slots) {
    const id = home ? HOME_SWAP[slot.ex] ?? slot.ex : slot.ex;
    const def = ex.get(id);
    if (!def || seen.has(id)) continue;
    seen.add(id);
    exercises.push(prescribe(slot, id, def, state.workouts, deload));
  }
  const first = exercises[0]; const firstDef = first ? ex.get(first.id) : undefined;
  const W = first?.weight ?? 0;
  const warmup = W >= 40 && firstDef?.kind === 'weight'
    ? `5 мин лёгкого кардио, затем ${firstDef.name}: гриф ×10, ${fmtKg(roundTo(W * 0.5, 2.5))} ×5, ${fmtKg(roundTo(W * 0.7, 2.5))} ×3, ${fmtKg(roundTo(W * 0.85, 2.5))} ×1`
    : '5–7 мин лёгкого кардио, суставная разминка, 1–2 лёгких подхода в первом упражнении';
  const minutes = Math.round((exercises.reduce((a, e) => a + e.sets * (e.rest + 35), 0) / 60 + 8) / 5) * 5;
  const mainSlot = day.slots.find((s) => s.role === 'main');
  const progression = deload
    ? 'Неделя разгрузки. Со следующей недели — новый цикл с весов чуть выше прошлого старта.'
    : mainSlot && first?.weight
      ? `Сделаешь все подходы ${firstDef?.name.toLowerCase()} по ${mainSlot.hi} — в следующий раз +${LOWER_HEAVY.has(first.id) ? 5 : 2.5} кг.`
      : 'Записывай каждый подход — по ним игра рассчитает веса на следующий раз.';
  return {
    source: 'program', programId: program.id, day: idx, week, deload,
    title: day.title, subtitle: `${program.name} · неделя ${week}/${CYCLE_WEEKS}${deload ? ' · разгрузка' : ''}`,
    minutes, warmup, exercises, progression,
    tip: (first && CUES[first.id]) || 'Записывай подходы честно — по ним считается прогрессия.',
  };
};

/** Задание на сегодня: план тренера (если выдан) важнее программы */
export const todayTask = (state: AppState, ex: ExerciseMap): DayTask | null => {
  const cp = todayPlan(state);
  if (cp && !cp.workoutId) {
    const c = coachById(cp.coach);
    return { source: 'coach', coach: cp.coach, coachDate: cp.date, title: cp.title, subtitle: `Задание от ${c.name}`, minutes: cp.minutes, warmup: cp.warmup, exercises: cp.exercises.filter((e) => ex.has(e.id)), progression: cp.progression, tip: cp.tip, greeting: cp.greeting };
  }
  return buildProgramDay(state, ex);
};

export const trainedToday = (state: AppState) => state.workouts.some((w) => dayKey(w.date) === dayKey(new Date()));
export const trainedYesterday = (state: AppState) => state.workouts.some((w) => dayKey(w.date) === dayKey(new Date(Date.now() - DAY)));

/** Подсказка «сегодня лучше отдохнуть» для 3-дневных схем */
export const restSuggested = (state: AppState) => {
  const p = programById(state.program?.id);
  if (!p) return false;
  const perWeek = state.profile.goal?.days ?? (p.id === 'upperlower4' ? 4 : 3);
  return perWeek <= 3 && trainedYesterday(state);
};

export const describeSet = (e: PlanExercise, def?: Exercise) => {
  if (def?.kind === 'time' || (e.seconds && !e.reps)) return `${e.sets}×${e.seconds ?? 0} с`;
  const reps = e.reps ?? 'макс';
  return `${e.sets}×${reps}${e.weight ? ` · ${fmtKg(e.weight)} кг` : def?.kind === 'bodyweight' ? '' : ' · подбери'}`;
};

export { e1rm };
