import { useEffect, useMemo, useState } from 'react';
import type { MuscleId } from '../types';
import { useStore } from '../store';
import { Figure } from '../components/Figure';
import { Cta, Hud, Panel, PmTabs, Radar, StatRow, Stencil, Sunset } from '../components/gta';
import { MUSCLES } from '../data/muscles';
import { levelFromXp } from '../lib/xp';
import { bulkFromLevel, stageOf, DEFAULT_LOOK } from '../lib/figure';
import { dayKey, fmtNum, plural } from '../lib/dates';
import { daysSinceLast, heroStats, muscleStatuses, totals, weekStreak, workoutMuscles } from '../lib/stats';
import { ACHIEVEMENT_MAP } from '../lib/achievements';
import { haptic } from '../lib/telegram';

export type HeroOpen = 'settings' | 'achievements' | 'exercises' | 'muscle';

export const useClock = () => {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 15000); return () => clearInterval(i); }, []);
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
};

export const HeroScreen = ({ onOpen, onStartMission }: { onOpen: (s: HeroOpen, id?: string) => void; onStartMission: () => void }) => {
  const { state, exMap } = useStore();
  const clock = useClock();
  const lvl = levelFromXp(state.profile.xp);
  const b = bulkFromLevel(lvl.level);
  const stage = stageOf(b);
  const stats = useMemo(() => heroStats(state.workouts, exMap, state.bodyweight), [state.workouts, exMap, state.bodyweight]);
  const statuses = useMemo(() => muscleStatuses(state.workouts, exMap, 30), [state.workouts, exMap]);
  const todayKey = dayKey(new Date());
  const today = useMemo(() => {
    const set = new Set<MuscleId>();
    state.workouts.filter((w) => dayKey(w.date) === todayKey).forEach((w) => workoutMuscles(w, exMap).forEach((m) => set.add(m)));
    if (state.draft) workoutMuscles(state.draft, exMap).forEach((m) => set.add(m));
    return [...set];
  }, [state.workouts, state.draft, exMap, todayKey]);
  const lagging = statuses.filter((m) => m.lagging).map((m) => m.id);
  const load = useMemo(() => Object.fromEntries(statuses.map((s) => [s.id, s.ratio])) as Partial<Record<MuscleId, number>>, [statuses]);
  const t = totals(state.workouts, exMap);
  const streak = weekStreak(state.workouts);
  const since = daysSinceLast(state.workouts);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [tab, setTab] = useState<'stats' | 'info'>('stats');
  const unlocked = state.achievements.length;

  return (
    <div className="screen">
      <Sunset className="full" />
      <div className="halftone" />
      <div className="head">
        <div>
          <div className="tag">{(state.profile.name || 'Атлет').toUpperCase()}</div>
          <div style={{ marginTop: 6 }}><Stencil kind="y" small onClick={() => onOpen('settings')}>ур.{lvl.level} · стадия {stage}/5 ⚙</Stencil></div>
          <div className="osw" style={{ fontSize: 11, color: '#fff', textShadow: '1px 1px 0 #000', marginTop: 5 }}>{lvl.title}</div>
        </div>
        <Hud clock={clock} money={t.tonnage} bars={[{ v: (lvl.into / lvl.need) * 100, color: '#b4342c' }, { v: stats.discipline, color: '#e8e8e8' }, { v: stats.endurance, color: '#3a8fd6' }]} barsLabel="respect · дисциплина · выносливость" stars={streak} />
      </div>

      <div className="hero-stage z">
        <Figure className="fig" b={b} stage={stage} view={view} gear={state.profile.gear || 'street'} look={state.profile.look || DEFAULT_LOOK} muscles={{ today, lagging, load }} w={250} h={433}
          onPickMuscle={(m) => { haptic('light'); onOpen('muscle', m); }} />
        <Radar statuses={statuses} size={100} />
        <div className="chips">
          {today.slice(0, 2).map((m) => <Stencil key={m} kind="g" small onClick={() => onOpen('muscle', m)}>{MUSCLES[m].short} ✓</Stencil>)}
          {lagging.slice(0, 2).map((m) => <Stencil key={m} kind="w" small onClick={() => onOpen('muscle', m)}>{MUSCLES[m].short} ↓</Stencil>)}
          <Stencil small onClick={() => { haptic('light'); setView((v) => (v === 'front' ? 'back' : 'front')); }}>↻ {view === 'front' ? 'спина' : 'перед'}</Stencil>
        </div>
      </div>

      <div className="z">
        <Panel>
          <PmTabs value={tab} onChange={(v) => { if (v === 'stats' || v === 'info') setTab(v); else if (v === 'trophies') onOpen('achievements'); else if (v === 'ex') onOpen('exercises'); }}
            items={[{ id: 'stats', label: 'Статы' }, { id: 'info', label: 'Сводка' }, { id: 'trophies', label: `Трофеи ${unlocked}/${ACHIEVEMENT_MAP.size}` }, { id: 'ex', label: 'Упражнения' }] as { id: string; label: string }[]} />
          {tab === 'stats' ? (
            <div style={{ marginTop: 8 }}>
              <StatRow label="MUSCLE" value={stats.strength} color="var(--gold)" />
              <StatRow label="STAMINA" value={stats.endurance} color="var(--blue)" />
              <StatRow label="DISCIPL" value={stats.discipline} color="var(--white)" />
              <StatRow label="BALANCE" value={stats.balance} color="var(--green)" />
              <StatRow label="VOLUME" value={stats.volume} color="#e8692a" />
              <div className="row between" style={{ marginTop: 8 }}>
                <span className="tiny mut">Respect {fmtNum(lvl.into)} / {fmtNum(lvl.need)} до ур.{lvl.level + 1}</span>
                <span className="tiny goldc">{lagging.length ? `+25 respect за отстающие` : 'баланс в норме'}</span>
              </div>
            </div>
          ) : (
            <div className="grid-3" style={{ marginTop: 10 }}>
              <div className="stat-tile"><div className="v">{t.workouts}</div><div className="l">миссий</div></div>
              <div className="stat-tile"><div className="v gold">{streak}</div><div className="l">{plural(streak, 'неделя', 'недели', 'недель')} подряд</div></div>
              <div className="stat-tile"><div className="v">{since === null ? '—' : since === 0 ? 'сегодня' : since}</div><div className="l">{since === null ? 'ещё не было' : since === 0 ? 'тренировка' : plural(since, 'день назад', 'дня назад', 'дней назад')}</div></div>
              <div className="stat-tile"><div className="v green">{fmtNum(t.tonnage / 1000, 1)} т</div><div className="l">тоннаж</div></div>
              <div className="stat-tile"><div className="v">{t.sets}</div><div className="l">подходов</div></div>
              <div className="stat-tile"><div className="v">{t.prs}</div><div className="l">рекордов</div></div>
            </div>
          )}
        </Panel>
        <Cta onClick={onStartMission} style={{ marginTop: 12 }}>{state.draft ? '⚔️ Продолжить миссию' : '⚔️ Начать миссию'}</Cta>
      </div>
    </div>
  );
};
