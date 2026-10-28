/* Недельное расписание: какой день — тренировка, какой — отдых, и что именно по программе */
import type { AppState } from '../types';
import { programById, type ProgramId } from '../data/programs';
import { DAY, dayKey, startOfDay, startOfWeek } from './dates';

export type Style = 'fullbody' | 'split';
export const WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
export const WEEKDAY_NAMES = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];

/** Какая программа под стиль и число дней */
export const programFor = (style: Style, n: number): ProgramId => {
  if (style === 'fullbody') return 'fullbody3';
  if (n <= 2) return 'upperlower4';
  if (n === 3) return 'ppl';
  if (n === 4) return 'upperlower4';
  if (n === 5) return 'ulppl';
  return 'ppl';
};

/** Дни по умолчанию для числа тренировок */
export const DEFAULT_DAYS: Record<number, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };

export const explain = (style: Style, n: number) => {
  if (style === 'fullbody') {
    if (n <= 1) return 'Выбери хотя бы 2 дня.';
    if (n === 2) return 'Full Body 2 дня: дни A и B по очереди. Минимум для роста — каждая мышца дважды в неделю.';
    if (n === 3) return 'Full Body 3 дня: дни A → B → C. Классика для новичка и среднего уровня.';
    return `Full Body ${n} дня: дни A → B → C по кругу. Много частоты — держи запас повторов и спи 8 часов.`;
  }
  if (n <= 1) return 'Выбери хотя бы 2 дня.';
  if (n === 2) return 'Сплит на 2 дня — Верх и Низ по очереди. Для 2 дней лучше подойдёт Full Body: каждая мышца получит вдвое больше работы.';
  if (n === 3) return '3 дня сплит → Толкай / Тяни / Ноги: каждая группа раз в неделю, но с большим объёмом.';
  if (n === 4) return '4 дня сплит → Верх / Низ: каждая мышца 2 раза в неделю, силовой и объёмный день.';
  if (n === 5) return '5 дней → Верх/Низ (сила) + Толкай/Тяни/Ноги (объём): каждая мышца дважды в неделю.';
  return '6 дней → Толкай / Тяни / Ноги дважды в неделю. Максимум объёма — только при хорошем восстановлении.';
};

/** Предупреждения о восстановлении */
export const warnings = (style: Style, days: number[]) => {
  const w: string[] = [];
  const set = new Set(days);
  if (style === 'fullbody') {
    const pairs = days.filter((d) => set.has((d + 1) % 7));
    if (pairs.length) w.push(`Full Body ${pairs.map((d) => `${WEEKDAYS[d]}→${WEEKDAYS[(d + 1) % 7]}`).join(', ')} подряд: все мышцы без 48 часов отдыха. Лучше через день.`);
  }
  if (days.length === 7) w.push('Без единого дня отдыха прогресс встанет. Оставь хотя бы один выходной.');
  return w;
};

export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;
export const isTrainingDay = (state: AppState, d = new Date()) => !!state.schedule?.days.includes(weekdayIndex(d));

export type DayStatus = 'done' | 'missed' | 'today' | 'next' | 'rest' | 'rest-today' | 'extra';
export interface WeekRow { date: Date; idx: number; status: DayStatus; title: string; detail: string }

const REST_HINTS = ['лёгкое кардио 20–30 мин по желанию', 'прогулка, растяжка', 'восстановление, сон 8+ ч'];

/** Календарь текущей недели */
export const weekPlan = (state: AppState, exName: (id: string) => string | undefined): WeekRow[] => {
  const program = programById(state.program?.id);
  const sched = state.schedule;
  const monday = startOfWeek(new Date());
  const todayK = dayKey(new Date());
  const doneTitles = new Map<string, string>();
  for (const w of state.workouts) doneTitles.set(dayKey(w.date), w.task?.title ?? 'Свободная миссия');
  // следующий день программы
  let next = 0;
  if (program) {
    const done = state.workouts.filter((w) => w.task?.programId === program.id && typeof w.task.day === 'number').sort((a, b) => b.date.localeCompare(a.date));
    next = done.length ? (done[0].task!.day! + 1) % program.days.length : 0;
  }
  const rows: WeekRow[] = [];
  let restN = 0;
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday.getTime() + i * DAY);
    const k = dayKey(date);
    const planned = !!sched?.days.includes(i);
    const isToday = k === todayK;
    const isPast = k < todayK;
    const done = doneTitles.get(k);
    if (done && (isPast || isToday)) { rows.push({ date, idx: i, status: planned ? 'done' : 'extra', title: done, detail: planned ? 'выполнено' : 'вне расписания' }); continue; }
    if (!planned) { rows.push({ date, idx: i, status: isToday ? 'rest-today' : 'rest', title: 'Отдых', detail: REST_HINTS[restN++ % REST_HINTS.length] }); continue; }
    if (isPast) { rows.push({ date, idx: i, status: 'missed', title: 'Пропущено', detail: 'тренировка сдвинулась на следующий день' }); continue; }
    const day = program?.days[next % program.days.length];
    next++;
    rows.push({ date, idx: i, status: isToday ? 'today' : 'next', title: day?.title ?? 'Тренировка', detail: day ? day.slots.slice(0, 3).map((s) => exName(s.ex)?.toLowerCase()).filter(Boolean).join(', ') : '' });
  }
  return rows;
};

export const nextTrainingLabel = (rows: WeekRow[]) => {
  const n = rows.find((r) => r.status === 'next');
  if (!n) return 'на следующей неделе';
  const diff = Math.round((n.date.getTime() - startOfDay(new Date()).getTime()) / DAY);
  return `${diff === 1 ? 'завтра, ' : ''}${WEEKDAY_NAMES[n.idx]}`;
};
