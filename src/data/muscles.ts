import type { Category, MuscleId } from '../types';

export const MUSCLES: Record<MuscleId, { name: string; short: string; group: Category }> = {
  chest:       { name: 'Грудь', short: 'Грудь', group: 'chest' },
  lats:        { name: 'Широчайшие', short: 'Широч.', group: 'back' },
  upper_back:  { name: 'Верх спины / трапеции', short: 'Верх спины', group: 'back' },
  lower_back:  { name: 'Поясница', short: 'Поясница', group: 'back' },
  front_delts: { name: 'Передние дельты', short: 'Перед. дельты', group: 'shoulders' },
  side_delts:  { name: 'Средние дельты', short: 'Сред. дельты', group: 'shoulders' },
  rear_delts:  { name: 'Задние дельты', short: 'Задн. дельты', group: 'shoulders' },
  biceps:      { name: 'Бицепс', short: 'Бицепс', group: 'arms' },
  triceps:     { name: 'Трицепс', short: 'Трицепс', group: 'arms' },
  forearms:    { name: 'Предплечья', short: 'Предпл.', group: 'arms' },
  abs:         { name: 'Пресс', short: 'Пресс', group: 'core' },
  obliques:    { name: 'Косые мышцы', short: 'Косые', group: 'core' },
  glutes:      { name: 'Ягодицы', short: 'Ягодицы', group: 'legs' },
  quads:       { name: 'Квадрицепсы', short: 'Квадры', group: 'legs' },
  hamstrings:  { name: 'Бицепс бедра', short: 'Биц. бедра', group: 'legs' },
  calves:      { name: 'Икры', short: 'Икры', group: 'legs' },
  cardio:      { name: 'Сердце (кардио)', short: 'Кардио', group: 'cardio' },
};

export const MUSCLE_IDS = Object.keys(MUSCLES) as MuscleId[];
export const STRENGTH_MUSCLES = MUSCLE_IDS.filter((m) => m !== 'cardio');

export const CATEGORIES: Record<Category, { name: string; icon: string }> = {
  chest:     { name: 'Грудь', icon: '🛡️' },
  back:      { name: 'Спина', icon: '🦅' },
  legs:      { name: 'Ноги', icon: '🦵' },
  shoulders: { name: 'Плечи', icon: '⛰️' },
  arms:      { name: 'Руки', icon: '💪' },
  core:      { name: 'Кор', icon: '🔥' },
  cardio:    { name: 'Кардио', icon: '🏃' },
  other:     { name: 'Другое', icon: '✨' },
};

export const CATEGORY_ORDER: Category[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'];
