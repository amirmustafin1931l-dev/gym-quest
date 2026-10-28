export type MuscleId =
  | 'chest' | 'lats' | 'upper_back' | 'lower_back'
  | 'front_delts' | 'side_delts' | 'rear_delts'
  | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'obliques'
  | 'glutes' | 'quads' | 'hamstrings' | 'calves'
  | 'cardio';

export type Category = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'other';

/** weight: вес×повторы; bodyweight: повторы (+доп. вес); time: секунды; cardio: минуты+км */
export type ExerciseKind = 'weight' | 'bodyweight' | 'time' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  kind: ExerciseKind;
  primary: MuscleId[];
  secondary: MuscleId[];
  custom?: boolean;
}

export interface SetEntry {
  id: string;
  weight?: number;   // кг
  reps?: number;
  seconds?: number;  // для time / cardio (минуты хранятся в секундах)
  km?: number;
}

export interface WorkoutEntry {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
}

export type PRKind = 'weight' | 'e1rm' | 'reps' | 'time' | 'distance';

export interface PRRecord {
  exerciseId: string;
  kind: PRKind;
  value: number;
  prev?: number;
}

export interface XPLine { label: string; xp: number }

export interface WorkoutTask { source: 'program' | 'coach'; title: string; programId?: string; day?: number; coachDate?: string }

export interface Workout {
  id: string;
  task?: WorkoutTask;
  date: string;       // ISO начала
  endedAt?: string;
  entries: WorkoutEntry[];
  note?: string;
  xp: number;
  xpBreakdown: XPLine[];
  prs: PRRecord[];
}

export interface BodyweightEntry { date: string; kg: number }

export interface UnlockedAchievement { id: string; date: string; workoutId?: string }

export interface Profile {
  name: string;
  xp: number;
  createdAt: string;
  apiKey?: string;
  /** внешность героя */
  look?: { skin: 'light' | 'tan' | 'brown' | 'dark'; hair: 'short' | 'bald' | 'afro' | 'mohawk' | 'long'; beard: 'none' | 'stubble' | 'full'; hairColor: string };
  /** набор экипировки */
  gear?: 'street' | 'pro' | 'gang';
  /** лучшая серия недель, для экрана WASTED */
  lastStreak?: number;
  /** когда показывали WASTED в последний раз */
  wastedAt?: string;
  /** первый запуск: герой создан */
  created?: boolean;
  /** выбранный ИИ-тренер */
  coach?: CoachId;
  /** анкета для тренера */
  goal?: CoachGoal;
}

export interface AiNote { date: string; question?: string; text: string }

export type CoachId = 'bigt' | 'sarge' | 'ricky';
export interface CoachGoal {
  goal: 'strength' | 'mass' | 'cut' | 'general';
  days: number;            // тренировок в неделю
  place: 'gym' | 'home';
  sex: 'm' | 'f';
  limits?: string;         // травмы, ограничения
}
export interface PlanExercise { id: string; sets: number; reps: number | null; weight: number | null; seconds: number | null; rest: number; rir: number | null; note: string | null }
export interface CoachPlan { date: string; coach: CoachId; greeting: string; title: string; minutes: number; warmup: string; exercises: PlanExercise[]; progression: string; tip: string; workoutId?: string }
export interface ChatMsg { id: string; role: 'user' | 'assistant'; text: string; date: string; planDate?: string }

export interface AppState {
  version: 1;
  profile: Profile;
  customExercises: Exercise[];
  workouts: Workout[];
  bodyweight: BodyweightEntry[];
  achievements: UnlockedAchievement[];
  draft: Workout | null;
  aiNotes: AiNote[];
  coachChats: Partial<Record<CoachId, ChatMsg[]>>;
  coachPlans: CoachPlan[];   // последние задания, новые в конце
  program?: { id: 'fullbody3' | 'upperlower4' | 'ppl'; start: string };
}

export interface WorkoutSummary {
  workout: Workout;
  levelBefore: number;
  levelAfter: number;
  newAchievements: { id: string; xp: number }[];
  musclesWorked: MuscleId[];
}
