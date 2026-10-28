// Вход по данным Telegram Mini App.
// Проверяет подпись initData токеном бота, создаёт/находит профиль и выдаёт JWT Supabase.
// Секреты (supabase secrets set): BOT_TOKEN, JWT_SECRET (= JWT Secret проекта), DEV_LOGIN_SECRET (необязательно, для отладки в браузере)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
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
  const sig = hex(await hmac(secret, dataCheck));
  if (sig !== hash) return null;
  const authDate = Number(params.get('auth_date') || 0);
  if (Date.now() / 1000 - authDate > 60 * 60 * 24) return null; // старше суток
  const user = JSON.parse(params.get('user') || 'null');
  return user ? { id: Number(user.id), first_name: user.first_name as string, last_name: user.last_name as string | undefined, username: user.username as string | undefined } : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { initData, dev } = await req.json();
    const botToken = Deno.env.get('BOT_TOKEN') ?? '';
    const jwtSecret = Deno.env.get('JWT_SECRET') ?? '';
    let user: { id: number; first_name: string; last_name?: string; username?: string } | null = null;
    if (dev && Deno.env.get('DEV_LOGIN_SECRET') && dev.secret === Deno.env.get('DEV_LOGIN_SECRET')) {
      user = { id: Number(dev.id), first_name: dev.name || 'Dev' };
    } else {
      user = await verifyInitData(initData || '', botToken);
    }
    if (!user) return new Response(JSON.stringify({ error: 'bad initData' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').slice(0, 40) || 'Атлет';
    const { data: existing } = await admin.from('profiles').select('*').eq('tg_id', user.id).maybeSingle();
    let profile = existing;
    if (!profile) {
      const { data, error } = await admin.from('profiles').insert({ tg_id: user.id, name, username: user.username ?? null }).select('*').single();
      if (error) throw error; profile = data;
    } else if (user.username && profile.username !== user.username) {
      await admin.from('profiles').update({ username: user.username }).eq('id', profile.id);
    }

    const key = await crypto.subtle.importKey('raw', enc.encode(jwtSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    const token = await create({ alg: 'HS256', typ: 'JWT' }, { sub: profile.id, role: 'authenticated', aud: 'authenticated', tg_id: user.id, exp: getNumericDate(60 * 60 * 24 * 7) }, key);
    return new Response(JSON.stringify({ token, profile }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
