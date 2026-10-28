import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import { Card } from '../components/ui';
import { buildSummary, buildTips } from '../lib/advice';
import { askCoach, describeAiError, AI_MODEL } from '../lib/ai';
import { fmtDateTime } from '../lib/dates';
import { haptic } from '../lib/telegram';

/** Лёгкий рендер markdown-подобного текста модели */
const renderAi = (text: string): ReactNode => {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { out.push(<ul key={out.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>); list = []; } };
  lines.forEach((raw) => {
    const l = raw.trim();
    if (!l) { flush(); return; }
    if (/^#{1,4}\s/.test(l)) { flush(); out.push(<h4 key={out.length}>{inline(l.replace(/^#+\s/, ''))}</h4>); return; }
    if (/^(\d+[.)]|[-*•])\s/.test(l) && /^(\d+[.)])\s/.test(l) && l.length < 60 && l.endsWith(':')) { flush(); out.push(<h4 key={out.length}>{inline(l.replace(/^\d+[.)]\s/, ''))}</h4>); return; }
    if (/^[-*•]\s/.test(l)) { list.push(l.replace(/^[-*•]\s/, '')); return; }
    flush(); out.push(<p key={out.length}>{inline(l)}</p>);
  });
  flush();
  return out;
};
const inline = (s: string): ReactNode => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part);

export const CoachScreen = ({ onSettings }: { onSettings: () => void }) => {
  const { state, exMap, dispatch, checkAchievements } = useStore();
  const tips = useMemo(() => buildTips(state, exMap), [state, exMap]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const key = state.profile.apiKey?.trim();

  const run = async (question?: string) => {
    if (!key) { onSettings(); return; }
    setBusy(true); setErr(null);
    abort.current?.abort();
    abort.current = new AbortController();
    try {
      const summary = buildSummary(state, exMap);
      const r = await askCoach(key, summary, question, abort.current.signal);
      dispatch({ type: 'addAiNote', note: { date: new Date().toISOString(), question, text: r.text } });
      setQ('');
      haptic('success');
      setTimeout(checkAchievements, 0);
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setErr(describeAiError(e));
      haptic('error');
    } finally { setBusy(false); }
  };

  return (
    <div className="screen">
      <h1 style={{ fontSize: 20 }}>Тренер</h1>

      <Card title="Наблюдения" right={<span className="small muted">по правилам, офлайн</span>}>
        <div className="stack">
          {tips.map((t, i) => (
            <div key={i} className={`tip ${t.kind}`}>
              <span className="ic">{t.icon}</span>
              <div><div className="t">{t.title}</div><div className="small text-2">{t.text}</div></div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="🧙 ИИ-тренер" right={<span className="tiny muted">{AI_MODEL}</span>}>
        {!key ? (
          <div className="stack">
            <p className="small text-2">Чтобы ИИ анализировал тренировки и давал персональные советы, добавь API-ключ Anthropic в настройках. Ключ хранится только на твоём устройстве.</p>
            <button className="btn primary block" onClick={onSettings}>Добавить ключ в настройках</button>
          </div>
        ) : (
          <div className="stack">
            <button className="btn gold block" disabled={busy || !state.workouts.length} onClick={() => run()}>{busy ? '⏳ Анализирую…' : '🔮 Проанализировать мои тренировки'}</button>
            {!state.workouts.length && <p className="small muted">Сначала запиши хотя бы одну тренировку.</p>}
            <div className="row">
              <input placeholder="Или задай вопрос: как пробить плато в жиме?" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) run(q.trim()); }} />
              <button className="btn primary" disabled={busy || !q.trim()} onClick={() => run(q.trim())}>→</button>
            </div>
            {busy && <button className="btn sm ghost" onClick={() => abort.current?.abort()}>Отменить</button>}
            {err && <div className="tip warn"><span className="ic">⚠️</span><div className="small">{err}</div></div>}
          </div>
        )}
      </Card>

      {state.aiNotes.map((n, i) => (
        <Card key={n.date + i} title={<div><h2 style={{ fontSize: 15 }}>{n.question ? `❓ ${n.question}` : '🔮 Анализ тренировок'}</h2><div className="tiny muted">{fmtDateTime(n.date)}</div></div>}>
          <div className="ai-text">{renderAi(n.text)}</div>
        </Card>
      ))}
    </div>
  );
};
