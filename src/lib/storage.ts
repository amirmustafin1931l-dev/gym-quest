import type { AppState } from '../types';
import { tgUserName } from './telegram';

const KEY = 'gymquest:v1';

export const emptyState = (): AppState => ({
  version: 1,
  profile: { name: tgUserName(), xp: 0, createdAt: new Date().toISOString() },
  customExercises: [],
  workouts: [],
  bodyweight: [],
  achievements: [],
  draft: null,
  aiNotes: [],
  coachChats: {},
  coachPlans: [],
});

export const isAppState = (x: unknown): x is AppState =>
  !!x && typeof x === 'object' && (x as AppState).version === 1 && Array.isArray((x as AppState).workouts) && !!(x as AppState).profile;

export const loadLocal = (): AppState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isAppState(parsed) ? { ...emptyState(), ...parsed } : null;
  } catch { return null; }
};

export const saveLocal = (s: AppState) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ }
};

export const serialize = (s: AppState) => JSON.stringify(s);

export const parseImport = (raw: string): AppState => {
  const parsed = JSON.parse(raw);
  if (!isAppState(parsed)) throw new Error('Файл не похож на экспорт GymQuest');
  return { ...emptyState(), ...parsed };
};
