import type { Exercise } from '../types';

const ex = (
  id: string, name: string, category: Exercise['category'], kind: Exercise['kind'],
  primary: Exercise['primary'], secondary: Exercise['secondary'] = [],
): Exercise => ({ id, name, category, kind, primary, secondary });

export const BASE_EXERCISES: Exercise[] = [
  // Грудь
  ex('bench', 'Жим лёжа', 'chest', 'weight', ['chest'], ['triceps', 'front_delts']),
  ex('incline_bench', 'Жим на наклонной', 'chest', 'weight', ['chest'], ['front_delts', 'triceps']),
  ex('db_bench', 'Жим гантелей лёжа', 'chest', 'weight', ['chest'], ['triceps', 'front_delts']),
  ex('dips', 'Отжимания на брусьях', 'chest', 'bodyweight', ['chest', 'triceps'], ['front_delts']),
  ex('pushups', 'Отжимания от пола', 'chest', 'bodyweight', ['chest'], ['triceps', 'front_delts']),
  ex('flyes', 'Разводка гантелей', 'chest', 'weight', ['chest'], []),
  ex('cable_cross', 'Сведения в кроссовере', 'chest', 'weight', ['chest'], []),
  // Спина
  ex('deadlift', 'Становая тяга', 'back', 'weight', ['lower_back', 'glutes', 'hamstrings'], ['upper_back', 'lats', 'forearms']),
  ex('pullups', 'Подтягивания', 'back', 'bodyweight', ['lats'], ['biceps', 'upper_back']),
  ex('barbell_row', 'Тяга штанги в наклоне', 'back', 'weight', ['lats', 'upper_back'], ['biceps', 'lower_back']),
  ex('db_row', 'Тяга гантели одной рукой', 'back', 'weight', ['lats'], ['upper_back', 'biceps']),
  ex('lat_pulldown', 'Тяга верхнего блока', 'back', 'weight', ['lats'], ['biceps']),
  ex('seated_row', 'Тяга горизонтального блока', 'back', 'weight', ['upper_back', 'lats'], ['biceps']),
  ex('tbar_row', 'Тяга Т-грифа', 'back', 'weight', ['upper_back', 'lats'], ['biceps']),
  ex('hyperext', 'Гиперэкстензия', 'back', 'bodyweight', ['lower_back'], ['glutes', 'hamstrings']),
  ex('shrugs', 'Шраги', 'back', 'weight', ['upper_back'], ['forearms']),
  // Ноги
  ex('squat', 'Приседания со штангой', 'legs', 'weight', ['quads', 'glutes'], ['hamstrings', 'lower_back']),
  ex('front_squat', 'Фронтальные приседания', 'legs', 'weight', ['quads'], ['glutes', 'abs']),
  ex('leg_press', 'Жим ногами', 'legs', 'weight', ['quads', 'glutes'], ['hamstrings']),
  ex('rdl', 'Румынская тяга', 'legs', 'weight', ['hamstrings', 'glutes'], ['lower_back']),
  ex('lunges', 'Выпады', 'legs', 'weight', ['quads', 'glutes'], ['hamstrings']),
  ex('leg_ext', 'Разгибания ног', 'legs', 'weight', ['quads'], []),
  ex('leg_curl', 'Сгибания ног', 'legs', 'weight', ['hamstrings'], []),
  ex('hip_thrust', 'Ягодичный мост', 'legs', 'weight', ['glutes'], ['hamstrings']),
  ex('calf_raise', 'Подъёмы на носки', 'legs', 'weight', ['calves'], []),
  ex('bulgarian', 'Болгарские выпады', 'legs', 'weight', ['quads', 'glutes'], ['hamstrings']),
  // Плечи
  ex('ohp', 'Жим стоя (армейский)', 'shoulders', 'weight', ['front_delts', 'side_delts'], ['triceps', 'abs']),
  ex('db_shoulder_press', 'Жим гантелей сидя', 'shoulders', 'weight', ['front_delts', 'side_delts'], ['triceps']),
  ex('lateral_raise', 'Махи в стороны', 'shoulders', 'weight', ['side_delts'], []),
  ex('rear_delt_fly', 'Махи в наклоне', 'shoulders', 'weight', ['rear_delts'], ['upper_back']),
  ex('face_pull', 'Тяга к лицу', 'shoulders', 'weight', ['rear_delts', 'upper_back'], []),
  ex('upright_row', 'Протяжка', 'shoulders', 'weight', ['side_delts', 'upper_back'], ['biceps']),
  // Руки
  ex('bb_curl', 'Подъём штанги на бицепс', 'arms', 'weight', ['biceps'], ['forearms']),
  ex('db_curl', 'Подъём гантелей на бицепс', 'arms', 'weight', ['biceps'], ['forearms']),
  ex('hammer_curl', 'Молотки', 'arms', 'weight', ['biceps', 'forearms'], []),
  ex('close_bench', 'Жим узким хватом', 'arms', 'weight', ['triceps'], ['chest', 'front_delts']),
  ex('triceps_pushdown', 'Разгибания на блоке', 'arms', 'weight', ['triceps'], []),
  ex('skull_crusher', 'Французский жим', 'arms', 'weight', ['triceps'], []),
  ex('wrist_curl', 'Сгибания запястий', 'arms', 'weight', ['forearms'], []),
  // Кор
  ex('plank', 'Планка', 'core', 'time', ['abs'], ['obliques']),
  ex('crunches', 'Скручивания', 'core', 'bodyweight', ['abs'], []),
  ex('leg_raise', 'Подъём ног в висе', 'core', 'bodyweight', ['abs'], ['forearms']),
  ex('russian_twist', 'Русские скручивания', 'core', 'bodyweight', ['obliques'], ['abs']),
  ex('ab_wheel', 'Ролик для пресса', 'core', 'bodyweight', ['abs'], ['obliques', 'lats']),
  ex('side_plank', 'Боковая планка', 'core', 'time', ['obliques'], ['abs']),
  // Кардио
  ex('run', 'Бег', 'cardio', 'cardio', ['cardio'], ['quads', 'calves']),
  ex('bike', 'Велотренажёр', 'cardio', 'cardio', ['cardio'], ['quads']),
  ex('rowing', 'Гребля', 'cardio', 'cardio', ['cardio'], ['lats', 'quads']),
  ex('jump_rope', 'Скакалка', 'cardio', 'cardio', ['cardio'], ['calves']),
  ex('walk', 'Ходьба', 'cardio', 'cardio', ['cardio'], []),
  ex('swim', 'Плавание', 'cardio', 'cardio', ['cardio'], ['lats', 'upper_back']),
];

/** Ключевые упражнения для статов героя и достижений */
export const BIG_LIFTS = { bench: 'Жим', squat: 'Присед', deadlift: 'Тяга' } as const;
