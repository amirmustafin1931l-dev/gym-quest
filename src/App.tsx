import { useEffect, useRef, useState } from 'react';
import type { MuscleId } from './types';
import { useStore } from './store';
import { Toast } from './components/ui';
import { HeroScreen } from './screens/HeroScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { ExercisesScreen } from './screens/ExercisesScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { CoachScreen } from './screens/CoachScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { cloudAvailable, cloudLoad, cloudSave, haptic } from './lib/telegram';
import { parseImport, serialize } from './lib/storage';
import { toast } from './lib/toast';

type Tab = 'hero' | 'workout' | 'exercises' | 'progress' | 'coach';
type Sub = { kind: 'none' } | { kind: 'settings' } | { kind: 'achievements' } | { kind: 'exercise'; id: string; back?: Sub } | { kind: 'muscle'; id: MuscleId };

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hero', label: 'Герой', icon: '🛡️' },
  { id: 'workout', label: 'Тренировка', icon: '⚔️' },
  { id: 'exercises', label: 'Упражнения', icon: '📜' },
  { id: 'progress', label: 'Прогресс', icon: '📈' },
  { id: 'coach', label: 'Тренер', icon: '🧙' },
];

export default function App() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<Tab>('hero');
  const [sub, setSub] = useState<Sub>({ kind: 'none' });

  // Восстановление из облака при первом запуске на новом устройстве
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !cloudAvailable() || state.workouts.length) return;
    restored.current = true;
    cloudLoad().then((raw) => {
      if (!raw) return;
      const s = parseImport(raw);
      if (s.workouts.length) { dispatch({ type: 'hydrate', state: s }); toast('Прогресс восстановлен из Telegram'); }
    }).catch(() => null);
  }, [state.workouts.length, dispatch]);

  // Автобэкап после завершения тренировки
  const count = state.workouts.length;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!cloudAvailable()) return;
    const t = setTimeout(() => cloudSave(serialize(state)).catch(() => null), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, state.achievements.length, state.bodyweight.length]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab, sub]);

  const go = (t: Tab) => { haptic('light'); setTab(t); setSub({ kind: 'none' }); };
  const openExercise = (id: string) => { setTab('exercises'); setSub({ kind: 'exercise', id }); };

  let content;
  if (sub.kind === 'settings') content = <SettingsScreen onBack={() => setSub({ kind: 'none' })} />;
  else if (sub.kind === 'achievements') content = <AchievementsScreen onBack={() => setSub({ kind: 'none' })} />;
  else if (tab === 'hero') content = <HeroScreen onOpen={(s, id) => { if (s === 'muscle' && id) { setTab('exercises'); setSub({ kind: 'muscle', id: id as MuscleId }); } else setSub({ kind: s } as Sub); }} />;
  else if (tab === 'workout') content = <WorkoutScreen onExercise={openExercise} />;
  else if (tab === 'exercises') content = (
    <ExercisesScreen
      selectedId={sub.kind === 'exercise' ? sub.id : null}
      muscle={sub.kind === 'muscle' ? sub.id : null}
      onSelect={(id) => setSub(id ? { kind: 'exercise', id, back: sub.kind === 'muscle' ? sub : undefined } : sub.kind === 'exercise' ? (sub.back ?? { kind: 'none' }) : sub)}
      onBack={() => setSub({ kind: 'none' })}
    />
  );
  else if (tab === 'progress') content = <ProgressScreen onExercise={openExercise} />;
  else content = <CoachScreen onSettings={() => setSub({ kind: 'settings' })} />;

  return (
    <div className="app">
      {content}
      <nav className="tabbar" aria-label="Разделы">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id && sub.kind !== 'settings' && sub.kind !== 'achievements' ? 'active' : ''} onClick={() => go(t.id)} aria-label={t.label}>
            <span className="ic">{t.icon}</span>{t.label}
            {t.id === 'workout' && state.draft && <span className="dot" />}
          </button>
        ))}
      </nav>
      <Toast />
    </div>
  );
}
