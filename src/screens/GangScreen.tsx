import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { useSocial } from '../social';
import { Figure } from '../components/Figure';
import { Modal } from '../components/ui';
import { Cta, Hud, Panel, PmTabs, Stencil, Sunset } from '../components/gta';
import { METRICS, inviteLink, metricValue, titleOf, type Metric, type RemoteProfile } from '../lib/social';
import { bulkFromLevel, stageOf } from '../lib/figure';
import { MUSCLES } from '../data/muscles';
import { fmtDate, fmtNum, plural } from '../lib/dates';
import { openTelegramLink } from '../lib/telegram';
import { toast } from '../lib/toast';
import { useClock } from './HeroScreen';
import type { MuscleId } from '../types';

type Scope = 'friends' | 'global' | 'week';

export const GangScreen = () => {
  const { state } = useStore();
  const social = useSocial();
  const clock = useClock();
  const [scope, setScope] = useState<Scope>('friends');
  const [metric, setMetric] = useState<Metric>('xp');
  const [rows, setRows] = useState<RemoteProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<RemoteProfile | null>(null);
  const [invite, setInvite] = useState(false);
  const me = social.me;

  useEffect(() => {
    let alive = true; setLoading(true);
    social.list(scope, metric).then((r) => { if (alive) setRows(r); }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, metric, social.status, social.friends.length, social.me?.xp]);

  const myPos = useMemo(() => rows.findIndex((r) => r.id === me?.id) + 1, [rows, me]);
  const link = me ? inviteLink(me.tg_id) : '';
  const share = () => openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Заходи в мою банду в GymQuest — качаемся и сравниваем рекорды')}`);
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast('Ссылка скопирована'); } catch { toast(link); } };

  if (open) return <FriendProfile p={open} isFriend={social.friends.some((f) => f.id === open.id)} onBack={() => setOpen(null)} onRemove={async () => { await social.removeFriend(open.id); toast(`${open.name} убран из банды`); setOpen(null); }} />;

  return (
    <div className="screen">
      <Sunset /><div className="halftone" />
      <div className="head">
        <div><div className="tag">БАНДА</div><div style={{ marginTop: 6 }}><Stencil kind="y">Grove Street Gym · {social.friends.length + 1} чел.</Stencil></div>
          {social.mode === 'mock' && <div style={{ marginTop: 4 }}><Stencil small kind="w">демо-режим</Stencil></div>}</div>
        <div className="hud"><div className="clock">{myPos ? `#${myPos}` : '—'}</div><div className="lbl">моё место</div><div className="money" style={{ fontSize: 13 }}>{scope === 'week' ? 'НЕДЕЛЯ' : scope === 'global' ? 'ВСЕ' : 'ДРУЗЬЯ'}</div><div className="lbl">{clock}</div></div>
      </div>
      <div className="z stack">
        {social.status === 'off' && (
          <Panel><div className="pm-title"><span>Сервер не подключён</span></div><p className="small t2">Чтобы видеть друзей и рейтинг, нужен проект Supabase и бот в Telegram. Пошаговая инструкция — в README проекта. Без сервера всё остальное работает как раньше.</p></Panel>
        )}
        {social.status === 'error' && <Panel><div className="pm-title"><span className="redc">Нет связи</span></div><p className="small t2">{social.error}</p></Panel>}
        {social.status === 'connecting' && <Panel><p className="small t2">Подключаюсь к банде…</p></Panel>}
        {social.status === 'online' && (<>
          <PmTabs value={scope} onChange={setScope} items={[{ id: 'friends', label: 'Друзья' }, { id: 'global', label: 'Общий топ' }, { id: 'week', label: 'Неделя' }]} />
          {scope !== 'week' && <div className="chips scroll">{METRICS.map((m) => <button key={m.id} className={`chip ${metric === m.id ? 'g' : ''}`} onClick={() => setMetric(m.id)}>{m.label}</button>)}</div>}
          <Panel className="list-panel">
            {loading && !rows.length && <p className="small mut">Загружаю…</p>}
            {rows.map((p, i) => {
              const v = scope === 'week' ? p.week.xp : metricValue(p, metric); const unit = scope === 'week' ? 'rp' : METRICS.find((m) => m.id === metric)!.unit;
              const b = bulkFromLevel(p.level);
              return (
                <button key={p.id} className={`lb ${p.id === me?.id ? 'me' : ''}`} style={{ width: '100%', textAlign: 'left' }} onClick={() => p.id !== me?.id && setOpen(p)}>
                  <span className="pos">{i + 1}</span>
                  <div className="mini"><Figure b={b} stage={stageOf(b)} gear={p.gear} look={p.look} w={38} h={66} shadow={false} /></div>
                  <div><div>{p.name}{p.id === me?.id ? ' (ты)' : ''}</div><div className="osw tiny mut">ур.{p.level} · {titleOf(p.level)}</div></div>
                  <span className="r">{fmtNum(v)} {unit}</span>
                </button>
              );
            })}
            {!loading && rows.length <= 1 && scope === 'friends' && <div className="empty"><div className="ic">👥</div><div className="bold t2">В банде пока только ты</div><div className="small" style={{ marginTop: 4 }}>Отправь другу ссылку — он откроет её в Telegram и сразу попадёт в твою банду.</div></div>}
          </Panel>
          {scope === 'week' && rows.length > 0 && (
            <Panel><div className="row" style={{ gap: 10 }}><span style={{ fontSize: 22 }}>🏆</span><div><div className="pm-title" style={{ margin: 0 }}><span>Зачёт недели</span></div><div className="osw tiny t2">Кто наберёт больше Respect до воскресенья · лидер {rows[0].name} {fmtNum(rows[0].week.xp)} rp{me ? ` · ты ${fmtNum(me.week.xp)} rp` : ''}</div></div></div></Panel>
          )}
        </>)}
        <div className="row">
          <Cta dark onClick={() => setInvite(true)} disabled={!me} style={{ flex: 1 }}>🔗 Позвать в банду</Cta>
          <Cta onClick={() => setScope('global')} disabled={social.status !== 'online'} style={{ flex: 1 }}>🌍 Общий топ</Cta>
        </div>
      </div>
      <Modal open={invite} onClose={() => setInvite(false)}>
        <div className="mono goldc center">Твоя ссылка</div>
        <div style={{ background: '#000', border: '2px solid #444', padding: 10, fontFamily: 'Oswald', fontSize: 13, wordBreak: 'break-all', textAlign: 'center' }}>{link}</div>
        <p className="osw tiny mut center">Друг откроет ссылку в Telegram — и вы сразу в одной банде. Он увидит твоего качка, ты — его.</p>
        <Cta onClick={share}>📨 Отправить в Telegram</Cta>
        <Cta dark onClick={copy}>📋 Скопировать ссылку</Cta>
      </Modal>
      <span className="sr-only">{state.profile.name}</span>
    </div>
  );
};

const FriendProfile = ({ p, isFriend, onBack, onRemove }: { p: RemoteProfile; isFriend: boolean; onBack: () => void; onRemove: () => void }) => {
  const social = useSocial();
  const me = social.me;
  const b = bulkFromLevel(p.level);
  const [tab, setTab] = useState<'records' | 'stats'>('records');
  const cmp = (k: 'bench' | 'squat' | 'deadlift', label: string) => <div className="stat-tile"><div className="v">{p.bests[k] ?? '—'}</div><div className="l">{label} · ты {me?.bests[k] ?? '—'}</div></div>;
  return (
    <div className="screen">
      <Sunset className="full" /><div className="halftone" />
      <div className="head">
        <div><button className="stencil sm" onClick={onBack}>← Банда</button><div className="tag" style={{ marginTop: 8 }}>{p.name.toUpperCase()}</div><div style={{ marginTop: 6 }}><Stencil kind="y" small>ур.{p.level} · стадия {stageOf(b)}/5 · {titleOf(p.level)}</Stencil></div></div>
        <Hud clock={`${p.trophies} 🏆`} money={p.tonnage} bars={[]} stars={p.streak} compact />
      </div>
      <div className="hero-stage z" style={{ height: 440 }}>
        <Figure className="fig" b={b} stage={stageOf(b)} gear={p.gear} look={p.look} w={240} h={416} />
        <div className="chips">
          {p.last_workout_at && <Stencil kind="g" small>{fmtDate(p.last_workout_at)}: {p.last_muscles.slice(0, 2).map((m) => MUSCLES[m as MuscleId]?.short ?? m).join(', ')}</Stencil>}
          <Stencil small>🔥 {p.workouts} {plural(p.workouts, 'миссия', 'миссии', 'миссий')}</Stencil>
          <Stencil small>{p.prs} рекордов</Stencil>
        </div>
      </div>
      <div className="z stack">
        <Panel>
          <PmTabs value={tab} onChange={setTab} items={[{ id: 'records', label: 'Рекорды' }, { id: 'stats', label: 'Статы' }]} />
          {tab === 'records' ? <div className="grid-3" style={{ marginTop: 8 }}>{cmp('bench', 'жим')}{cmp('squat', 'присед')}{cmp('deadlift', 'тяга')}</div>
            : <div className="grid-3" style={{ marginTop: 8 }}><div className="stat-tile"><div className="v gold">{fmtNum(p.xp)}</div><div className="l">respect</div></div><div className="stat-tile"><div className="v green">{fmtNum(p.tonnage / 1000, 1)} т</div><div className="l">тоннаж</div></div><div className="stat-tile"><div className="v">{p.streak}</div><div className="l">недель подряд</div></div></div>}
        </Panel>
        <div className="row">
          <Cta dark onClick={() => toast('Зачёт недели считается автоматически: вкладка «Неделя»')} style={{ flex: 1 }}>⚔️ Вызвать на неделю</Cta>
          {isFriend ? <Cta danger onClick={() => { if (confirm(`Убрать ${p.name} из банды?`)) onRemove(); }} style={{ width: 110 }}>Убрать</Cta>
            : <Cta onClick={async () => { const f = await social.addFriendByTg(p.tg_id); if (f) toast(`${f.name} теперь в банде`); }} style={{ width: 130 }}>+ В банду</Cta>}
        </div>
      </div>
    </div>
  );
};
