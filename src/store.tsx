import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { AppState, ChatMsg, CoachId, CoachPlan, Exercise, SetEntry, Workout, WorkoutSummary, AiNote } from './types';
import { BASE_EXERCISES } from './data/exercises';
import { uid } from './lib/dates';
import { emptyState, loadLocal, saveLocal } from './lib/storage';
import { computeWorkoutXp, levelFromXp } from './lib/xp';
import { muscleStatuses, type ExerciseMap } from './lib/stats';
import { ACHIEVEMENT_MAP, evaluateAchievements } from './lib/achievements';
import type { DayTask } from './lib/programs';
import { programFor } from './lib/schedule';

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'startWorkout' }
  | { type: 'addEntry'; exerciseId: string }
  | { type: 'removeEntry'; entryId: string }
  | { type: 'addSet'; entryId: string; set?: Partial<SetEntry> }
  | { type: 'updateSet'; entryId: string; setId: string; patch: Partial<SetEntry> }
  | { type: 'removeSet'; entryId: string; setId: string }
  | { type: 'setNote'; note: string }
  | { type: 'finishWorkout'; summary: WorkoutSummary; achievementXp: number }
  | { type: 'discardWorkout' }
  | { type: 'deleteWorkout'; id: string }
  | { type: 'addCustomExercise'; exercise: Exercise }
  | { type: 'deleteCustomExercise'; id: string }
  | { type: 'logBodyweight'; kg: number; date?: string }
  | { type: 'removeBodyweight'; date: string }
  | { type: 'setProfile'; patch: Partial<AppState['profile']> }
  | { type: 'addAiNote'; note: AiNote }
  | { type: 'unlockAchievements'; ids: string[]; xp: number }
  | { type: 'coachMsg'; coach: CoachId; msg: ChatMsg; ifEmpty?: boolean }
  | { type: 'coachPlan'; plan: CoachPlan }
  | { type: 'startTask'; task: DayTask }
  | { type: 'setProgram'; id: 'fullbody3' | 'upperlower4' | 'ppl' | 'ulppl' | null }
  | { type: 'setSchedule'; style: 'fullbody' | 'split'; days: number[] }
  | { type: 'reset' };

const reducer = (s: AppState, a: Action): AppState => {
  switch (a.type) {
    case 'hydrate': return a.state;
    case 'startWorkout':
      return s.draft ? s : { ...s, draft: { id: uid(), date: new Date().toISOString(), entries: [], xp: 0, xpBreakdown: [], prs: [] } };
    case 'addEntry': {
      if (!s.draft) return s;
      const entry = { id: uid(), exerciseId: a.exerciseId, sets: [{ id: uid() }] };
      return { ...s, draft: { ...s.draft, entries: [...s.draft.entries, entry] } };
    }
    case 'removeEntry':
      return s.draft ? { ...s, draft: { ...s.draft, entries: s.draft.entries.filter((e) => e.id !== a.entryId) } } : s;
    case 'addSet':
      return s.draft ? {
        ...s, draft: { ...s.draft, entries: s.draft.entries.map((e) => e.id === a.entryId ? { ...e, sets: [...e.sets, { id: uid(), ...a.set }] } : e) },
      } : s;
    case 'updateSet':
      return s.draft ? {
        ...s, draft: { ...s.draft, entries: s.draft.entries.map((e) => e.id === a.entryId ? { ...e, sets: e.sets.map((x) => x.id === a.setId ? { ...x, ...a.patch } : x) } : e) },
      } : s;
    case 'removeSet':
      return s.draft ? {
        ...s, draft: { ...s.draft, entries: s.draft.entries.map((e) => e.id === a.entryId ? { ...e, sets: e.sets.filter((x) => x.id !== a.setId) } : e) },
      } : s;
    case 'setNote':
      return s.draft ? { ...s, draft: { ...s.draft, note: a.note } } : s;
    case 'finishWorkout': {
      const w = a.summary.workout;
      const newAch = a.summary.newAchievements.map((x) => ({ id: x.id, date: w.endedAt ?? w.date, workoutId: w.id }));
      return {
        ...s,
        draft: null,
        workouts: [...s.workouts, w],
        profile: { ...s.profile, xp: s.profile.xp + w.xp + a.achievementXp },
        achievements: [...s.achievements, ...newAch],
      };
    }
    case 'discardWorkout': return { ...s, draft: null };
    case 'deleteWorkout': {
      const w = s.workouts.find((x) => x.id === a.id);
      if (!w) return s;
      return { ...s, workouts: s.workouts.filter((x) => x.id !== a.id), profile: { ...s.profile, xp: Math.max(0, s.profile.xp - w.xp) } };
    }
    case 'addCustomExercise': return { ...s, customExercises: [...s.customExercises, a.exercise] };
    case 'deleteCustomExercise': return { ...s, customExercises: s.customExercises.filter((e) => e.id !== a.id) };
    case 'logBodyweight': {
      const date = a.date ?? new Date().toISOString();
      const day = date.slice(0, 10);
      const rest = s.bodyweight.filter((b) => b.date.slice(0, 10) !== day);
      return { ...s, bodyweight: [...rest, { date, kg: a.kg }].sort((x, y) => x.date.localeCompare(y.date)) };
    }
    case 'removeBodyweight': return { ...s, bodyweight: s.bodyweight.filter((b) => b.date !== a.date) };
    case 'setProfile': return { ...s, profile: { ...s.profile, ...a.patch } };
    case 'addAiNote': return { ...s, aiNotes: [a.note, ...s.aiNotes].slice(0, 30) };
    case 'unlockAchievements': {
      const now = new Date().toISOString();
      return { ...s, achievements: [...s.achievements, ...a.ids.map((id) => ({ id, date: now }))], profile: { ...s.profile, xp: s.profile.xp + a.xp } };
    }
    case 'coachMsg': {
      if (a.ifEmpty && (s.coachChats[a.coach]?.length ?? 0) > 0) return s;
      const list = [...(s.coachChats[a.coach] ?? []), a.msg].slice(-200);
      return { ...s, coachChats: { ...s.coachChats, [a.coach]: list } };
    }
    case 'coachPlan': {
      const rest = s.coachPlans.filter((p) => p.date !== a.plan.date);
      return { ...s, coachPlans: [...rest, a.plan].slice(-30) };
    }
    case 'startTask': {
      if (s.draft) return s;
      const t = a.task;
      const id = uid();
      const entries = t.exercises.map((e) => ({
        id: uid(), exerciseId: e.id,
        sets: Array.from({ length: Math.max(1, e.sets) }, () => ({ id: uid(), weight: e.weight ?? undefined, reps: e.reps ?? undefined, seconds: e.seconds ?? undefined })),
      }));
      const task = { source: t.source, title: t.title, programId: t.programId, day: t.day, coachDate: t.coachDate };
      return { ...s,
        draft: { id, date: new Date().toISOString(), entries, xp: 0, xpBreakdown: [], prs: [], task },
        coachPlans: t.coachDate ? s.coachPlans.map((p) => (p.date === t.coachDate ? { ...p, workoutId: id } : p)) : s.coachPlans };
    }
    case 'setSchedule': {
      const days = [...new Set(a.days)].filter((d) => d >= 0 && d <= 6).sort((x, y) => x - y);
      const id = programFor(a.style, days.length);
      return { ...s, schedule: { style: a.style, days }, program: { id, start: s.program?.id === id ? s.program.start : new Date().toISOString() } };
    }
    case 'setProgram':
      return { ...s, program: a.id ? { id: a.id, start: s.program?.id === a.id ? s.program.start : new Date().toISOString() } : undefined, schedule: a.id ? s.schedule : undefined };
    case 'reset': return { ...emptyState(), profile: { ...emptyState().profile, created: s.profile.created, name: s.profile.name, look: s.profile.look, gear: s.profile.gear } };
    default: return s;
  }
};

interface Store {
  state: AppState;
  dispatch: (a: Action) => void;
  exercises: Exercise[];
  exMap: ExerciseMap;
  /** Завершить черновик: считает XP, рекорды, достижения и возвращает сводку */
  finishWorkout: () => WorkoutSummary | null;
  checkAchievements: () => void;
}

const Ctx = createContext<Store | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, null, () => loadLocal() ?? emptyState());
  const exercises = useMemo(() => [...BASE_EXERCISES, ...state.customExercises], [state.customExercises]);
  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveLocal(state), 150);
  }, [state]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const store = useMemo<Store>(() => ({
    state, dispatch, exercises, exMap,
    finishWorkout: () => {
      const s = stateRef.current;
      const d = s.draft;
      if (!d) return null;
      const entries = d.entries.filter((e) => e.sets.length);
      const endedAt = new Date().toISOString();
      const lagging = muscleStatuses(s.workouts, exMap, 30).filter((m) => m.lagging).map((m) => m.id);
      const base: Workout = { ...d, entries, endedAt };
      const res = computeWorkoutXp(base, s.workouts, exMap, lagging, exMap);
      const workout: Workout = { ...base, xp: res.xp, xpBreakdown: res.breakdown, prs: res.prs };
      const levelBefore = levelFromXp(s.profile.xp).level;
      const tmpState: AppState = { ...s, workouts: [...s.workouts, workout], profile: { ...s.profile, xp: s.profile.xp + res.xp } };
      const newly = evaluateAchievements({ state: tmpState, workouts: tmpState.workouts, ex: exMap, last: workout });
      const achievementXp = newly.reduce((a, x) => a + x.xp, 0);
      const levelAfter = levelFromXp(s.profile.xp + res.xp + achievementXp).level;
      const summary: WorkoutSummary = {
        workout, levelBefore, levelAfter,
        newAchievements: newly.map((x) => ({ id: x.id, xp: x.xp })),
        musclesWorked: res.musclesWorked,
      };
      dispatch({ type: 'finishWorkout', summary, achievementXp });
      return summary;
    },
    checkAchievements: () => {
      const s = stateRef.current;
      const newly = evaluateAchievements({ state: s, workouts: s.workouts, ex: exMap });
      if (newly.length) dispatch({ type: 'unlockAchievements', ids: newly.map((x) => x.id), xp: newly.reduce((a, x) => a + (ACHIEVEMENT_MAP.get(x.id)?.xp ?? 0), 0) });
    },
  }), [state, exercises, exMap]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
};

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
};
