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

export interface Workout {
  id: string;
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
}

export interface AiNote { date: string; question?: string; text: string }

export interface AppState {
  version: 1;
  profile: Profile;
  customExercises: Exercise[];
  workouts: Workout[];
  bodyweight: BodyweightEntry[];
  achievements: UnlockedAchievement[];
  draft: Workout | null;
  aiNotes: AiNote[];
}

export interface WorkoutSummary {
  workout: Workout;
  levelBefore: number;
  levelAfter: number;
  newAchievements: { id: string; xp: number }[];
  musclesWorked: MuscleId[];
}
