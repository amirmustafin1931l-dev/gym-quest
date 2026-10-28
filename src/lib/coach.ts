/* Тренеры: персонажи, сводка для модели, каталог упражнений */
import type { AppState, CoachGoal, CoachId, CoachPlan, Exercise } from '../types';
import { buildSummary } from './advice';
import { dayKey } from './dates';
import { type ExerciseMap, exerciseBests, exerciseHistory, isSetFilled } from './stats';
import type { Look, GearId } from './figure';
import { programById } from '../data/programs';
import { buildProgramDay, describeSet, programWeek } from './programs';
import { WEEKDAY_NAMES, isTrainingDay } from './schedule';

export interface Coach { id: CoachId; name: string; tagline: string; online: string; hello: string; placeholder: string; look: Look; gear: GearId; stage: number }
export const COACHES: Coach[] = [
  { id: 'bigt', name: 'Биг Ти', tagline: 'старший с Грув-стрит', online: 'в сети · Грув-стрит', hello: 'Йо, малой! Это Биг Ти. Расскажи о себе, и я соберу тебе программу, чтобы на районе уважали.', placeholder: 'Напиши Биг Ти…',
    look: { skin: 'brown', hair: 'bald', beard: 'full', hairColor: '#1a120c' }, gear: 'gang', stage: 2 },
  { id: 'sarge', name: 'Сержант Хард', tagline: 'как спецоперация', online: 'на связи · база', hello: 'Боец, Сержант Хард на связи. Доложи цель и график — получишь задачу на каждый день.', placeholder: 'Доложи Сержанту…',
    look: { skin: 'light', hair: 'short', beard: 'stubble', hairColor: '#3a2a1a' }, gear: 'pro', stage: 4 },
  { id: 'ricky', name: 'Рикки из Вайса', tagline: 'неон и пляж 80-х', online: 'в сети · Оушен-Бич', hello: 'Детка, это Рикки! Скажи, к чему идём, и я сделаю из тебя звезду пляжа.', placeholder: 'Напиши Рикки…',
    look: { skin: 'tan', hair: 'long', beard: 'none', hairColor: '#c48a2a' }, gear: 'street', stage: 4 },
];
export const coachById = (id?: CoachId) => COACHES.find((c) => c.id === id) ?? COACHES[0];

export const GOAL_NAMES: Record<CoachGoal['goal'], string> = { strength: 'Сила', mass: 'Масса', cut: 'Рельеф / похудение', general: 'Форма и здоровье' };
export const todayKey = () => dayKey(new Date());
export const todayPlan = (state: AppState) => state.coachPlans.find((p) => p.date === todayKey());

/** Как игрок выполнил задание: по каждому упражнению план vs факт */
export const planAdherence = (plan: CoachPlan, state: AppState, ex: ExerciseMap) => {
  const w = plan.workoutId ? state.workouts.find((x) => x.id === plan.workoutId) : state.workouts.find((x) => dayKey(x.date) === plan.date);
  if (!w) return `${plan.date} «${plan.title}» (${coachById(plan.coach).name}): НЕ выполнено`;
  const parts = plan.exercises.map((p) => {
    const d = ex.get(p.id); if (!d) return '';
    const sets = w.entries.filter((e) => e.exerciseId === p.id).flatMap((e) => e.sets).filter((s) => isSetFilled(s, d.kind));
    const want = `${p.sets}×${p.reps ?? (p.seconds ? `${p.seconds}с` : '?')}${p.weight ? ` ${p.weight}кг` : ''}`;
    const got = sets.length ? sets.map((s) => (d.kind === 'time' ? `${s.seconds}с` : d.kind === 'cardio' ? `${Math.round((s.seconds ?? 0) / 60)}мин` : `${s.weight ?? 0}×${s.reps ?? 0}`)).join(', ') : 'пропущено';
    return `${d.name}: план ${want} → факт ${got}`;
  }).filter(Boolean);
  return `${plan.date} «${plan.title}» (${coachById(plan.coach).name}): выполнено. ${parts.join('; ')}`;
};

export const buildCoachSummary = (state: AppState, ex: ExerciseMap) => {
  const g = state.profile.goal;
  const lines: string[] = [];
  lines.push(`Сегодня: ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}.`);
  lines.push(g
    ? `Анкета: цель — ${GOAL_NAMES[g.goal]}; тренировок в неделю — ${g.days}; где — ${g.place === 'gym' ? 'зал' : 'дома (гантели, турник, свой вес)'}; пол — ${g.sex === 'm' ? 'мужской' : 'женский'}${g.limits ? `; ограничения — ${g.limits}` : ''}.`
    : 'Анкета не заполнена: цель неизвестна, исходи из общей формы и 3 тренировок в неделю.');
  lines.push(buildSummary(state, ex));
  // расчётные 1ПМ по всем силовым упражнениям, где есть данные
  const used = [...new Set(state.workouts.flatMap((w) => w.entries.map((e) => e.exerciseId)))];
  const e1 = used.map((id) => { const d = ex.get(id); if (!d || d.kind !== 'weight') return ''; const b = exerciseBests(exerciseHistory(state.workouts, id, d)); return b.bestE1rm ? `${d.name} ${Math.round(b.bestE1rm)}` : ''; }).filter(Boolean);
  if (e1.length) lines.push(`Лучшие расчётные 1ПМ, кг: ${e1.join('; ')}.`);
  if (state.schedule) lines.push(`Расписание игрока: ${state.schedule.style === 'fullbody' ? 'Full Body' : 'сплит'}, дни — ${state.schedule.days.map((d) => WEEKDAY_NAMES[d]).join(', ')}. Сегодня по расписанию ${isTrainingDay(state) ? 'ДЕНЬ ТРЕНИРОВКИ' : 'ДЕНЬ ОТДЫХА — если игрок просит задание, предложи восстановление или лёгкую активность, тяжёлую тренировку — только если он настаивает'}.`);
  const prog = programById(state.program?.id);
  if (prog) {
    const d = buildProgramDay(state, ex);
    lines.push(`Игрок идёт по программе «${prog.name}» (${prog.daysPerWeek}, цикл 6 недель, сейчас неделя ${programWeek(state.program?.start)}/6${programWeek(state.program?.start) === 6 ? ' — разгрузка' : ''}). По программе сегодня «${d?.title}»: ${d?.exercises.map((e) => `${ex.get(e.id)?.name} ${describeSet(e, ex.get(e.id))}`).join(', ')}.`);
  } else lines.push('Программа в игре не выбрана — ты сам ведёшь игрока.');
  const plans = state.coachPlans.filter((p) => p.date !== todayKey()).slice(-8);
  lines.push(plans.length ? `Прошлые задания тренера и выполнение:\n${plans.map((p) => '- ' + planAdherence(p, state, ex)).join('\n')}` : 'Прошлых заданий тренера ещё не было — это начало программы.');
  const tp = todayPlan(state);
  if (tp) lines.push(`Задание на сегодня уже выдано: «${tp.title}» — ${tp.exercises.map((e) => `${ex.get(e.id)?.name ?? e.id} ${e.sets}×${e.reps ?? (e.seconds ? `${e.seconds}с` : 'макс')}${e.weight ? ` ${e.weight}кг` : ''}`).join(', ')}.`);
  return lines.join('\n');
};

export const buildCatalog = (exercises: Exercise[], place?: 'gym' | 'home') => {
  const homeOk = (e: Exercise) => e.kind !== 'weight' || /гантел|молотк|носки|выпад|болгар|ягодичн|махи|разводк/i.test(e.name);
  return exercises.filter((e) => place !== 'home' || homeOk(e)).map((e) => ({ id: e.id, name: e.name, kind: e.kind }));
};
