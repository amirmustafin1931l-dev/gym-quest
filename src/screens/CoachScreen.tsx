import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import { Cta, Hud, Panel, Stencil, Sunset } from '../components/gta';
import { buildSummary, buildTips } from '../lib/advice';
import { askCoach, describeAiError, AI_MODEL } from '../lib/ai';
import { fmtDateTime } from '../lib/dates';
import { totals, weekStreak } from '../lib/stats';
import { haptic } from '../lib/telegram';
import { useClock } from './HeroScreen';

const renderAi = (text: string): ReactNode => {
  const lines = text.split('\n'); const out: ReactNode[] = []; let list: string[] = [];
  const flush = () => { if (list.length) { out.push(<ul key={out.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>); list = []; } };
  lines.forEach((raw) => {
    const l = raw.trim(); if (!l) { flush(); return; }
    if (/^#{1,4}\s/.test(l)) { flush(); out.push(<h4 key={out.length}>{inline(l.replace(/^#+\s/, ''))}</h4>); return; }
    if (/^(\d+[.)])\s/.test(l) && l.length < 60 && l.endsWith(':')) { flush(); out.push(<h4 key={out.length}>{inline(l.replace(/^\d+[.)]\s/, ''))}</h4>); return; }
    if (/^[-*•]\s/.test(l)) { list.push(l.replace(/^[-*•]\s/, '')); return; }
    flush(); out.push(<p key={out.length}>{inline(l)}</p>);
  });
  flush(); return out;
};
const inline = (s: string): ReactNode => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part);

export const CoachScreen = ({ onSettings }: { onSettings: () => void }) => {
  const { state, exMap, dispatch, checkAchievements } = useStore();
  const clock = useClock();
  const tips = useMemo(() => buildTips(state, exMap), [state, exMap]);
  const t = useMemo(() => totals(state.workouts, exMap), [state.workouts, exMap]);
  const [q, setQ] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const key = state.profile.apiKey?.trim();

  const run = async (question?: string) => {
    if (!key) { onSettings(); return; }
    setBusy(true); setErr(null); abort.current?.abort(); abort.current = new AbortController();
    try {
      const r = await askCoach(key, buildSummary(state, exMap), question, abort.current.signal);
      dispatch({ type: 'addAiNote', note: { date: new Date().toISOString(), question, text: r.text } });
      setQ(''); haptic('success'); setTimeout(checkAchievements, 0);
    } catch (e) { if ((e as Error)?.name === 'AbortError') return; setErr(describeAiError(e)); haptic('error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="screen">
      <Sunset /><div className="halftone" />
      <div className="head">
        <div><div className="tag">ТРЕНЕР</div><div style={{ marginTop: 6 }}><Stencil kind="y">📟 {tips.length} на пейджере</Stencil></div></div>
        <Hud clock={clock} money={t.tonnage} bars={[]} stars={weekStreak(state.workouts)} compact />
      </div>
      <div className="z stack">
        {tips.map((tip, i) => (
          <div key={i} className={`pager ${tip.kind === 'warn' ? 'w' : 'good'}`}>
            <div className="hd"><span>Тренер · пейджер</span><span>{tip.kind === 'warn' ? 'внимание' : tip.kind === 'good' ? 'респект' : 'инфо'}</span></div>
            <div className="msg">{tip.icon} <b>{tip.title}.</b> {tip.text}</div>
          </div>
        ))}
        <Panel>
          <div className="pm-title"><span>ИИ-тренер</span><span className="mut" style={{ textTransform: 'none' }}>{AI_MODEL}</span></div>
          {!key ? (
            <div className="stack">
              <p className="small t2">Чтобы тренер звонил с разбором тренировок, добавь API-ключ Anthropic в настройках. Ключ хранится только на этом устройстве.</p>
              <Cta dark onClick={onSettings}>Добавить ключ</Cta>
            </div>
          ) : (
            <div className="stack">
              <p className="small t2">Разбор всех тренировок, план на 2 недели, ответ на любой вопрос.</p>
              <div className="row">
                <input placeholder="Вопрос: как пробить плато в жиме?" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) run(q.trim()); }} />
                <Cta dark className="sm" disabled={busy || !q.trim()} onClick={() => run(q.trim())} style={{ width: 70 }}>❓</Cta>
              </div>
              <Cta disabled={busy || !state.workouts.length} onClick={() => run()}>{busy ? '⏳ Тренер думает…' : '📞 Позвонить тренеру'}</Cta>
              {!state.workouts.length && <p className="tiny mut">Сначала запиши хотя бы одну миссию.</p>}
              {busy && <button className="btn ghost" onClick={() => abort.current?.abort()}>Отменить</button>}
              {err && <div className="pager w"><div className="msg">⚠️ {err}</div></div>}
            </div>
          )}
        </Panel>
        {state.aiNotes.map((n, i) => (
          <div key={n.date + i} className="pager">
            <div className="hd"><span>{n.question ? `❓ ${n.question}` : '📞 Звонок тренеру'}</span><span>{fmtDateTime(n.date)}</span></div>
            <div className="ai-text">{renderAi(n.text)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
