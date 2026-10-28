// Вход по данным Telegram Mini App.
// Проверяет подпись initData токеном бота, создаёт/находит пользователя Supabase Auth и профиль,
// выдаёт сессию через magic-link без отправки писем.
// Секреты (supabase secrets set): BOT_TOKEN. Необязательно: DEV_LOGIN_SECRET для отладки в браузере.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const enc = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

/** Проверка initData по алгоритму Telegram */
async function verifyInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash'); if (!hash) return null;
  params.delete('hash');
  const dataCheck = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = await hmac(enc.encode('WebAppData'), botToken);
  if (hex(await hmac(secret, dataCheck)) !== hash) return null;
  const authDate = Number(params.get('auth_date') || 0);
  if (Date.now() / 1000 - authDate > 60 * 60 * 24) return null;
  const user = JSON.parse(params.get('user') || 'null');
  return user ? { id: Number(user.id), first_name: String(user.first_name ?? ''), last_name: user.last_name as string | undefined, username: user.username as string | undefined } : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { initData, dev } = await req.json();
    const botToken = Deno.env.get('BOT_TOKEN') ?? '';
    let user: { id: number; first_name: string; last_name?: string; username?: string } | null = null;
    const devSecret = Deno.env.get('DEV_LOGIN_SECRET');
    if (dev && devSecret && dev.secret === devSecret) user = { id: Number(dev.id), first_name: dev.name || 'Dev' };
    else user = await verifyInitData(initData || '', botToken);
    if (!user) return json({ error: 'bad initData' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const email = `tg_${user.id}@gymquest.local`;
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').slice(0, 40) || 'Атлет';

    // пользователь Auth: создать, если нет
    let uid: string | undefined;
    const created = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { tg_id: user.id, name } });
    if (created.data.user) uid = created.data.user.id;
    else {
      const { data: prof } = await admin.from('profiles').select('id').eq('tg_id', user.id).maybeSingle();
      uid = prof?.id;
      if (!uid) { // пользователь есть, профиля нет: ищем по email
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        uid = list?.users.find((u) => u.email === email)?.id;
      }
    }
    if (!uid) throw new Error('auth user not found');

    // профиль
    const { data: existing } = await admin.from('profiles').select('*').eq('id', uid).maybeSingle();
    let profile = existing;
    if (!profile) {
      const { data, error } = await admin.from('profiles').insert({ id: uid, tg_id: user.id, name, username: user.username ?? null }).select('*').single();
      if (error) throw error; profile = data;
    } else if (user.username && profile.username !== user.username) await admin.from('profiles').update({ username: user.username }).eq('id', uid);

    // сессия через magic-link без письма
    const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (link.error) throw link.error;
    const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
    const verified = await anon.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'magiclink' });
    if (verified.error || !verified.data.session) throw verified.error ?? new Error('no session');
    return json({ token: verified.data.session.access_token, profile });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
