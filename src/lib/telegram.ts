/* Обёртка над Telegram WebApp SDK с запасным режимом для обычного браузера */

interface TgCloudStorage {
  setItem(key: string, value: string, cb?: (err: unknown, ok?: boolean) => void): void;
  getItem(key: string, cb: (err: unknown, value?: string) => void): void;
  getItems(keys: string[], cb: (err: unknown, values?: Record<string, string>) => void): void;
  removeItems(keys: string[], cb?: (err: unknown, ok?: boolean) => void): void;
  getKeys(cb: (err: unknown, keys?: string[]) => void): void;
}

interface TgWebApp {
  ready(): void;
  expand(): void;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  initDataUnsafe?: { user?: { first_name?: string; last_name?: string; username?: string } };
  CloudStorage?: TgCloudStorage;
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  };
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  disableVerticalSwipes?(): void;
  onEvent?(event: string, cb: () => void): void;
  version?: string;
  platform?: string;
  isVersionAtLeast?(v: string): boolean;
}

declare global {
  interface Window { Telegram?: { WebApp?: TgWebApp } }
}

export const tg: TgWebApp | undefined = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
export const inTelegram = !!tg && !!tg.initDataUnsafe && Object.keys(tg.themeParams ?? {}).length > 0;

export const initTelegram = () => {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    tg.setHeaderColor?.('#0d0c0b');
    tg.setBackgroundColor?.('#0d0c0b');
  } catch { /* старые клиенты */ }
};

export const tgUserName = () => {
  const u = tg?.initDataUnsafe?.user;
  return u?.first_name ? `${u.first_name}${u.last_name ? ' ' + u.last_name : ''}` : '';
};

export const haptic = (kind: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') => {
  try {
    if (kind === 'success' || kind === 'error' || kind === 'warning') tg?.HapticFeedback?.notificationOccurred(kind);
    else tg?.HapticFeedback?.impactOccurred(kind);
  } catch { /* ignore */ }
};

/* ---------- Облачное хранилище Telegram (лимит 4096 байт на ключ, 1024 ключа) ---------- */

const CHUNK = 3800;
const META_KEY = 'gq_meta';
const chunkKey = (i: number) => `gq_${i}`;

const cloud = () => (inTelegram && tg?.isVersionAtLeast?.('6.9') ? tg?.CloudStorage : undefined);
export const cloudAvailable = () => !!cloud();

const p = <T,>(fn: (cb: (err: unknown, v?: T) => void) => void) =>
  new Promise<T | undefined>((res, rej) => fn((err, v) => (err ? rej(err) : res(v))));

export interface CloudMeta { chunks: number; savedAt: string; bytes: number }

export const cloudSave = async (json: string): Promise<CloudMeta> => {
  const cs = cloud();
  if (!cs) throw new Error('CloudStorage недоступен');
  const chunks: string[] = [];
  for (let i = 0; i < json.length; i += CHUNK) chunks.push(json.slice(i, i + CHUNK));
  if (chunks.length > 1000) throw new Error('Данные слишком большие для облака Telegram');
  for (let i = 0; i < chunks.length; i++) await p<boolean>((cb) => cs.setItem(chunkKey(i), chunks[i], cb));
  const meta: CloudMeta = { chunks: chunks.length, savedAt: new Date().toISOString(), bytes: json.length };
  await p<boolean>((cb) => cs.setItem(META_KEY, JSON.stringify(meta), cb));
  // удалить хвост от прошлого, более крупного бэкапа
  const keys = (await p<string[]>((cb) => cs.getKeys(cb))) ?? [];
  const stale = keys.filter((k) => /^gq_\d+$/.test(k) && Number(k.slice(3)) >= chunks.length);
  if (stale.length) await p<boolean>((cb) => cs.removeItems(stale, cb));
  return meta;
};

export const cloudMeta = async (): Promise<CloudMeta | null> => {
  const cs = cloud();
  if (!cs) return null;
  const raw = await p<string>((cb) => cs.getItem(META_KEY, cb));
  if (!raw) return null;
  try { return JSON.parse(raw) as CloudMeta; } catch { return null; }
};

export const cloudLoad = async (): Promise<string | null> => {
  const cs = cloud();
  if (!cs) return null;
  const meta = await cloudMeta();
  if (!meta) return null;
  const keys = Array.from({ length: meta.chunks }, (_, i) => chunkKey(i));
  const values = (await p<Record<string, string>>((cb) => cs.getItems(keys, cb))) ?? {};
  const parts = keys.map((k) => values[k] ?? '');
  if (parts.some((x) => !x)) throw new Error('Бэкап в облаке повреждён');
  return parts.join('');
};
