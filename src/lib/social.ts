/* Мультиплеер: снимок героя, адаптеры Supabase и демо-режима */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppState, MuscleId } from '../types';
import type { ExerciseMap } from './stats';
import { exerciseBests, exerciseHistory, totals, weekStreak, workoutMuscles } from './stats';
import { levelFromXp } from './xp';
import { DEFAULT_LOOK, type GearId, type Look, bulkFromLevel, STAGE_NAMES, stageOf } from './figure';
import { startOfWeek, dayKey } from './dates';
import { tgInitData, tgUserId } from './telegram';

export interface Snapshot {
  name: string; look: Look; gear: GearId; xp: number; level: number; tonnage: number; workouts: number; streak: number; prs: number; trophies: number;
  bests: { bench?: number; squat?: number; deadlift?: number; pullups?: number };
  week: { start: string; xp: number; tonnage: number; workouts: number };
  last_workout_at: string | null; last_muscles: string[];
}
export interface RemoteProfile extends Snapshot { id: string; tg_id: number; username?: string | null; updated_at?: string }
export type Metric = 'xp' | 'tonnage' | 'streak' | 'bench' | 'squat' | 'deadlift';
export const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: 'xp', label: 'Respect', unit: 'rp' }, { id: 'tonnage', label: 'Тоннаж', unit: 'кг' }, { id: 'streak', label: 'Серия', unit: 'нед' },
  { id: 'bench', label: 'Жим', unit: 'кг' }, { id: 'squat', label: 'Присед', unit: 'кг' }, { id: 'deadlift', label: 'Тяга', unit: 'кг' },
];
export const metricValue = (p: Snapshot, m: Metric) => (m === 'xp' ? p.xp : m === 'tonnage' ? p.tonnage : m === 'streak' ? p.streak : (p.bests[m] ?? 0));
export const titleOf = (level: number) => STAGE_NAMES[stageOf(bulkFromLevel(level)) - 1];

export const buildSnapshot = (state: AppState, ex: ExerciseMap): Snapshot => {
  const t = totals(state.workouts, ex);
  const lvl = levelFromXp(state.profile.xp);
  const ws = startOfWeek(new Date());
  const weekW = state.workouts.filter((w) => new Date(w.date) >= ws);
  const bestOf = (id: string) => { const d = ex.get(id); if (!d) return undefined; const b = exerciseBests(exerciseHistory(state.workouts, id, d)); return b.maxWeight || undefined; };
  const last = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    name: state.profile.name || 'Атлет', look: { ...DEFAULT_LOOK, ...(state.profile.look || {}) }, gear: state.profile.gear || 'street',
    xp: state.profile.xp, level: lvl.level, tonnage: Math.round(t.tonnage), workouts: t.workouts, streak: weekStreak(state.workouts), prs: t.prs, trophies: state.achievements.length,
    bests: { bench: bestOf('bench'), squat: bestOf('squat'), deadlift: bestOf('deadlift'), pullups: (() => { const d = ex.get('pullups'); return d ? exerciseBests(exerciseHistory(state.workouts, 'pullups', d)).maxReps || undefined : undefined; })() },
    week: { start: dayKey(ws), xp: weekW.reduce((a, w) => a + w.xp, 0), tonnage: Math.round(weekW.reduce((a, w) => a + w.entries.reduce((s, e) => s + e.sets.reduce((q, st) => q + (st.weight ?? 0) * (st.reps ?? 0), 0), 0), 0)), workouts: weekW.length },
    last_workout_at: last ? last.date : null, last_muscles: last ? (workoutMuscles(last, ex) as MuscleId[]).slice(0, 6) : [],
  };
};

export interface SocialApi {
  connect(): Promise<RemoteProfile>;
  sync(s: Snapshot): Promise<void>;
  friends(): Promise<RemoteProfile[]>;
  global(metric: Metric): Promise<RemoteProfile[]>;
  week(): Promise<RemoteProfile[]>;
  addFriendByTg(tg: number): Promise<RemoteProfile | null>;
  removeFriend(id: string): Promise<void>;
}

const env = import.meta.env as Record<string, string | undefined>;
export const SUPABASE_URL = env.VITE_SUPABASE_URL; export const SUPABASE_ANON = env.VITE_SUPABASE_ANON_KEY;
export const BOT_NAME = env.VITE_BOT_NAME || 'gymquest_game_bot'; export const APP_NAME = env.VITE_APP_NAME || '';
/** Главный Mini App бота: t.me/<бот>?startapp=…; именованный: t.me/<бот>/<app>?startapp=… */
export const inviteLink = (tgId: number) => `https://t.me/${BOT_NAME}${APP_NAME ? '/' + APP_NAME : ''}?startapp=f_${tgId}`;
export const socialMode = (): 'supabase' | 'mock' | 'off' => (env.VITE_SOCIAL_MOCK ? 'mock' : SUPABASE_URL && SUPABASE_ANON ? 'supabase' : 'off');

const METRIC_COL: Record<Metric, string> = { xp: 'xp', tonnage: 'tonnage', streak: 'streak', bench: 'bests->bench', squat: 'bests->squat', deadlift: 'bests->deadlift' };

class SupabaseSocial implements SocialApi {
  private client: SupabaseClient | null = null; me: RemoteProfile | null = null;
  async connect() {
    const dev = env.VITE_DEV_LOGIN_SECRET ? { secret: env.VITE_DEV_LOGIN_SECRET, id: Number(localStorage.getItem('gq_dev_tg') || (Math.floor(Math.random() * 1e6) + 1)), name: 'Dev' } : undefined;
    if (dev) localStorage.setItem('gq_dev_tg', String(dev.id));
    const r = await fetch(`${SUPABASE_URL}/functions/v1/tg-auth`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON! }, body: JSON.stringify({ initData: tgInitData(), dev }) });
    if (!r.ok) throw new Error(`Вход не удался (${r.status})`);
    const { token, profile } = await r.json();
    this.client = createClient(SUPABASE_URL!, SUPABASE_ANON!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    this.me = profile; return profile;
  }
  private c() { if (!this.client) throw new Error('Нет соединения'); return this.client; }
  async sync(s: Snapshot) { if (!this.me) return; const { error } = await this.c().from('profiles').update({ ...s, updated_at: new Date().toISOString() }).eq('id', this.me.id); if (error) throw error; this.me = { ...this.me, ...s }; }
  async friends() { const { data, error } = await this.c().rpc('my_friends'); if (error) throw error; return (data ?? []) as RemoteProfile[]; }
  async global(metric: Metric) { const { data, error } = await this.c().from('profiles').select('*').order(METRIC_COL[metric], { ascending: false, nullsFirst: false }).limit(50); if (error) throw error; return (data ?? []) as RemoteProfile[]; }
  async week() { const { data, error } = await this.c().from('profiles').select('*').eq('week->>start', dayKey(startOfWeek(new Date()))).order('week->xp', { ascending: false }).limit(50); if (error) throw error; return (data ?? []) as RemoteProfile[]; }
  async addFriendByTg(tg: number) { const { data, error } = await this.c().rpc('add_friend_by_tg', { friend_tg: tg }); if (error) throw error; return (data as RemoteProfile) ?? null; }
  async removeFriend(id: string) { const { error } = await this.c().rpc('remove_friend', { friend: id }); if (error) throw error; }
}

/** Демо-режим: выдуманная банда, чтобы посмотреть экраны без сервера */
class MockSocial implements SocialApi {
  me: RemoteProfile | null = null;
  private all: RemoteProfile[];
  constructor() {
    const mk = (i: number, name: string, level: number, gear: GearId, look: Partial<Look>, bench: number, squat: number, dead: number, streak: number): RemoteProfile => ({
      id: `mock-${i}`, tg_id: 1000 + i, name, look: { ...DEFAULT_LOOK, ...look }, gear, xp: Math.round(120 * Math.pow(level, 1.9)), level, tonnage: level * 420 + i * 37, workouts: level * 6, streak, prs: level * 2, trophies: Math.min(52, level + 3),
      bests: { bench, squat, deadlift: dead }, week: { start: dayKey(startOfWeek(new Date())), xp: (i * 137) % 600, tonnage: (i * 911) % 4000, workouts: i % 4 }, last_workout_at: new Date(Date.now() - i * 36e5 * 7).toISOString(), last_muscles: ['chest', 'triceps'],
    });
    this.all = [mk(1, 'Дима', 24, 'gang', { skin: 'brown', hair: 'bald', beard: 'full' }, 120, 170, 200, 5), mk(2, 'Лёха', 19, 'pro', { skin: 'light', hair: 'short' }, 100, 140, 180, 3), mk(3, 'Саша', 15, 'street', { skin: 'tan', hair: 'mohawk', beard: 'stubble' }, 90, 120, 150, 2), mk(4, 'Марк', 9, 'pro', { skin: 'dark', hair: 'afro' }, 70, 100, 120, 1), mk(5, 'Ваня', 7, 'gang', { skin: 'light', hair: 'long' }, 60, 80, 100, 0), mk(6, 'Кирилл', 6, 'street', { skin: 'tan', hair: 'short', beard: 'full' }, 55, 70, 90, 1)];
  }
  private friendIds(): string[] { try { return JSON.parse(localStorage.getItem('gq_mock_friends') || '["mock-1","mock-2","mock-3"]'); } catch { return []; } }
  async connect() { this.me = { id: 'me', tg_id: tgUserId() ?? 7731, name: 'Я', look: DEFAULT_LOOK, gear: 'street', xp: 0, level: 1, tonnage: 0, workouts: 0, streak: 0, prs: 0, trophies: 0, bests: {}, week: { start: dayKey(startOfWeek(new Date())), xp: 0, tonnage: 0, workouts: 0 }, last_workout_at: null, last_muscles: [] }; return this.me; }
  async sync(s: Snapshot) { if (this.me) this.me = { ...this.me, ...s }; }
  async friends() { const ids = this.friendIds(); return this.all.filter((p) => ids.includes(p.id)); }
  async global() { return [...this.all, ...(this.me ? [this.me] : [])]; }
  async week() { return [...this.all, ...(this.me ? [this.me] : [])]; }
  async addFriendByTg(tg: number) { const p = this.all.find((x) => x.tg_id === tg); if (!p) return null; localStorage.setItem('gq_mock_friends', JSON.stringify([...new Set([...this.friendIds(), p.id])])); return p; }
  async removeFriend(id: string) { localStorage.setItem('gq_mock_friends', JSON.stringify(this.friendIds().filter((x) => x !== id))); }
}

export const createSocial = (): SocialApi | null => { const m = socialMode(); return m === 'mock' ? new MockSocial() : m === 'supabase' ? new SupabaseSocial() : null; };
