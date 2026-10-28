import type { Exercise, MuscleId, PRRecord, Workout, XPLine } from '../types';
import { MUSCLES } from '../data/muscles';
import {
  type ExerciseMap, e1rm, exerciseBests, exerciseHistory, isSetFilled, workoutCardioSeconds,
  workoutMuscles, workoutSets, workoutTonnage, weekStreak,
} from './stats';

export const LEVEL_TITLES: [number, string][] = [
  [1, 'Новичок'], [3, 'Ученик'], [5, 'Атлет'], [8, 'Боец'], [12, 'Ветеран'],
  [16, 'Гладиатор'], [20, 'Чемпион'], [25, 'Герой'], [30, 'Легенда'], [40, 'Титан'], [50, 'Полубог'],
];

/** XP, нужный чтобы перейти с уровня L на L+1 */
export const xpForLevel = (level: number) => Math.round(100 * Math.pow(level, 1.35));

export interface LevelInfo { level: number; title: string; into: number; need: number; totalForNext: number }

export const levelFromXp = (xp: number): LevelInfo => {
  let level = 1, rest = xp;
  while (rest >= xpForLevel(level)) { rest -= xpForLevel(level); level++; }
  const title = [...LEVEL_TITLES].reverse().find(([l]) => level >= l)?.[1] ?? 'Новичок';
  return { level, title, into: rest, need: xpForLevel(level), totalForNext: xpForLevel(level) };
};

export interface XPResult { xp: number; breakdown: XPLine[]; prs: PRRecord[]; musclesWorked: MuscleId[] }

/**
 * Начисление XP за тренировку.
 * prior — завершённые тренировки до этой; lagging — отстающие мышцы на момент начала.
 */
export const computeWorkoutXp = (
  w: Workout, prior: Workout[], ex: ExerciseMap, lagging: MuscleId[], exDefs: Map<string, Exercise>,
): XPResult => {
  const lines: XPLine[] = [];
  const prs: PRRecord[] = [];
  const sets = workoutSets(w, ex);
  if (sets === 0) return { xp: 0, breakdown: [], prs: [], musclesWorked: [] };

  lines.push({ label: 'Тренировка завершена', xp: 50 });
  lines.push({ label: `Подходы ×${sets}`, xp: Math.min(100, sets * 2) });

  const ton = workoutTonnage(w, ex);
  if (ton > 0) lines.push({ label: `Тоннаж ${Math.round(ton).toLocaleString('ru-RU')} кг`, xp: Math.min(300, Math.round(ton / 100)) });

  const cardioMin = workoutCardioSeconds(w, ex) / 60;
  if (cardioMin > 0) lines.push({ label: `Кардио ${Math.round(cardioMin)} мин`, xp: Math.min(60, Math.round(cardioMin)) });

  // Рекорды и новые упражнения
  const seen = new Set<string>();
  for (const entry of w.entries) {
    if (seen.has(entry.exerciseId)) continue;
    seen.add(entry.exerciseId);
    const def = exDefs.get(entry.exerciseId);
    if (!def) continue;
    const filled = w.entries.filter((e) => e.exerciseId === entry.exerciseId).flatMap((e) => e.sets).filter((s) => isSetFilled(s, def.kind));
    if (!filled.length) continue;
    const hist = exerciseHistory(prior, entry.exerciseId, def);
    const best = exerciseBests(hist);
    if (!hist.length) { lines.push({ label: `Новое упражнение: ${def.name}`, xp: 15 }); continue; }

    if (def.kind === 'weight' || def.kind === 'bodyweight') {
      const maxW = Math.max(0, ...filled.map((s) => s.weight ?? 0));
      const bestE = Math.max(0, ...filled.map((s) => (s.weight && s.reps ? e1rm(s.weight, s.reps) : 0)));
      const maxR = Math.max(0, ...filled.map((s) => s.reps ?? 0));
      if (maxW > best.maxWeight && best.maxWeight > 0) {
        prs.push({ exerciseId: def.id, kind: 'weight', value: maxW, prev: best.maxWeight });
        lines.push({ label: `Рекорд веса: ${def.name} ${maxW} кг`, xp: 40 });
      }
      if (bestE > best.bestE1rm * 1.005 && best.bestE1rm > 0) {
        prs.push({ exerciseId: def.id, kind: 'e1rm', value: bestE, prev: best.bestE1rm });
        lines.push({ label: `Рекорд 1ПМ: ${def.name} ${Math.round(bestE)} кг`, xp: 60 });
      }
      if (def.kind === 'bodyweight' && maxR > best.maxReps) {
        prs.push({ exerciseId: def.id, kind: 'reps', value: maxR, prev: best.maxReps });
        lines.push({ label: `Рекорд повторений: ${def.name} ×${maxR}`, xp: 30 });
      }
    } else if (def.kind === 'time') {
      const sec = Math.max(0, ...filled.map((s) => s.seconds ?? 0));
      if (sec > best.bestSeconds) { prs.push({ exerciseId: def.id, kind: 'time', value: sec, prev: best.bestSeconds }); lines.push({ label: `Рекорд времени: ${def.name}`, xp: 30 }); }
    } else {
      const km = filled.reduce((a, s) => a + (s.km ?? 0), 0);
      if (km > best.maxKm && best.maxKm > 0) { prs.push({ exerciseId: def.id, kind: 'distance', value: km, prev: best.maxKm }); lines.push({ label: `Рекорд дистанции: ${def.name} ${km} км`, xp: 30 }); }
    }
  }

  const muscles = workoutMuscles(w, ex);
  const fixed = muscles.filter((m) => lagging.includes(m));
  if (fixed.length) lines.push({ label: `Отстающие мышцы: ${fixed.slice(0, 3).map((m) => MUSCLES[m].short).join(', ')}`, xp: Math.min(75, fixed.length * 25) });

  const streak = weekStreak([...prior, w]);
  if (streak >= 2) lines.push({ label: `Серия ${streak} нед. подряд`, xp: Math.min(50, streak * 10) });

  const xp = lines.reduce((a, l) => a + l.xp, 0);
  return { xp, breakdown: lines, prs, musclesWorked: muscles };
};
