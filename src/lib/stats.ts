import type { Exercise, MuscleId, SetEntry, Workout, BodyweightEntry } from '../types';
import { STRENGTH_MUSCLES } from '../data/muscles';
import { BIG_LIFTS } from '../data/exercises';
import { DAY, dayKey, daysAgo, isWithinDays, startOfWeek } from './dates';

/** Расчётный 1ПМ по формуле Эпли */
export const e1rm = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

export const setTonnage = (s: SetEntry, kind: Exercise['kind']) => {
  if (kind === 'weight' || kind === 'bodyweight') return (s.weight ?? 0) * (s.reps ?? 0);
  return 0;
};

export const isSetFilled = (s: SetEntry, kind: Exercise['kind']) => {
  if (kind === 'weight') return (s.weight ?? 0) > 0 && (s.reps ?? 0) > 0;
  if (kind === 'bodyweight') return (s.reps ?? 0) > 0;
  if (kind === 'time') return (s.seconds ?? 0) > 0;
  return (s.seconds ?? 0) > 0 || (s.km ?? 0) > 0;
};

export type ExerciseMap = Map<string, Exercise>;

export const workoutTonnage = (w: Workout, ex: ExerciseMap) =>
  w.entries.reduce((acc, e) => {
    const def = ex.get(e.exerciseId);
    if (!def) return acc;
    return acc + e.sets.reduce((a, s) => a + setTonnage(s, def.kind), 0);
  }, 0);

export const workoutSets = (w: Workout, ex: ExerciseMap) =>
  w.entries.reduce((acc, e) => {
    const def = ex.get(e.exerciseId);
    return acc + (def ? e.sets.filter((s) => isSetFilled(s, def.kind)).length : 0);
  }, 0);

export const workoutCardioSeconds = (w: Workout, ex: ExerciseMap) =>
  w.entries.reduce((acc, e) => {
    const def = ex.get(e.exerciseId);
    if (def?.kind !== 'cardio') return acc;
    return acc + e.sets.reduce((a, s) => a + (s.seconds ?? 0), 0);
  }, 0);

export const workoutDurationMin = (w: Workout) =>
  w.endedAt ? Math.max(1, Math.round((new Date(w.endedAt).getTime() - new Date(w.date).getTime()) / 60000)) : 0;

export const workoutMuscles = (w: Workout, ex: ExerciseMap): MuscleId[] => {
  const set = new Set<MuscleId>();
  for (const e of w.entries) {
    const def = ex.get(e.exerciseId);
    if (!def || !e.sets.some((s) => isSetFilled(s, def.kind))) continue;
    def.primary.forEach((m) => set.add(m));
    def.secondary.forEach((m) => set.add(m));
  }
  return [...set];
};

export interface MuscleLoad { sets: number; tonnage: number; lastDate?: string }

/** Нагрузка на мышцы за период: основные — 1 подход, вспомогательные — 0.5 */
export const muscleLoad = (workouts: Workout[], ex: ExerciseMap, days: number) => {
  const map = new Map<MuscleId, MuscleLoad>();
  for (const w of workouts) {
    if (!isWithinDays(w.date, days)) continue;
    for (const e of w.entries) {
      const def = ex.get(e.exerciseId);
      if (!def) continue;
      const filled = e.sets.filter((s) => isSetFilled(s, def.kind));
      if (!filled.length) continue;
      const ton = filled.reduce((a, s) => a + setTonnage(s, def.kind), 0);
      const add = (m: MuscleId, k: number) => {
        const cur = map.get(m) ?? { sets: 0, tonnage: 0 };
        cur.sets += filled.length * k;
        cur.tonnage += ton * k;
        if (!cur.lastDate || cur.lastDate < w.date) cur.lastDate = w.date;
        map.set(m, cur);
      };
      def.primary.forEach((m) => add(m, 1));
      def.secondary.forEach((m) => add(m, 0.5));
    }
  }
  return map;
};

export interface MuscleStatus { id: MuscleId; sets: number; ratio: number; lagging: boolean; lastDate?: string }

/** Отстающие мышцы за 30 дней: меньше половины среднего по телу или меньше 4 подходов.
 *  Считается только когда за период есть хотя бы 3 тренировки — иначе данных мало. */
export const muscleStatuses = (workouts: Workout[], ex: ExerciseMap, days = 30): MuscleStatus[] => {
  const load = muscleLoad(workouts, ex, days);
  const vals = STRENGTH_MUSCLES.map((m) => load.get(m)?.sets ?? 0);
  const max = Math.max(1, ...vals);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const anyTraining = workouts.filter((w) => isWithinDays(w.date, days)).length >= 3;
  return STRENGTH_MUSCLES.map((id) => {
    const sets = load.get(id)?.sets ?? 0;
    return {
      id, sets,
      ratio: sets / max,
      lagging: anyTraining && (sets < mean * 0.5 || sets < 4),
      lastDate: load.get(id)?.lastDate,
    };
  });
};

export interface SessionStat {
  date: string; workoutId: string;
  maxWeight: number; bestE1rm: number; maxReps: number; tonnage: number; sets: number;
  bestSeconds: number; km: number;
}

export const exerciseHistory = (workouts: Workout[], exerciseId: string, def: Exercise): SessionStat[] => {
  const out: SessionStat[] = [];
  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    const sets = w.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets).filter((s) => isSetFilled(s, def.kind));
    if (!sets.length) continue;
    out.push({
      date: w.date, workoutId: w.id,
      maxWeight: Math.max(0, ...sets.map((s) => s.weight ?? 0)),
      bestE1rm: Math.max(0, ...sets.map((s) => (s.weight && s.reps ? e1rm(s.weight, s.reps) : 0))),
      maxReps: Math.max(0, ...sets.map((s) => s.reps ?? 0)),
      tonnage: sets.reduce((a, s) => a + setTonnage(s, def.kind), 0),
      sets: sets.length,
      bestSeconds: Math.max(0, ...sets.map((s) => s.seconds ?? 0)),
      km: sets.reduce((a, s) => a + (s.km ?? 0), 0),
    });
  }
  return out;
};

export interface Bests { maxWeight: number; bestE1rm: number; maxReps: number; bestSeconds: number; maxKm: number; sessions: number }

export const exerciseBests = (hist: SessionStat[]): Bests => ({
  maxWeight: Math.max(0, ...hist.map((h) => h.maxWeight)),
  bestE1rm: Math.max(0, ...hist.map((h) => h.bestE1rm)),
  maxReps: Math.max(0, ...hist.map((h) => h.maxReps)),
  bestSeconds: Math.max(0, ...hist.map((h) => h.bestSeconds)),
  maxKm: Math.max(0, ...hist.map((h) => h.km)),
  sessions: hist.length,
});

export interface WeekStat { weekStart: string; label: string; tonnage: number; workouts: number; sets: number; cardioMin: number }

export const weeklySeries = (workouts: Workout[], ex: ExerciseMap, weeks: number): WeekStat[] => {
  const thisWeek = startOfWeek(new Date());
  const out: WeekStat[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(thisWeek.getTime() - i * 7 * DAY);
    out.push({
      weekStart: ws.toISOString(),
      label: ws.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      tonnage: 0, workouts: 0, sets: 0, cardioMin: 0,
    });
  }
  for (const w of workouts) {
    const ws = startOfWeek(new Date(w.date)).getTime();
    const idx = Math.round((ws - (thisWeek.getTime() - (weeks - 1) * 7 * DAY)) / (7 * DAY));
    if (idx < 0 || idx >= weeks) continue;
    out[idx].tonnage += workoutTonnage(w, ex);
    out[idx].workouts += 1;
    out[idx].sets += workoutSets(w, ex);
    out[idx].cardioMin += workoutCardioSeconds(w, ex) / 60;
  }
  return out;
};

/** Серия: подряд идущие недели с хотя бы одной тренировкой (текущая неделя может быть ещё пустой) */
export const weekStreak = (workouts: Workout[]) => {
  const weeks = new Set(workouts.map((w) => startOfWeek(new Date(w.date)).getTime()));
  let cur = startOfWeek(new Date()).getTime();
  let streak = 0;
  if (!weeks.has(cur)) cur -= 7 * DAY;
  while (weeks.has(cur)) { streak++; cur -= 7 * DAY; }
  return streak;
};

/** Серия дней подряд с тренировками (заканчивающаяся сегодня или вчера) */
export const dayStreak = (workouts: Workout[]) => {
  const days = new Set(workouts.map((w) => dayKey(w.date)));
  let cur = new Date();
  let streak = 0;
  if (!days.has(dayKey(cur))) cur = new Date(cur.getTime() - DAY);
  while (days.has(dayKey(cur))) { streak++; cur = new Date(cur.getTime() - DAY); }
  return streak;
};

export const daysSinceLast = (workouts: Workout[]) => {
  if (!workouts.length) return null;
  const last = Math.max(...workouts.map((w) => new Date(w.date).getTime()));
  return Math.floor((Date.now() - last) / DAY);
};

export interface Trend { metric: string; now: number; before: number; delta: number; unit: string }

/** Последние 28 дней против предыдущих 28 */
export const trends = (workouts: Workout[], ex: ExerciseMap, bodyweight: BodyweightEntry[]): Trend[] => {
  const a = workouts.filter((w) => isWithinDays(w.date, 28));
  const bCut = daysAgo(56).getTime();
  const aCut = daysAgo(28).getTime();
  const b = workouts.filter((w) => { const t = new Date(w.date).getTime(); return t >= bCut && t < aCut; });
  const sum = (ws: Workout[], f: (w: Workout) => number) => ws.reduce((acc, w) => acc + f(w), 0);
  const pct = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : now > 0 ? 100 : 0);

  const out: Trend[] = [
    { metric: 'Тренировок', now: a.length, before: b.length, delta: pct(a.length, b.length), unit: '' },
    { metric: 'Тоннаж', now: sum(a, (w) => workoutTonnage(w, ex)), before: sum(b, (w) => workoutTonnage(w, ex)), delta: 0, unit: 'кг' },
    { metric: 'Подходов', now: sum(a, (w) => workoutSets(w, ex)), before: sum(b, (w) => workoutSets(w, ex)), delta: 0, unit: '' },
  ];
  out[1].delta = pct(out[1].now, out[1].before);
  out[2].delta = pct(out[2].now, out[2].before);

  // сила: средний лучший 1ПМ по базовым за период
  const strength = (ws: Workout[]) => {
    const vals: number[] = [];
    for (const id of Object.keys(BIG_LIFTS)) {
      const def = ex.get(id);
      if (!def) continue;
      const h = exerciseHistory(ws, id, def);
      if (h.length) vals.push(Math.max(...h.map((x) => x.bestE1rm)));
    }
    return vals.length ? vals.reduce((x, y) => x + y, 0) : 0;
  };
  const sNow = strength(a), sBefore = strength(b);
  if (sNow || sBefore) out.push({ metric: 'Сила (сумма 1ПМ базы)', now: sNow, before: sBefore, delta: pct(sNow, sBefore), unit: 'кг' });

  const bw = [...bodyweight].sort((x, y) => x.date.localeCompare(y.date));
  if (bw.length >= 2) {
    const last = bw[bw.length - 1];
    const prev = [...bw].reverse().find((x) => new Date(x.date).getTime() <= aCut) ?? bw[0];
    out.push({ metric: 'Вес тела', now: last.kg, before: prev.kg, delta: pct(last.kg, prev.kg), unit: 'кг' });
  }
  return out;
};

export const latestBodyweight = (bw: BodyweightEntry[]) =>
  bw.length ? [...bw].sort((a, b) => a.date.localeCompare(b.date))[bw.length - 1].kg : undefined;

export interface HeroStats { strength: number; endurance: number; discipline: number; balance: number; volume: number }

/** Характеристики героя 0..100 */
export const heroStats = (workouts: Workout[], ex: ExerciseMap, bodyweight: BodyweightEntry[]): HeroStats => {
  const bw = latestBodyweight(bodyweight) ?? 75;
  // Сила: относительные 1ПМ базы (присед 2×, жим 1.5×, тяга 2.5× = 100)
  const targets: Record<string, number> = { squat: 2, bench: 1.5, deadlift: 2.5 };
  let sScore = 0, sCount = 0;
  for (const id of Object.keys(targets)) {
    const def = ex.get(id); if (!def) continue;
    const h = exerciseHistory(workouts, id, def);
    if (!h.length) continue;
    const best = Math.max(...h.map((x) => x.bestE1rm));
    sScore += Math.min(1, best / (bw * targets[id])); sCount++;
  }
  const strength = sCount ? (sScore / sCount) * 100 : 0;

  const w8 = weeklySeries(workouts, ex, 8);
  const cardioMin = w8.reduce((a, x) => a + x.cardioMin, 0);
  const sets = w8.reduce((a, x) => a + x.sets, 0);
  const endurance = Math.min(100, (cardioMin / 480) * 60 + (sets / 320) * 40);

  const activeWeeks = w8.filter((x) => x.workouts > 0).length;
  const avgPerWeek = w8.reduce((a, x) => a + x.workouts, 0) / 8;
  const discipline = Math.min(100, (activeWeeks / 8) * 50 + Math.min(1, avgPerWeek / 3) * 50);

  const st = muscleStatuses(workouts, ex, 30);
  const trained = st.filter((m) => m.sets > 0).length;
  const notLagging = st.filter((m) => !m.lagging).length;
  const balance = trained ? (notLagging / st.length) * 100 : 0;

  const weekTon = w8.slice(-4).reduce((a, x) => a + x.tonnage, 0) / 4;
  const volume = Math.min(100, (weekTon / 20000) * 100);

  return {
    strength: Math.round(strength), endurance: Math.round(endurance),
    discipline: Math.round(discipline), balance: Math.round(balance), volume: Math.round(volume),
  };
};

export const totals = (workouts: Workout[], ex: ExerciseMap) => ({
  workouts: workouts.length,
  tonnage: workouts.reduce((a, w) => a + workoutTonnage(w, ex), 0),
  sets: workouts.reduce((a, w) => a + workoutSets(w, ex), 0),
  cardioMin: workouts.reduce((a, w) => a + workoutCardioSeconds(w, ex), 0) / 60,
  prs: workouts.reduce((a, w) => a + w.prs.length, 0),
});
