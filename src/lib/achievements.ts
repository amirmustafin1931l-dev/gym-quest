import type { AppState, Workout } from '../types';
import { STRENGTH_MUSCLES } from '../data/muscles';
import {
  type ExerciseMap, dayStreak, exerciseBests, exerciseHistory, latestBodyweight, muscleLoad, totals,
  weekStreak, weeklySeries, workoutCardioSeconds, workoutSets, workoutTonnage,
} from './stats';
import { levelFromXp } from './xp';

export interface AchievementCtx {
  state: AppState;
  workouts: Workout[]; // завершённые, включая только что добавленную
  ex: ExerciseMap;
  last?: Workout;
}

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
  xp: number;
  group: 'Путь' | 'Сила' | 'Дисциплина' | 'Объём' | 'Особые';
  check: (c: AchievementCtx) => boolean;
  /** Прогресс 0..1 для незакрытых достижений (необязательно) */
  progress?: (c: AchievementCtx) => number;
}

const bestE = (c: AchievementCtx, id: string) => {
  const def = c.ex.get(id); if (!def) return 0;
  return exerciseBests(exerciseHistory(c.workouts, id, def)).bestE1rm;
};
const bestW = (c: AchievementCtx, id: string) => {
  const def = c.ex.get(id); if (!def) return 0;
  return exerciseBests(exerciseHistory(c.workouts, id, def)).maxWeight;
};
const bestReps = (c: AchievementCtx, id: string) => {
  const def = c.ex.get(id); if (!def) return 0;
  return exerciseBests(exerciseHistory(c.workouts, id, def)).maxReps;
};
const bw = (c: AchievementCtx) => latestBodyweight(c.state.bodyweight);

const countAch = (n: number, id: string, title: string, icon: string, xp: number): AchievementDef => ({
  id, title, icon, xp, group: 'Путь',
  desc: `Заверши ${n} тренировок`,
  check: (c) => c.workouts.length >= n,
  progress: (c) => Math.min(1, c.workouts.length / n),
});

const liftAch = (exId: string, name: string, kg: number, icon: string, xp: number): AchievementDef => ({
  id: `${exId}_${kg}`, title: `${name} ${kg}`, icon, xp, group: 'Сила',
  desc: `Подними ${kg} кг в упражнении «${name}»`,
  check: (c) => bestW(c, exId) >= kg,
  progress: (c) => Math.min(1, bestW(c, exId) / kg),
});

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first', title: 'Первый шаг', desc: 'Заверши первую тренировку', icon: '🥾', xp: 50, group: 'Путь', check: (c) => c.workouts.length >= 1 },
  countAch(10, 'w10', 'Десятка', '🔟', 100),
  countAch(25, 'w25', 'Четверть сотни', '🎯', 150),
  countAch(50, 'w50', 'Полсотни', '⚔️', 250),
  countAch(100, 'w100', 'Сотня', '🏆', 500),
  countAch(250, 'w250', 'Неудержимый', '👑', 1000),

  liftAch('bench', 'Жим лёжа', 60, '🛡️', 100),
  liftAch('bench', 'Жим лёжа', 80, '🛡️', 150),
  liftAch('bench', 'Жим лёжа', 100, '🛡️', 300),
  liftAch('bench', 'Жим лёжа', 120, '🛡️', 500),
  liftAch('squat', 'Присед', 80, '🦵', 100),
  liftAch('squat', 'Присед', 100, '🦵', 150),
  liftAch('squat', 'Присед', 140, '🦵', 300),
  liftAch('squat', 'Присед', 180, '🦵', 500),
  liftAch('deadlift', 'Становая', 100, '⚓', 100),
  liftAch('deadlift', 'Становая', 140, '⚓', 150),
  liftAch('deadlift', 'Становая', 180, '⚓', 300),
  liftAch('deadlift', 'Становая', 220, '⚓', 500),
  liftAch('ohp', 'Жим стоя', 50, '⛰️', 150),
  liftAch('ohp', 'Жим стоя', 70, '⛰️', 300),
  { id: 'pullups_10', title: 'Десять в висе', desc: '10 подтягиваний в одном подходе', icon: '🦅', xp: 100, group: 'Сила', check: (c) => bestReps(c, 'pullups') >= 10, progress: (c) => Math.min(1, bestReps(c, 'pullups') / 10) },
  { id: 'pullups_20', title: 'Хозяин турника', desc: '20 подтягиваний в одном подходе', icon: '🦅', xp: 300, group: 'Сила', check: (c) => bestReps(c, 'pullups') >= 20, progress: (c) => Math.min(1, bestReps(c, 'pullups') / 20) },
  { id: 'pushups_50', title: 'Полсотни отжиманий', desc: '50 отжиманий в одном подходе', icon: '🔥', xp: 100, group: 'Сила', check: (c) => bestReps(c, 'pushups') >= 50, progress: (c) => Math.min(1, bestReps(c, 'pushups') / 50) },
  { id: 'bench_bw', title: 'Свой вес в жиме', desc: 'Расчётный 1ПМ в жиме ≥ веса тела (нужен вес тела)', icon: '⚖️', xp: 300, group: 'Сила', check: (c) => !!bw(c) && bestE(c, 'bench') >= bw(c)! },
  { id: 'squat_15bw', title: 'Полтора веса в приседе', desc: '1ПМ в приседе ≥ 1.5 × вес тела', icon: '⚖️', xp: 400, group: 'Сила', check: (c) => !!bw(c) && bestE(c, 'squat') >= bw(c)! * 1.5 },
  { id: 'dead_2bw', title: 'Двойной вес в тяге', desc: '1ПМ в становой ≥ 2 × вес тела', icon: '⚖️', xp: 500, group: 'Сила', check: (c) => !!bw(c) && bestE(c, 'deadlift') >= bw(c)! * 2 },
  { id: 'club_300', title: 'Клуб 300', desc: 'Сумма 1ПМ (жим + присед + тяга) ≥ 300 кг', icon: '🏛️', xp: 400, group: 'Сила', check: (c) => bestE(c, 'bench') + bestE(c, 'squat') + bestE(c, 'deadlift') >= 300, progress: (c) => Math.min(1, (bestE(c, 'bench') + bestE(c, 'squat') + bestE(c, 'deadlift')) / 300) },
  { id: 'club_500', title: 'Клуб 500', desc: 'Сумма 1ПМ базы ≥ 500 кг', icon: '🏛️', xp: 1000, group: 'Сила', check: (c) => bestE(c, 'bench') + bestE(c, 'squat') + bestE(c, 'deadlift') >= 500, progress: (c) => Math.min(1, (bestE(c, 'bench') + bestE(c, 'squat') + bestE(c, 'deadlift')) / 500) },
  { id: 'pr_10', title: 'Охотник за рекордами', desc: '10 личных рекордов', icon: '📈', xp: 150, group: 'Сила', check: (c) => totals(c.workouts, c.ex).prs >= 10, progress: (c) => Math.min(1, totals(c.workouts, c.ex).prs / 10) },
  { id: 'pr_50', title: 'Машина прогресса', desc: '50 личных рекордов', icon: '📈', xp: 500, group: 'Сила', check: (c) => totals(c.workouts, c.ex).prs >= 50, progress: (c) => Math.min(1, totals(c.workouts, c.ex).prs / 50) },

  { id: 'streak_w4', title: 'Месяц без пропусков', desc: '4 недели подряд с тренировками', icon: '📅', xp: 150, group: 'Дисциплина', check: (c) => weekStreak(c.workouts) >= 4, progress: (c) => Math.min(1, weekStreak(c.workouts) / 4) },
  { id: 'streak_w12', title: 'Квартал силы', desc: '12 недель подряд с тренировками', icon: '📅', xp: 500, group: 'Дисциплина', check: (c) => weekStreak(c.workouts) >= 12, progress: (c) => Math.min(1, weekStreak(c.workouts) / 12) },
  { id: 'streak_d3', title: 'Три дня подряд', desc: 'Тренировки 3 дня подряд', icon: '⚡', xp: 60, group: 'Дисциплина', check: (c) => dayStreak(c.workouts) >= 3 },
  { id: 'week_4', title: 'Ударная неделя', desc: '4 тренировки за одну неделю', icon: '💥', xp: 100, group: 'Дисциплина', check: (c) => weeklySeries(c.workouts, c.ex, 1)[0].workouts >= 4 },
  { id: 'early', title: 'Ранняя пташка', desc: 'Начни тренировку до 7 утра', icon: '🌅', xp: 50, group: 'Дисциплина', check: (c) => c.workouts.some((w) => new Date(w.date).getHours() < 7) },
  { id: 'night', title: 'Ночной страж', desc: 'Начни тренировку после 22:00', icon: '🌙', xp: 50, group: 'Дисциплина', check: (c) => c.workouts.some((w) => new Date(w.date).getHours() >= 22) },
  { id: 'bw_10', title: 'Контроль веса', desc: 'Запиши вес тела 10 раз', icon: '⚖️', xp: 80, group: 'Дисциплина', check: (c) => c.state.bodyweight.length >= 10, progress: (c) => Math.min(1, c.state.bodyweight.length / 10) },

  { id: 'ton_10k', title: '10 тонн', desc: 'Суммарный тоннаж 10 000 кг', icon: '🏋️', xp: 100, group: 'Объём', check: (c) => totals(c.workouts, c.ex).tonnage >= 10_000, progress: (c) => Math.min(1, totals(c.workouts, c.ex).tonnage / 10_000) },
  { id: 'ton_100k', title: '100 тонн', desc: 'Суммарный тоннаж 100 000 кг', icon: '🏋️', xp: 300, group: 'Объём', check: (c) => totals(c.workouts, c.ex).tonnage >= 100_000, progress: (c) => Math.min(1, totals(c.workouts, c.ex).tonnage / 100_000) },
  { id: 'ton_1m', title: 'Тысяча тонн', desc: 'Суммарный тоннаж 1 000 000 кг', icon: '🏋️', xp: 1500, group: 'Объём', check: (c) => totals(c.workouts, c.ex).tonnage >= 1_000_000, progress: (c) => Math.min(1, totals(c.workouts, c.ex).tonnage / 1_000_000) },
  { id: 'sets_1000', title: 'Тысяча подходов', desc: '1000 рабочих подходов', icon: '🧱', xp: 300, group: 'Объём', check: (c) => totals(c.workouts, c.ex).sets >= 1000, progress: (c) => Math.min(1, totals(c.workouts, c.ex).sets / 1000) },
  { id: 'session_10t', title: 'Тяжёлый день', desc: '10 000 кг тоннажа за одну тренировку', icon: '🪨', xp: 150, group: 'Объём', check: (c) => c.workouts.some((w) => workoutTonnage(w, c.ex) >= 10_000) },
  { id: 'session_30sets', title: 'Марафон подходов', desc: '30 подходов за одну тренировку', icon: '🔁', xp: 100, group: 'Объём', check: (c) => c.workouts.some((w) => workoutSets(w, c.ex) >= 30) },
  { id: 'cardio_100', title: 'Сердце бойца', desc: '100 минут кардио за неделю', icon: '❤️', xp: 120, group: 'Объём', check: (c) => weeklySeries(c.workouts, c.ex, 1)[0].cardioMin >= 100 },
  { id: 'cardio_60', title: 'Час в движении', desc: '60 минут кардио за одну тренировку', icon: '🏃', xp: 100, group: 'Объём', check: (c) => c.workouts.some((w) => workoutCardioSeconds(w, c.ex) >= 3600) },

  { id: 'full_body_week', title: 'Полный круг', desc: 'Все группы мышц за одну неделю', icon: '🌀', xp: 200, group: 'Особые', check: (c) => { const l = muscleLoad(c.workouts, c.ex, 7); return STRENGTH_MUSCLES.every((m) => (l.get(m)?.sets ?? 0) > 0); }, progress: (c) => { const l = muscleLoad(c.workouts, c.ex, 7); return STRENGTH_MUSCLES.filter((m) => (l.get(m)?.sets ?? 0) > 0).length / STRENGTH_MUSCLES.length; } },
  { id: 'balanced', title: 'Гармония', desc: 'Ни одной отстающей мышцы за 30 дней (минимум 8 тренировок)', icon: '☯️', xp: 250, group: 'Особые', check: (c) => { const l = muscleLoad(c.workouts, c.ex, 30); const vals = STRENGTH_MUSCLES.map((m) => l.get(m)?.sets ?? 0); const mean = vals.reduce((a, b) => a + b, 0) / vals.length; return c.workouts.filter((w) => new Date(w.date).getTime() > Date.now() - 30 * 86400000).length >= 8 && vals.every((v) => v >= 4 && v >= mean * 0.5); } },
  { id: 'inventor', title: 'Изобретатель', desc: 'Создай своё упражнение', icon: '🧪', xp: 40, group: 'Особые', check: (c) => c.state.customExercises.length > 0 },
  { id: 'explorer', title: 'Исследователь', desc: 'Попробуй 20 разных упражнений', icon: '🧭', xp: 120, group: 'Особые', check: (c) => new Set(c.workouts.flatMap((w) => w.entries.map((e) => e.exerciseId))).size >= 20, progress: (c) => Math.min(1, new Set(c.workouts.flatMap((w) => w.entries.map((e) => e.exerciseId))).size / 20) },
  { id: 'lvl_10', title: 'Десятый уровень', desc: 'Достигни 10 уровня', icon: '🔟', xp: 200, group: 'Особые', check: (c) => levelFromXp(c.state.profile.xp).level >= 10 },
  { id: 'lvl_25', title: 'Герой гильдии', desc: 'Достигни 25 уровня', icon: '🛡️', xp: 500, group: 'Особые', check: (c) => levelFromXp(c.state.profile.xp).level >= 25 },
  { id: 'ai_coach', title: 'Совет мудреца', desc: 'Получи анализ от ИИ-тренера', icon: '🧙', xp: 30, group: 'Особые', check: (c) => c.state.aiNotes.length > 0 },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Возвращает ещё не открытые достижения, условия которых выполнены */
export const evaluateAchievements = (ctx: AchievementCtx) => {
  const have = new Set(ctx.state.achievements.map((a) => a.id));
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && safeCheck(a, ctx));
};

const safeCheck = (a: AchievementDef, ctx: AchievementCtx) => {
  try { return a.check(ctx); } catch { return false; }
};
