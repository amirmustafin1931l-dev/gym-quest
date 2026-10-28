import { useMemo } from 'react';
import { useStore } from '../store';
import { Figure } from '../components/Figure';
import { Cta, Hud, Panel, PmTabs, Stencil, Sunset } from '../components/gta';
import { levelFromXp } from '../lib/xp';
import { bulkFromLevel, stageOf, DEFAULT_LOOK } from '../lib/figure';
import { fmtNum } from '../lib/dates';
import { totals, weekStreak } from '../lib/stats';
import { toast } from '../lib/toast';
import { useClock } from './HeroScreen';

/** Банда: пока локальная заглушка — мультиплеер на Supabase будет следующим этапом */
export const GangScreen = () => {
  const { state, exMap } = useStore();
  const clock = useClock();
  const lvl = levelFromXp(state.profile.xp);
  const b = bulkFromLevel(lvl.level);
  const t = useMemo(() => totals(state.workouts, exMap), [state.workouts, exMap]);
  return (
    <div className="screen">
      <Sunset /><div className="halftone" />
      <div className="head">
        <div><div className="tag">БАНДА</div><div style={{ marginTop: 6 }}><Stencil kind="y">Grove Street Gym · 1 чел.</Stencil></div></div>
        <Hud clock={clock} money={t.tonnage} bars={[]} stars={weekStreak(state.workouts)} compact />
      </div>
      <div className="z stack">
        <PmTabs value="respect" onChange={() => toast('Рейтинг появится вместе с мультиплеером')} items={[{ id: 'respect', label: 'Respect' }, { id: 'ton', label: 'Тоннаж' }, { id: 'streak', label: 'Серия' }, { id: 'week', label: 'Неделя' }]} />
        <Panel>
          <div className="lb me">
            <span className="pos">1</span>
            <div className="mini"><Figure b={b} stage={stageOf(b)} gear={state.profile.gear || 'street'} look={state.profile.look || DEFAULT_LOOK} w={38} h={66} shadow={false} /></div>
            <div><div>{state.profile.name || 'Атлет'} (ты)</div><div className="osw tiny mut">ур.{lvl.level} · {lvl.title}</div></div>
            <span className="r">{fmtNum(state.profile.xp)} rp</span>
          </div>
          <div className="empty"><div className="ic">👥</div><div className="bold t2">Банда пока пустая</div><div className="small" style={{ marginTop: 4 }}>Друзья, чужие качки и общий рейтинг появятся на следующем этапе: сервер на Supabase, вход через Telegram, приглашение по ссылке.</div></div>
        </Panel>
        <div className="row">
          <Cta dark onClick={() => toast('Скоро: приглашение по ссылке')} style={{ flex: 1 }}>🔗 Позвать в банду</Cta>
          <Cta onClick={() => toast('Скоро: общий рейтинг')} style={{ flex: 1 }}>🌍 Общий топ</Cta>
        </div>
      </div>
    </div>
  );
};
