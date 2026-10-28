import { useMemo, useState } from 'react';
import type { MuscleId } from '../types';
import { useStore } from '../store';
import { Bar, Card, StatTile } from '../components/ui';
import { BodyMap } from '../components/BodyMap';
import { MUSCLES } from '../data/muscles';
import { levelFromXp } from '../lib/xp';
import { dayKey, fmtDate, fmtNum, plural } from '../lib/dates';
import { daysSinceLast, heroStats, muscleStatuses, totals, weekStreak, workoutMuscles } from '../lib/stats';
import { ACHIEVEMENT_MAP } from '../lib/achievements';

const AVATARS = ['🧑‍🦱', '🧝', '🛡️', '⚔️', '🦾', '🐉', '🔥', '👑', '🌟', '🦁', '⚡'];

export const HeroScreen = ({ onOpen }: { onOpen: (s: 'settings' | 'achievements' | 'muscle', id?: string) => void }) => {
  const { state, exMap } = useStore();
  const lvl = levelFromXp(state.profile.xp);
  const stats = useMemo(() => heroStats(state.workouts, exMap, state.bodyweight), [state.workouts, exMap, state.bodyweight]);
  const statuses = useMemo(() => muscleStatuses(state.workouts, exMap, 30), [state.workouts, exMap]);
  const todayKey = dayKey(new Date());
  const today = useMemo(() => {
    const set = new Set<MuscleId>();
    state.workouts.filter((w) => dayKey(w.date) === todayKey).forEach((w) => workoutMuscles(w, exMap).forEach((m) => set.add(m)));
    if (state.draft) workoutMuscles(state.draft, exMap).forEach((m) => set.add(m));
    return [...set];
  }, [state.workouts, state.draft, exMap, todayKey]);
  const lagging = statuses.filter((m) => m.lagging);
  const t = totals(state.workouts, exMap);
  const streak = weekStreak(state.workouts);
  const since = daysSinceLast(state.workouts);
  const [sel, setSel] = useState<MuscleId | null>(null);
  const selSt = sel ? statuses.find((s) => s.id === sel) : null;
  const recentAch = [...state.achievements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const avatar = AVATARS[Math.min(AVATARS.length - 1, Math.floor((lvl.level - 1) / 4))];

  return (
    <div className="screen">
      <div className="hero-head">
        <div className="avatar">{avatar}<span className="lvl">{lvl.level}</span></div>
        <div className="grow">
          <div className="row between">
            <h1 style={{ fontSize: 20 }}>{state.profile.name || 'Атлет'}</h1>
            <button className="btn icon ghost" aria-label="Настройки" onClick={() => onOpen('settings')}>⚙️</button>
          </div>
          <div className="small gold bold">{lvl.title} · уровень {lvl.level}</div>
          <div style={{ marginTop: 6 }}><Bar value={lvl.into} max={lvl.need} gold /></div>
          <div className="tiny muted mono" style={{ marginTop: 3 }}>{fmtNum(lvl.into)} / {fmtNum(lvl.need)} XP до уровня {lvl.level + 1} · всего {fmtNum(state.profile.xp)} XP</div>
        </div>
      </div>

      <div className="grid-3">
        <StatTile value={t.workouts} label="тренировок" />
        <StatTile value={streak} label={`${plural(streak, 'неделя', 'недели', 'недель')} подряд`} delta={streak >= 2 ? '🔥 серия' : undefined} deltaKind="good" />
        <StatTile value={since === null ? '—' : since === 0 ? 'сегодня' : since} label={since === null ? 'ещё не было' : since === 0 ? 'тренировка' : plural(since, 'день назад', 'дня назад', 'дней назад')} deltaKind={since !== null && since >= 4 ? 'bad' : 'muted'} delta={since !== null && since >= 4 ? 'пора в зал' : undefined} />
      </div>

      <Card title="Характеристики">
        {([
          ['💪 Сила', stats.strength, 'var(--series-2)'],
          ['🫀 Выносливость', stats.endurance, 'var(--series-3)'],
          ['📅 Дисциплина', stats.discipline, 'var(--series-1)'],
          ['☯️ Баланс', stats.balance, 'var(--violet)'],
          ['🏋️ Объём', stats.volume, 'var(--series-4)'],
        ] as [string, number, string][]).map(([l, v, c]) => (
          <div className="stat-row" key={l}>
            <span className="text-2">{l}</span>
            <Bar value={v} max={100} color={c} />
            <span className="mono bold small" style={{ textAlign: 'right' }}>{v}</span>
          </div>
        ))}
        <p className="tiny muted" style={{ marginTop: 10 }}>Сила — 1ПМ базы к весу тела · Выносливость — кардио и подходы за 8 недель · Дисциплина — регулярность · Баланс — нет отстающих мышц · Объём — тоннаж в неделю</p>
      </Card>

      <Card title="Карта мышц" right={<span className="tiny muted">за 30 дней · нажми на мышцу</span>}>
        <BodyMap statuses={statuses} today={today} selected={sel} onPick={(m) => setSel((cur) => (cur === m ? null : m))} />
        {selSt && (
          <div className="card flat" style={{ marginTop: 10, padding: 10 }}>
            <div className="row between">
              <b>{MUSCLES[selSt.id].name}</b>
              <span className={`chip ${selSt.lagging ? 'warn' : selSt.sets > 0 ? 'good' : ''}`}>{selSt.lagging ? 'отстаёт' : selSt.sets > 0 ? 'в работе' : 'не тренировалась'}</span>
            </div>
            <div className="small text-2" style={{ marginTop: 4 }}>
              {fmtNum(selSt.sets, 1)} подх. за 30 дней{selSt.lastDate ? ` · последний раз ${fmtDate(selSt.lastDate)}` : ''}
            </div>
            <button className="btn sm" style={{ marginTop: 8 }} onClick={() => onOpen('muscle', selSt.id)}>Упражнения на эту мышцу →</button>
          </div>
        )}
        {today.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div className="small muted" style={{ marginBottom: 6 }}>Сегодня проработано</div>
            <div className="chips">{today.map((m) => <span key={m} className="chip good">{MUSCLES[m].short}</span>)}</div>
          </div>
        )}
        {lagging.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div className="small muted" style={{ marginBottom: 6 }}>Отстают за 30 дней — бонус +25 XP за каждую</div>
            <div className="chips">{lagging.map((m) => <button key={m.id} className="chip warn" onClick={() => onOpen('muscle', m.id)}>{MUSCLES[m.id].short}</button>)}</div>
          </div>
        )}
      </Card>

      <Card title="Достижения" right={<button className="btn sm ghost" onClick={() => onOpen('achievements')}>{state.achievements.length} / {ACHIEVEMENT_MAP.size} →</button>}>
        {recentAch.length ? (
          <div className="chips scroll">
            {recentAch.map((a) => { const d = ACHIEVEMENT_MAP.get(a.id); return d ? <div key={a.id} className="ach-mini" title={d.title}>{d.icon}</div> : null; })}
          </div>
        ) : <p className="small muted">Заверши первую тренировку, чтобы открыть первое достижение.</p>}
      </Card>

      <div className="grid-3">
        <StatTile value={`${fmtNum(t.tonnage / 1000, 1)} т`} label="тоннаж всего" />
        <StatTile value={t.sets} label="подходов" />
        <StatTile value={t.prs} label="рекордов" />
      </div>
    </div>
  );
};
