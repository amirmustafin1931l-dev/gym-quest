// Общий ИИ-тренер: переписка и задание на день.
// Секреты: ANTHROPIC_API_KEY; необязательно COACH_CHAT_LIMIT (по умолчанию 30) и COACH_PLAN_LIMIT (по умолчанию 2).
import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@1';
import { PLAN_SCHEMA, chatPrompt, isPersona, personaName, planPrompt, type PersonaId } from './personas.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const MODEL = 'claude-opus-5-5';

type Msg = { role: 'user' | 'assistant'; content: string };
interface Body { mode?: 'check' | 'chat' | 'plan'; persona?: string; summary?: string; messages?: Msg[]; catalog?: { id: string; name: string; kind: string }[] }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const limits = { chat: Number(Deno.env.get('COACH_CHAT_LIMIT') || 30), plan: Number(Deno.env.get('COACH_PLAN_LIMIT') || 2) };

  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: who, error: whoErr } = await admin.auth.getUser(jwt);
  if (whoErr || !who.user) return json({ error: 'Нужен вход через Telegram' }, 401);
  const uid = who.user.id;

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const mode = body.mode ?? 'check';

  if (mode === 'check') {
    const { data } = await admin.from('coach_usage').select('kind,calls').eq('user_id', uid).eq('day', new Date().toISOString().slice(0, 10));
    const used = (k: string) => data?.find((r) => r.kind === k)?.calls ?? 0;
    return json({ ready: !!Deno.env.get('ANTHROPIC_API_KEY'), chatLeft: Math.max(0, limits.chat - used('chat')), planLeft: Math.max(0, limits.plan - used('plan')), limits });
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'Тренер ещё не подключён: на сервере нет ключа Anthropic' }, 503);
  const persona: PersonaId = isPersona(body.persona) ? body.persona : 'bigt';
  const summary = String(body.summary || '').slice(0, 20000);
  const kind = mode === 'plan' ? 'plan' : 'chat';

  const { data: left, error: limErr } = await admin.rpc('coach_consume', { p_user: uid, p_kind: kind, p_limit: limits[kind] });
  if (limErr) return json({ error: String(limErr.message) }, 500);
  if (left === -1) return json({ error: kind === 'plan' ? 'Задание на сегодня уже выдано. Новое — завтра.' : `Тренер устал: лимит ${limits.chat} сообщений в день. Пиши завтра.` }, 429);

  const client = new Anthropic({ apiKey });
  try {
    if (mode === 'plan') {
      const catalog = (body.catalog ?? []).slice(0, 200).map((e) => `${e.id} — ${e.name} — ${e.kind}`).join('\n');
      const ids = new Set((body.catalog ?? []).map((e) => e.id));
      const msg = await client.beta.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        system: planPrompt(persona, summary, catalog),
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high', format: { type: 'json_schema', schema: PLAN_SCHEMA as unknown as Record<string, unknown> } },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages: [{ role: 'user', content: 'Составь задание на сегодня.' }],
      }).finalMessage();
      if (msg.stop_reason === 'refusal') throw new Error('Тренер не смог составить задание. Попробуй ещё раз.');
      if (msg.stop_reason === 'max_tokens') throw new Error('Ответ тренера оборвался. Попробуй ещё раз.');
      const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
      const plan = JSON.parse(text);
      plan.exercises = (plan.exercises ?? []).filter((e: { id: string }) => ids.has(e.id));
      if (!plan.exercises.length) throw new Error('Тренер ошибся в упражнениях. Попробуй ещё раз.');
      return json({ plan, persona: personaName(persona), left });
    }

    const history = (body.messages ?? []).filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content).slice(-20)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));
    while (history.length && history[0].role !== 'user') history.shift();
    if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'Нет сообщения' }, 400);
    const msg = await client.beta.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      system: chatPrompt(persona, summary),
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: history,
    }).finalMessage();
    if (msg.stop_reason === 'refusal') throw new Error('Тренер не стал отвечать на это. Спроси по-другому.');
    const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n').trim();
    if (!text) throw new Error('Пустой ответ');
    return json({ text, persona: personaName(persona), left });
  } catch (e) {
    await admin.rpc('coach_refund', { p_user: uid, p_kind: kind });
    const status = e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.AuthenticationError ? 503 : 500;
    const message = e instanceof Anthropic.AuthenticationError ? 'Ключ Anthropic на сервере неверный'
      : e instanceof Anthropic.RateLimitError ? 'Тренер занят, попробуй через минуту'
      : String((e as Error).message ?? e);
    return json({ error: message }, status);
  }
});
