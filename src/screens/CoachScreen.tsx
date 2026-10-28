import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMsg, CoachGoal, CoachId, CoachPlan } from '../types';
import { useStore } from '../store';
import { useSocial } from '../social';
import { Figure } from '../components/Figure';
import { TaskCard } from '../components/TaskCard';
import { Cta, Hud, Panel, PmTabs, Stencil, Sunset } from '../components/gta';
import { buildTips } from '../lib/advice';
import { COACHES, GOAL_NAMES, buildCatalog, buildCoachSummary, coachById, todayKey, type Coach } from '../lib/coach';
import { trainedToday, type DayTask } from '../lib/programs';
import { totals, weekStreak } from '../lib/stats';
import { uid } from '../lib/dates';
import { haptic } from '../lib/telegram';
import { toast } from '../lib/toast';
import { useClock } from './HeroScreen';

const Avatar = ({ c, size = 52 }: { c: Coach; size?: number }) => (
  <Figure b={0.6} stage={c.stage} gear={c.gear} look={c.look} headOnly w={size * 1.3} h={size * 1.1} />
);
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const planToTask = (p: CoachPlan): DayTask => ({ source: 'coach', coach: p.coach, coachDate: p.date, title: p.title, subtitle: `Задание от ${coachById(p.coach).name}`, minutes: p.minutes, warmup: p.warmup, exercises: p.exercises, progression: p.progression, tip: p.tip });

interface Status { ready: boolean; chatLeft: number; planLeft: number }

export const CoachScreen = ({ onStarted }: { onStarted: () => void }) => {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState<CoachId | null>(null);
  if (open) return <Chat coach={coachById(open)} onBack={() => setOpen(null)} onStarted={onStarted} />;
  return <Contacts onOpen={(id) => { dispatch({ type: 'setProfile', patch: { coach: id } }); setOpen(id); }} selected={state.profile.coach} />;
};

const Contacts = ({ onOpen, selected }: { onOpen: (id: CoachId) => void; selected?: CoachId }) => {
  const { state, exMap } = useStore();
  const clock = useClock();
  const tips = useMemo(() => buildTips(state, exMap), [state, exMap]);
  const t = useMemo(() => totals(state.workouts, exMap), [state.workouts, exMap]);
  const plan = state.coachPlans.find((p) => p.date === todayKey());
  return (
    <div className="screen">
      <Sunset /><div className="halftone" />
      <div className="head">
        <div><div className="tag">ТРЕНЕР</div><div style={{ marginTop: 6 }}><Stencil kind="y">📱 Контакты</Stencil></div></div>
        <Hud clock={clock} money={t.tonnage} bars={[]} stars={weekStreak(state.workouts)} compact />
      </div>
      <div className="z stack">
        <Panel>
          {COACHES.map((c) => {
            const msgs = state.coachChats[c.id] ?? [];
            const last = msgs[msgs.length - 1];
            const fresh = plan?.coach === c.id && !plan.workoutId;
            return (
              <button key={c.id} className={`ct ${selected === c.id ? 'on' : ''}`} onClick={() => { haptic('light'); onOpen(c.id); }} type="button">
                <div className="ava"><Avatar c={c} /></div>
                <div className="grow">
                  <div className="nm">{c.name}</div>
                  <div className="last">{last ? last.text : c.tagline}</div>
                </div>
                {fresh ? <div className="badge">1</div> : last ? <span className="tiny mut">{hhmm(last.date)}</span> : null}
              </button>
            );
          })}
        </Panel>
        <p className="tiny mut osw">Все три тренера одинаково сильны в методике — отличается характер. Пиши о технике, питании, боли после тренировки. Задание на день тренер присылает сам, когда открываешь чат.</p>
        {tips.slice(0, 3).map((tip, i) => (
          <div key={i} className={`pager ${tip.kind === 'warn' ? 'w' : 'good'}`}>
            <div className="hd"><span>Пейджер · авто-совет</span><span>{tip.kind === 'warn' ? 'внимание' : 'респект'}</span></div>
            <div className="msg">{tip.icon} <b>{tip.title}.</b> {tip.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const GoalForm = ({ coach, onDone }: { coach: Coach; onDone: () => void }) => {
  const { state, dispatch } = useStore();
  const [g, setG] = useState<CoachGoal>(state.profile.goal ?? { goal: 'mass', days: 3, place: 'gym', sex: 'm' });
  return (
    <div className="task" style={{ borderColor: 'var(--green)' }}>
      <div className="task-hd"><span>📝 Анкета для {coach.name}</span></div>
      <div className="stack" style={{ marginTop: 8 }}>
        <div className="tiny mut osw">Цель</div>
        <div className="chips">{(Object.keys(GOAL_NAMES) as CoachGoal['goal'][]).map((k) => <button key={k} className={`chip ${g.goal === k ? 'active' : ''}`} onClick={() => setG({ ...g, goal: k })}>{GOAL_NAMES[k]}</button>)}</div>
        <div className="tiny mut osw">Тренировок в неделю</div>
        <div className="segmented">{[2, 3, 4, 5, 6].map((d) => <button key={d} className={g.days === d ? 'active' : ''} onClick={() => setG({ ...g, days: d })}>{d}</button>)}</div>
        <div className="tiny mut osw">Где тренируешься</div>
        <PmTabs value={g.place} onChange={(v) => setG({ ...g, place: v })} items={[{ id: 'gym', label: 'Зал' }, { id: 'home', label: 'Дома' }]} />
        <div className="tiny mut osw">Пол</div>
        <PmTabs value={g.sex} onChange={(v) => setG({ ...g, sex: v })} items={[{ id: 'm', label: 'Мужской' }, { id: 'f', label: 'Женский' }]} />
        <div className="tiny mut osw">Травмы и ограничения (если есть)</div>
        <input value={g.limits ?? ''} onChange={(e) => setG({ ...g, limits: e.target.value })} placeholder="например: болит колено при приседе" />
        <Cta onClick={() => { dispatch({ type: 'setProfile', patch: { goal: { ...g, limits: g.limits?.trim() || undefined } } }); haptic('success'); onDone(); }}>Отправить тренеру</Cta>
      </div>
    </div>
  );
};

const Chat = ({ coach, onBack, onStarted }: { coach: Coach; onBack: () => void; onStarted: () => void }) => {
  const { state, exMap, exercises, dispatch, checkAchievements } = useStore();
  const social = useSocial();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<'chat' | 'plan' | null>(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [editGoal, setEditGoal] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const msgs = state.coachChats[coach.id] ?? [];
  const stateRef = useRef(state); stateRef.current = state;
  const today = todayKey();
  const plan = state.coachPlans.find((p) => p.date === today && p.coach === coach.id);

  const push = (m: Omit<ChatMsg, 'id' | 'date'>, ifEmpty = false) => dispatch({ type: 'coachMsg', coach: coach.id, ifEmpty, msg: { ...m, id: uid(), date: new Date().toISOString() } });
  const autoAsked = useRef(false);

  useEffect(() => {
    push({ role: 'assistant', text: coach.hello }, true);
    if (social.status !== 'online') return;
    social.coach({ mode: 'check' }).then((r) => setStatus({ ready: !!r.ready, chatLeft: r.chatLeft ?? 0, planLeft: r.planLeft ?? 0 })).catch((e) => setErr((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach.id, social.status]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, busy]);

  const requestPlan = async (auto = false) => {
    if (busy || !status?.ready) return;
    if (status.planLeft <= 0) { if (!auto) toast('Задание на сегодня уже выдано. Новое — завтра'); return; }
    setBusy('plan'); setErr(null);
    try {
      const s = stateRef.current;
      const r = await social.coach({ mode: 'plan', persona: coach.id, summary: buildCoachSummary(s, exMap), catalog: buildCatalog(exercises, s.profile.goal?.place) });
      if (!r.plan) throw new Error('Тренер не прислал задание');
      const p: CoachPlan = { ...r.plan, date: todayKey(), coach: coach.id };
      dispatch({ type: 'coachPlan', plan: p });
      push({ role: 'assistant', text: r.plan.greeting, planDate: p.date });
      setStatus((st) => (st ? { ...st, planLeft: r.left ?? st.planLeft - 1 } : st));
      haptic('success'); setTimeout(checkAchievements, 0);
    } catch (e) { setErr((e as Error).message); haptic('error'); } finally { setBusy(null); }
  };

  // Тренер сам присылает задание, когда открываешь чат (если анкета есть и сегодня ещё не было)
  useEffect(() => {
    if (autoAsked.current) return;
    if (status?.ready && state.profile.goal && !state.coachPlans.some((p) => p.date === today) && !trainedToday(state) && !busy) { autoAsked.current = true; requestPlan(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.ready, !!state.profile.goal]);

  const send = async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || busy) return;
    if (!status?.ready) { setErr(status ? 'Тренер ещё не подключён на сервере' : 'Нет связи с сервером'); return; }
    if (status.chatLeft <= 0) { toast('Тренер устал на сегодня. Пиши завтра'); return; }
    setText(''); setErr(null);
    push({ role: 'user', text: q });
    setBusy('chat');
    try {
      const s = stateRef.current;
      const history = [...(s.coachChats[coach.id] ?? [])].slice(-19).map((m) => ({ role: m.role, content: m.planDate ? `${m.text}\n[Задание: ${s.coachPlans.find((p) => p.date === m.planDate)?.title ?? ''}]` : m.text }));
      const r = await social.coach({ mode: 'chat', persona: coach.id, summary: buildCoachSummary(s, exMap), messages: [...history, { role: 'user', content: q }] });
      push({ role: 'assistant', text: r.text ?? '…' });
      setStatus((st) => (st ? { ...st, chatLeft: r.left ?? st.chatLeft - 1 } : st));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };

  const quick = plan && !plan.workoutId
    ? ['Замени упражнение — нет тренажёра', 'Сделай короче, на 30 минут', 'Что поесть сегодня?', 'Как правильно делать первое упражнение?']
    : ['Задание на сегодня', 'Как пробить плато?', 'Сколько белка мне нужно?', 'Болят мышцы после вчера — что делать?'];

  return (
    <div className="screen" style={{ paddingBottom: 'calc(var(--tab-h) + var(--safe-b) + 80px)' }}>
      <div className="chat-top">
        <button onClick={onBack} style={{ color: 'var(--gold)', font: '16px var(--f-mono)' }} aria-label="Назад">←</button>
        <div className="ava"><Avatar c={coach} size={40} /></div>
        <div className="grow">
          <div className="mono" style={{ fontSize: 12, color: '#fff' }}>{coach.name.toUpperCase()}</div>
          <div className="osw tiny" style={{ color: 'var(--green)' }}>● {busy ? 'печатает…' : coach.online}</div>
        </div>
        {state.profile.goal && <button className="stencil sm" onClick={() => setEditGoal((v) => !v)}>Анкета</button>}
      </div>

      <div className="z">
        {social.status === 'off' && <div className="pager w" style={{ marginTop: 10 }}><div className="msg">Тренер работает через сервер игры. Открой игру в Telegram — там он на связи.</div></div>}
        {status && !status.ready && <div className="pager w" style={{ marginTop: 10 }}><div className="msg">Тренер ещё не подключён: на сервере нет ключа Anthropic.</div></div>}

        {msgs.map((m) => {
          const p = m.planDate ? state.coachPlans.find((x) => x.date === m.planDate && x.coach === coach.id) : undefined;
          return (
            <div key={m.id}>
              <div className={`bub ${m.role === 'user' ? 'out' : 'in'}`}>{m.text}<div className="t">{hhmm(m.date)}{m.role === 'user' ? ' ✓✓' : ''}</div></div>
              {p && (p.date === today && !p.workoutId
                ? <TaskCard task={planToTask(p)} onStart={() => { dispatch({ type: 'startTask', task: planToTask(p) }); onStarted(); }} />
                : <div className="pager good" style={{ margin: '4px 0' }}><div className="msg">📋 Задание «{p.title}» — {p.workoutId ? 'взято в работу ✓' : 'не выполнено'}</div></div>)}
            </div>
          );
        })}

        {(!state.profile.goal || editGoal) && <GoalForm coach={coach} onDone={() => { setEditGoal(false); push({ role: 'assistant', text: 'Принял анкету. Собираю задание на сегодня.' }); }} />}

        {busy && <div className="typing">{coach.name} {busy === 'plan' ? 'составляет задание… (до минуты)' : 'печатает…'}</div>}
        {err && <div className="pager w"><div className="msg">⚠️ {err}</div></div>}

        {state.profile.goal && status?.ready && (
          <div className="chips2">
            {quick.map((q) => <button key={q} onClick={() => (q === 'Задание на сегодня' ? requestPlan() : send(q))} disabled={!!busy}>{q}</button>)}
          </div>
        )}
        {status && <div className="tiny mut" style={{ margin: '4px 0' }}>Сегодня осталось: {status.chatLeft} сообщ. · {status.planLeft} задан.</div>}
        <div ref={bottom} />
      </div>

      <div className="chat-input">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder={coach.placeholder} disabled={!state.profile.goal} />
        <button className="send" onClick={() => send()} disabled={!!busy || !text.trim()} aria-label="Отправить">➤</button>
      </div>
    </div>
  );
};
