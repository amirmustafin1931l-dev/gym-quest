import type { AppState, Exercise } from '../types';
import { MUSCLES } from '../data/muscles';
import { BIG_LIFTS } from '../data/exercises';
import { fmtNum, plural } from './dates';
import {
  type ExerciseMap, daysSinceLast, exerciseHistory, latestBodyweight, muscleStatuses, trends, weeklySeries,
  workoutDurationMin, workoutSets, workoutTonnage, heroStats, totals,
} from './stats';
import { levelFromXp } from './xp';

export interface Tip { icon: string; title: string; text: string; kind: 'warn' | 'good' | 'info' }

/** Советы по правилам — работают без интернета и ключа */
export const buildTips = (state: AppState, ex: ExerciseMap): Tip[] => {
  const tips: Tip[] = [];
  const ws = state.workouts;
  if (!ws.length) {
    tips.push({ icon: '🚀', title: 'Начни путь', text: 'Запиши первую тренировку — герой получит первый опыт, а я начну анализировать твои данные.', kind: 'info' });
    return tips;
  }

  const since = daysSinceLast(ws);
  if (since !== null && since >= 4) tips.push({ icon: '⏰', title: `Пауза ${since} ${plural(since, 'день', 'дня', 'дней')}`, text: 'Форма не теряется за неделю, но серия недель прервётся. Короткая тренировка лучше пропуска.', kind: 'warn' });

  const st = muscleStatuses(ws, ex, 30);
  const lag = st.filter((m) => m.lagging && st.some((x) => x.sets > 0));
  if (lag.length && ws.length >= 3) {
    const names = lag.slice(0, 4).map((m) => MUSCLES[m.id].name.toLowerCase());
    tips.push({ icon: '🎯', title: 'Отстающие мышцы', text: `За 30 дней меньше всего нагрузки получили: ${names.join(', ')}. Добавь 1–2 упражнения на них — за это начисляется бонусный XP.`, kind: 'warn' });
  }

  // Плато по упражнениям: 4+ сессии без роста 1ПМ
  for (const def of [...ex.values()]) {
    if (def.kind !== 'weight') continue;
    const h = exerciseHistory(ws, def.id, def);
    if (h.length < 4) continue;
    const last4 = h.slice(-4);
    const best = Math.max(...h.slice(0, -4).map((x) => x.bestE1rm), 0);
    const noGrowth = last4.every((x) => x.bestE1rm <= best * 1.01) && best > 0;
    if (noGrowth) {
      const lw = last4[last4.length - 1];
      tips.push({ icon: '🧱', title: `Плато: ${def.name}`, text: `4 тренировки подряд 1ПМ не растёт (~${fmtNum(best)} кг). Попробуй сменить схему: ${fmtNum(lw.maxWeight + 2.5, 1)} кг на меньше повторений, либо +1 повтор с текущим весом, либо неделю разгрузки на 80%.`, kind: 'warn' });
    }
  }

  const w4 = weeklySeries(ws, ex, 4);
  const perWeek = w4.reduce((a, x) => a + x.workouts, 0) / 4;
  if (ws.length >= 4 && perWeek < 2) tips.push({ icon: '📆', title: 'Частота ниже 2 в неделю', text: `В среднем ${perWeek.toFixed(1)} тренировки в неделю за месяц. Для роста силы и мышц оптимально 3–4: каждая группа мышц хотя бы дважды в неделю.`, kind: 'warn' });
  else if (perWeek >= 3) tips.push({ icon: '🔥', title: 'Отличная частота', text: `${perWeek.toFixed(1)} тренировки в неделю — ты в зоне роста. Следи за восстановлением: 7–8 часов сна и 1.6–2 г белка на кг веса.`, kind: 'good' });

  const tr = trends(ws, ex, state.bodyweight);
  const ton = tr.find((t) => t.metric === 'Тоннаж');
  if (ton && ton.before > 0 && ton.delta <= -20) tips.push({ icon: '📉', title: 'Объём упал', text: `Тоннаж за 4 недели на ${Math.abs(Math.round(ton.delta))}% ниже предыдущих 4. Если это не запланированная разгрузка — верни рабочие веса и число подходов.`, kind: 'warn' });
  if (ton && ton.before > 0 && ton.delta >= 15) tips.push({ icon: '📈', title: 'Объём растёт', text: `Тоннаж вырос на ${Math.round(ton.delta)}% к прошлому месяцу. Герой на подъёме!`, kind: 'good' });

  // Баланс тяни/толкай
  const push = st.filter((m) => ['chest', 'front_delts', 'triceps'].includes(m.id)).reduce((a, m) => a + m.sets, 0);
  const pull = st.filter((m) => ['lats', 'upper_back', 'rear_delts', 'biceps'].includes(m.id)).reduce((a, m) => a + m.sets, 0);
  if (push > 10 && pull < push * 0.6) tips.push({ icon: '⚖️', title: 'Перекос в «толкай»', text: `Жимовых подходов ${Math.round(push)}, тяговых ${Math.round(pull)}. Для здоровых плеч и осанки тяги должно быть не меньше, чем жимов: добавь тягу в наклоне, подтягивания и тягу к лицу.`, kind: 'warn' });
  const legs = st.filter((m) => ['quads', 'hamstrings', 'glutes'].includes(m.id)).reduce((a, m) => a + m.sets, 0);
  const upper = push + pull;
  if (upper > 20 && legs < upper * 0.3) tips.push({ icon: '🦵', title: 'Ноги отстают от верха', text: `На ноги ${Math.round(legs)} подходов против ${Math.round(upper)} на верх. Присед и становая дают больше всего XP и гормонального отклика — не пропускай день ног.`, kind: 'warn' });

  const cardio = w4.reduce((a, x) => a + x.cardioMin, 0);
  if (ws.length >= 6 && cardio < 30) tips.push({ icon: '❤️', title: 'Мало кардио', text: 'Меньше 30 минут кардио за месяц. 2 × 20 минут лёгкого кардио в неделю улучшат восстановление и выносливость героя.', kind: 'info' });

  if (!state.bodyweight.length) tips.push({ icon: '⚖️', title: 'Запиши вес тела', text: 'Без веса тела я не могу считать относительную силу и достижения вроде «свой вес в жиме». Вводи вес раз в неделю.', kind: 'info' });

  const longest = ws.filter((w) => workoutDurationMin(w) > 110);
  if (longest.length >= 2) tips.push({ icon: '⏱️', title: 'Длинные тренировки', text: 'Несколько тренировок дольше 110 минут. Укороти отдых до 2–3 минут на базе и 60–90 секунд на изоляции — качество подходов вырастет.', kind: 'info' });

  if (!tips.length) tips.push({ icon: '✅', title: 'Всё сбалансировано', text: 'Я не вижу слабых мест. Продолжай прибавлять вес или повторения понемногу — прогрессия нагрузки важнее всего.', kind: 'good' });
  return tips;
};

/** Текстовое досье для ИИ-тренера */
export const buildSummary = (state: AppState, ex: ExerciseMap): string => {
  const ws = state.workouts;
  const lines: string[] = [];
  const lvl = levelFromXp(state.profile.xp);
  const t = totals(ws, ex);
  const bw = latestBodyweight(state.bodyweight);
  lines.push(`Пользователь: ${state.profile.name || 'Атлет'}, уровень ${lvl.level} (${lvl.title}), ${state.profile.xp} XP.`);
  lines.push(`Всего тренировок: ${t.workouts}, подходов: ${t.sets}, тоннаж: ${Math.round(t.tonnage)} кг, кардио: ${Math.round(t.cardioMin)} мин, личных рекордов: ${t.prs}.`);
  if (bw) lines.push(`Вес тела: ${bw} кг.`);
  if (state.bodyweight.length > 1) {
    const sorted = [...state.bodyweight].sort((a, b) => a.date.localeCompare(b.date));
    lines.push(`Динамика веса: ${sorted.slice(-8).map((b) => `${b.date.slice(0, 10)}: ${b.kg}`).join('; ')}.`);
  }
  const hs = heroStats(ws, ex, state.bodyweight);
  lines.push(`Статы героя (0-100): сила ${hs.strength}, выносливость ${hs.endurance}, дисциплина ${hs.discipline}, баланс ${hs.balance}, объём ${hs.volume}.`);

  const w8 = weeklySeries(ws, ex, 8);
  lines.push('Последние 8 недель (неделя: тренировок / подходов / тоннаж кг / кардио мин): ' +
    w8.map((w) => `${w.label}: ${w.workouts}/${w.sets}/${Math.round(w.tonnage)}/${Math.round(w.cardioMin)}`).join('; ') + '.');

  const st = muscleStatuses(ws, ex, 30);
  lines.push('Подходы по мышцам за 30 дней: ' + st.map((m) => `${MUSCLES[m.id].name} ${m.sets.toFixed(1)}${m.lagging ? ' (отстаёт)' : ''}`).join(', ') + '.');

  const tr = trends(ws, ex, state.bodyweight);
  lines.push('Тренд (28 дней vs предыдущие 28): ' + tr.map((x) => `${x.metric}: ${fmtNum(x.now, 1)} vs ${fmtNum(x.before, 1)} (${x.delta >= 0 ? '+' : ''}${Math.round(x.delta)}%)`).join('; ') + '.');

  lines.push('Ключевые упражнения (последние сессии: дата — лучший подход, 1ПМ):');
  const used = new Set(ws.flatMap((w) => w.entries.map((e) => e.exerciseId)));
  const defs = [...used].map((id) => ex.get(id)).filter((d): d is Exercise => !!d);
  const prioritized = [...defs].sort((a, b) => (a.id in BIG_LIFTS ? -1 : 0) - (b.id in BIG_LIFTS ? -1 : 0)).slice(0, 12);
  for (const def of prioritized) {
    const h = exerciseHistory(ws, def.id, def).slice(-5);
    const desc = h.map((s) => {
      if (def.kind === 'weight' || def.kind === 'bodyweight') return `${s.date.slice(5, 10)}: ${s.maxWeight}кг×${s.maxReps} (1ПМ ${Math.round(s.bestE1rm)})`;
      if (def.kind === 'time') return `${s.date.slice(5, 10)}: ${s.bestSeconds}с`;
      return `${s.date.slice(5, 10)}: ${Math.round(s.bestSeconds / 60)}мин ${s.km}км`;
    }).join('; ');
    lines.push(`- ${def.name}: ${desc}`);
  }

  const last = [...ws].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  lines.push('Последние тренировки:');
  for (const w of last) {
    const items = w.entries.map((e) => {
      const d = ex.get(e.exerciseId); if (!d) return '';
      return `${d.name} ${e.sets.map((s) => d.kind === 'cardio' ? `${Math.round((s.seconds ?? 0) / 60)}мин` : d.kind === 'time' ? `${s.seconds}с` : `${s.weight ?? 0}×${s.reps ?? 0}`).join(', ')}`;
    }).filter(Boolean).join('; ');
    lines.push(`- ${w.date.slice(0, 10)} (${workoutDurationMin(w)} мин, ${workoutSets(w, ex)} подх., ${Math.round(workoutTonnage(w, ex))} кг): ${items}${w.note ? ` | заметка: ${w.note}` : ''}`);
  }
  const tips = buildTips(state, ex);
  lines.push('Автоматические наблюдения приложения: ' + tips.map((t) => `${t.title} — ${t.text}`).join(' | '));
  return lines.join('\n');
};
