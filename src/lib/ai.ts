import Anthropic from '@anthropic-ai/sdk';

export const AI_MODEL = 'claude-opus-5-5';

const SYSTEM = `Ты — персональный тренер по силовым тренировкам и фитнесу внутри игрового приложения GymQuest.
Пользователь ведёт дневник тренировок; ты получаешь сводку его данных.
Отвечай по-русски, по делу, дружелюбно и конкретно: опирайся на цифры из сводки, называй упражнения и веса.
Структура ответа (используй короткие заголовки и списки, без таблиц):
1. Коротко: что идёт хорошо (1–3 пункта).
2. Что отстаёт или тревожит: мышцы, плато, частота, баланс.
3. План на следующие 1–2 недели: конкретные упражнения, веса/повторы, частота.
4. Один совет по восстановлению или питанию, если уместно.
Не ставь медицинских диагнозов; при боли советуй обратиться к врачу. Объём ответа — до 350 слов.`;

export interface CoachReply { text: string; model: string }

export const askCoach = async (apiKey: string, summary: string, question?: string, signal?: AbortSignal): Promise<CoachReply> => {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const user = question
    ? `Сводка моих тренировок:\n\n${summary}\n\nМой вопрос: ${question}`
    : `Сводка моих тренировок:\n\n${summary}\n\nПроанализируй мои тренировки и дай советы.`;

  const stream = client.beta.messages.stream(
    {
      model: AI_MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{ role: 'user', content: user }],
    },
    { signal },
  );
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') {
    throw new Error('Модель отказалась отвечать на этот запрос. Попробуй переформулировать вопрос.');
  }
  const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n').trim();
  if (!text) throw new Error('Пустой ответ от модели.');
  return { text, model: msg.model };
};

export const describeAiError = (e: unknown): string => {
  if (e instanceof Anthropic.AuthenticationError) return 'Неверный API-ключ. Проверь ключ в настройках.';
  if (e instanceof Anthropic.RateLimitError) return 'Слишком много запросов. Подожди минуту и попробуй снова.';
  if (e instanceof Anthropic.APIConnectionError) return 'Нет соединения с API. Проверь интернет.';
  if (e instanceof Anthropic.APIError) return `Ошибка API (${e.status ?? '?'}): ${e.message}`;
  if (e instanceof Error) return e.message;
  return 'Неизвестная ошибка';
};
