import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from './store';
import { buildSnapshot, createSocial, socialMode, type Metric, type RemoteProfile, type SocialApi } from './lib/social';
import { tgStartParam } from './lib/telegram';
import { toast } from './lib/toast';

export type SocialStatus = 'off' | 'connecting' | 'online' | 'error';
interface Social {
  mode: ReturnType<typeof socialMode>; status: SocialStatus; error?: string;
  me: RemoteProfile | null; friends: RemoteProfile[];
  refresh: () => Promise<void>;
  list: (scope: 'friends' | 'global' | 'week', metric: Metric) => Promise<RemoteProfile[]>;
  addFriendByTg: (tg: number) => Promise<RemoteProfile | null>;
  removeFriend: (id: string) => Promise<void>;
}
const Ctx = createContext<Social | null>(null);

export const SocialProvider = ({ children }: { children: ReactNode }) => {
  const { state, exMap } = useStore();
  const api = useMemo<SocialApi | null>(() => createSocial(), []);
  const mode = socialMode();
  const [status, setStatus] = useState<SocialStatus>(api ? 'connecting' : 'off');
  const [error, setError] = useState<string | undefined>();
  const [me, setMe] = useState<RemoteProfile | null>(null);
  const [friends, setFriends] = useState<RemoteProfile[]>([]);
  const snapshot = useMemo(() => buildSnapshot(state, exMap), [state, exMap]);
  const snapRef = useRef(snapshot); snapRef.current = snapshot;

  const refresh = useCallback(async () => { if (!api || status !== 'online') return; try { setFriends(await api.friends()); } catch (e) { setError(String((e as Error).message)); } }, [api, status]);

  useEffect(() => {
    if (!api) return;
    let alive = true;
    (async () => {
      try {
        const p = await api.connect(); if (!alive) return;
        await api.sync(snapRef.current).catch(() => null);
        setMe({ ...p, ...snapRef.current }); setStatus('online');
        const sp = tgStartParam(); const m = /^f_(\d+)$/.exec(sp);
        if (m) { const f = await api.addFriendByTg(Number(m[1])).catch(() => null); if (f) toast(`${f.name} теперь в твоей банде`); }
        setFriends(await api.friends());
      } catch (e) { if (alive) { setStatus('error'); setError((e as Error).message); } }
    })();
    return () => { alive = false; };
  }, [api]);

  // Синхронизация снимка после изменений
  const key = JSON.stringify(snapshot);
  useEffect(() => {
    if (!api || status !== 'online') return;
    const t = setTimeout(() => api.sync(snapshot).then(() => setMe((m) => (m ? { ...m, ...snapshot } : m))).catch(() => null), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, status, api]);

  const value = useMemo<Social>(() => ({
    mode, status, error, me, friends, refresh,
    list: async (scope, metric) => {
      if (!api || status !== 'online') return [];
      const rows = scope === 'friends' ? [...(await api.friends()), ...(me ? [me] : [])] : scope === 'global' ? await api.global(metric) : await api.week();
      const val = (p: RemoteProfile) => scope === 'week' ? p.week.xp : metric === 'xp' ? p.xp : metric === 'tonnage' ? p.tonnage : metric === 'streak' ? p.streak : (p.bests[metric] ?? 0);
      const seen = new Set<string>();
      return rows.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).sort((a, b) => val(b) - val(a));
    },
    addFriendByTg: async (tg) => { if (!api) return null; const f = await api.addFriendByTg(tg); await refresh(); return f; },
    removeFriend: async (id) => { if (!api) return; await api.removeFriend(id); await refresh(); },
  }), [mode, status, error, me, friends, refresh, api]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
export const useSocial = () => { const s = useContext(Ctx); if (!s) throw new Error('SocialProvider missing'); return s; };
