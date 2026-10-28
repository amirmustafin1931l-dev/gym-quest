import { useEffect, useRef, useState } from 'react';
import type { MuscleId } from './types';
import { useStore } from './store';
import { Toast } from './components/ui';
import { Figure } from './components/Figure';
import { LookEditor } from './components/LookEditor';
import { Cta, Hud, Panel, Sunset } from './components/gta';
import { HeroScreen } from './screens/HeroScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { ExercisesScreen } from './screens/ExercisesScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { CoachScreen } from './screens/CoachScreen';
import { GangScreen } from './screens/GangScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ProgramsScreen } from './screens/ProgramsScreen';
import { cloudAvailable, cloudLoad, cloudSave, haptic } from './lib/telegram';
import { parseImport, serialize } from './lib/storage';
import { toast } from './lib/toast';
import { totals, weekStreak } from './lib/stats';
import { levelFromXp } from './lib/xp';
import { bulkFromLevel, stageOf, DEFAULT_LOOK } from './lib/figure';
import { plural } from './lib/dates';

type Tab = 'hero' | 'workout' | 'gang' | 'progress' | 'coach';
type Sub = { kind: 'none' } | { kind: 'settings' } | { kind: 'programs' } | { kind: 'achievements' } | { kind: 'exercises' } | { kind: 'exercise'; id: string; back?: Sub } | { kind: 'muscle'; id: MuscleId };
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hero', label: 'Герой', icon: '👤' }, { id: 'workout', label: 'Миссия', icon: '🏋️' }, { id: 'gang', label: 'Банда', icon: '👥' }, { id: 'progress', label: 'Статы', icon: '📈' }, { id: 'coach', label: 'Тренер', icon: '📟' },
];

export default function App() {
  const { state, dispatch, exMap } = useStore();
  const [tab, setTab] = useState<Tab>('hero');
  const [sub, setSub] = useState<Sub>({ kind: 'none' });
  const [wasted, setWasted] = useState(false);

  // Восстановление из облака при первом запуске на новом устройстве
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !cloudAvailable() || state.workouts.length) return;
    restored.current = true;
    cloudLoad().then((raw) => { if (!raw) return; const s = parseImport(raw); if (s.workouts.length) { dispatch({ type: 'hydrate', state: s }); toast('Прогресс восстановлен из Telegram'); } }).catch(() => null);
  }, [state.workouts.length, dispatch]);

  // Автобэкап
  const count = state.workouts.length; const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!cloudAvailable()) return;
    const t = setTimeout(() => cloudSave(serialize(state)).catch(() => null), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, state.achievements.length, state.bodyweight.length, state.profile.look, state.profile.gear]);

  // WASTED: серия недель прервана
  const streak = weekStreak(state.workouts);
  useEffect(() => {
    const best = state.profile.lastStreak ?? 0;
    if (streak > best) dispatch({ type: 'setProfile', patch: { lastStreak: streak } });
    else if (streak === 0 && best >= 2 && !state.draft) setWasted(true);
  }, [streak, state.profile.lastStreak, state.draft, dispatch]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab, sub]);
  const go = (t: Tab) => { haptic('light'); setTab(t); setSub({ kind: 'none' }); };
  const openExercise = (id: string) => { setTab('hero'); setSub({ kind: 'exercise', id, back: sub.kind === 'muscle' || sub.kind === 'exercises' ? sub : undefined }); };
  const lvl = levelFromXp(state.profile.xp); const b = bulkFromLevel(lvl.level);

  let content;
  if (sub.kind === 'settings') content = <SettingsScreen onBack={() => setSub({ kind: 'none' })} />;
  else if (sub.kind === 'programs') content = <ProgramsScreen onBack={() => setSub({ kind: 'none' })} />;
  else if (sub.kind === 'achievements') content = <AchievementsScreen onBack={() => setSub({ kind: 'none' })} />;
  else if (sub.kind === 'exercise' || sub.kind === 'muscle' || sub.kind === 'exercises') content = (
    <ExercisesScreen selectedId={sub.kind === 'exercise' ? sub.id : null} muscle={sub.kind === 'muscle' ? sub.id : null}
      onSelect={(id) => setSub(id ? { kind: 'exercise', id, back: sub.kind === 'muscle' || sub.kind === 'exercises' ? sub : undefined } : sub.kind === 'exercise' ? (sub.back ?? { kind: 'none' }) : sub)}
      onBack={() => setSub({ kind: 'none' })} />
  );
  else if (tab === 'hero') content = <HeroScreen onStartMission={() => setTab('workout')} onOpen={(s, id) => { if (s === 'muscle' && id) setSub({ kind: 'muscle', id: id as MuscleId }); else setSub({ kind: s } as Sub); }} />;
  else if (tab === 'workout') content = <WorkoutScreen onExercise={openExercise} onPrograms={() => setSub({ kind: 'programs' })} onCoach={() => go('coach')} />;
  else if (tab === 'gang') content = <GangScreen />;
  else if (tab === 'progress') content = <ProgressScreen onExercise={openExercise} />;
  else content = <CoachScreen onStarted={() => go('workout')} />;

  const t = totals(state.workouts, exMap);
  return (
    <div className="app">
      {content}
      <nav className="tabbar" aria-label="Разделы">
        {TABS.map((x) => <button key={x.id} className={tab === x.id && sub.kind === 'none' ? 'active' : ''} onClick={() => go(x.id)} aria-label={x.label}><span className="ic">{x.icon}</span>{x.label}{x.id === 'workout' && state.draft && <span className="dot" />}</button>)}
      </nav>
      <Toast />
      {!state.profile.created && !state.workouts.length && (
        <div className="overlay"><Sunset className="full" /><div className="inner z" style={{ position: 'relative' }}>
          <div className="center"><div className="mono gold-text" style={{ fontSize: 26 }}>GYMQUEST</div><div className="spray" style={{ fontSize: 20, color: 'var(--green)', textShadow: '2px 2px 0 #000' }}>создай своего качка</div></div>
          <div style={{ marginTop: 16 }}><Panel><LookEditor compact /></Panel></div>
          <Panel><label className="small mut">Имя героя<input value={state.profile.name} onChange={(e) => dispatch({ type: 'setProfile', patch: { name: e.target.value } })} placeholder="Как тебя зовут на районе" /></label></Panel>
          <Cta onClick={() => { haptic('success'); dispatch({ type: 'setProfile', patch: { created: true, name: state.profile.name.trim() || 'Атлет' } }); }} style={{ marginTop: 12 }}>Выйти на район</Cta>
          <p className="tiny mut center" style={{ marginTop: 8 }}>Внешность и экипировку можно менять потом в настройках героя.</p>
        </div></div>
      )}
      {wasted && (
        <div className="overlay" style={{ background: '#2a2a2a' }}><div className="gray" style={{ position: 'absolute', inset: 0 }}><Sunset className="full" /></div>
          <div className="inner z" style={{ position: 'relative' }}>
            <div className="head" style={{ position: 'relative' }}><div /><Hud clock="--:--" money={t.tonnage} bars={[{ v: 0, color: '#555' }, { v: 0, color: '#555' }, { v: 0, color: '#555' }]} stars={0} /></div>
            <div className="gray" style={{ display: 'flex', justifyContent: 'center', margin: '0 0 -60px' }}><Figure b={b} stage={stageOf(b)} gear={state.profile.gear || 'street'} look={state.profile.look || DEFAULT_LOOK} w={230} h={398} /></div>
            <div className="wasted-band" style={{ position: 'relative' }}><div className="wasted-t">WASTED</div><div className="mono" style={{ fontSize: 12, color: '#fff', marginTop: 6 }}>СЕРИЯ {state.profile.lastStreak} {plural(state.profile.lastStreak ?? 0, 'НЕДЕЛЯ', 'НЕДЕЛИ', 'НЕДЕЛЬ')} ПРЕРВАНА</div><div className="osw tiny" style={{ color: '#ccc', marginTop: 8 }}>Две недели без миссий · звёзды сброшены</div></div>
            <Cta onClick={() => { setWasted(false); dispatch({ type: 'setProfile', patch: { lastStreak: 0, wastedAt: new Date().toISOString() } }); }} style={{ marginTop: 24 }}>Вернуться в зал</Cta>
          </div></div>
      )}
    </div>
  );
}
