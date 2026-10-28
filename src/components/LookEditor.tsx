import { useStore } from '../store';
import { Figure } from './Figure';
import { BEARD_NAMES, DEFAULT_LOOK, GEAR_NAMES, HAIR_NAMES, SKIN_NAMES, bulkFromLevel, stageOf, type BeardId, type GearId, type HairId, type Look, type SkinId } from '../lib/figure';
import { levelFromXp } from '../lib/xp';
import { PmTabs } from './gta';
import { useState } from 'react';

/** Редактор внешности и экипировки героя (как создание персонажа в GTA Online) */
export const LookEditor = ({ compact }: { compact?: boolean }) => {
  const { state, dispatch } = useStore();
  const look: Look = { ...DEFAULT_LOOK, ...(state.profile.look || {}) };
  const gear: GearId = state.profile.gear || 'street';
  const lvl = levelFromXp(state.profile.xp); const b = bulkFromLevel(lvl.level);
  const setLook = (patch: Partial<Look>) => dispatch({ type: 'setProfile', patch: { look: { ...look, ...patch } } });
  const [tab, setTab] = useState<'look' | 'gear'>('look');
  const [preview, setPreview] = useState(stageOf(b));
  return (
    <div className="stack">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ background: '#000', border: '2px solid var(--line)' }}><Figure b={tab === 'gear' ? [0, .25, .5, .75, 1][preview - 1] : b} stage={tab === 'gear' ? preview : undefined} gear={gear} look={look} w={compact ? 120 : 140} h={compact ? 208 : 243} /></div>
        <div className="grow stack">
          <PmTabs value={tab} onChange={setTab} items={[{ id: 'look', label: 'Внешность' }, { id: 'gear', label: 'Экипировка' }]} />
          {tab === 'look' ? (<>
            <div className="tiny mut osw">Кожа</div>
            <div className="chips">{(Object.keys(SKIN_NAMES) as SkinId[]).map((k) => <button key={k} className={`chip ${look.skin === k ? 'active' : ''}`} onClick={() => setLook({ skin: k })}>{SKIN_NAMES[k]}</button>)}</div>
            <div className="tiny mut osw">Причёска</div>
            <div className="chips">{(Object.keys(HAIR_NAMES) as HairId[]).map((k) => <button key={k} className={`chip ${look.hair === k ? 'active' : ''}`} onClick={() => setLook({ hair: k })}>{HAIR_NAMES[k]}</button>)}</div>
            <div className="tiny mut osw">Борода</div>
            <div className="chips">{(Object.keys(BEARD_NAMES) as BeardId[]).map((k) => <button key={k} className={`chip ${look.beard === k ? 'active' : ''}`} onClick={() => setLook({ beard: k })}>{BEARD_NAMES[k]}</button>)}</div>
            <div className="tiny mut osw">Цвет волос</div>
            <div className="chips">{['#2a1a10', '#5a3a1a', '#111', '#c48a2a', '#8a1a1a', '#e8e8e8'].map((c) => <button key={c} className={`chip ${look.hairColor === c ? 'active' : ''}`} style={{ width: 34, height: 30, padding: 0, background: c }} onClick={() => setLook({ hairColor: c })} aria-label={c} />)}</div>
          </>) : (<>
            {(Object.keys(GEAR_NAMES) as GearId[]).map((g) => (
              <button key={g} className={`look-opt ${gear === g ? 'on' : ''}`} style={{ textAlign: 'left', justifyItems: 'start', padding: '8px 10px', width: '100%' }} onClick={() => dispatch({ type: 'setProfile', patch: { gear: g } })}>
                <div className="mono" style={{ fontSize: 11, color: gear === g ? 'var(--gold)' : '#fff' }}>{GEAR_NAMES[g].name}</div><div className="tiny mut">{GEAR_NAMES[g].desc}</div>
              </button>
            ))}
            <div className="tiny mut osw">Посмотреть стадию</div>
            <div className="segmented">{[1, 2, 3, 4, 5].map((s) => <button key={s} className={preview === s ? 'active' : ''} onClick={() => setPreview(s)}>{s}</button>)}</div>
          </>)}
        </div>
      </div>
    </div>
  );
};
