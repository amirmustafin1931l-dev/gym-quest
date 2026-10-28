import { useStore } from '../store';
import { Cta, Panel, Stencil, Sunset } from '../components/gta';
import { PROGRAMS } from '../data/programs';
import { CYCLE_WEEKS, nextProgramDay, programWeek } from '../lib/programs';
import { toast } from '../lib/toast';
import { haptic } from '../lib/telegram';
import { DEFAULT_DAYS } from '../lib/schedule';

const PRESET: Record<string, { style: 'fullbody' | 'split'; days: number[] }> = {
  fullbody3: { style: 'fullbody', days: DEFAULT_DAYS[3] }, upperlower4: { style: 'split', days: DEFAULT_DAYS[4] },
  ppl: { style: 'split', days: DEFAULT_DAYS[3] }, ulppl: { style: 'split', days: DEFAULT_DAYS[5] },
};

export const ProgramsScreen = ({ onBack }: { onBack: () => void }) => {
  const { state, dispatch, exMap } = useStore();
  const current = state.program?.id;
  const home = state.profile.goal?.place === 'home';
  return (
    <div className="screen">
      <Sunset /><div className="halftone" />
      <div className="head">
        <button className="icon-btn" onClick={onBack} aria-label="Назад">←</button>
        <div style={{ textAlign: 'right' }}><div className="tag">ПРОГРАММЫ</div><div style={{ marginTop: 6 }}><Stencil kind="y">Цикл {CYCLE_WEEKS} недель</Stencil></div></div>
      </div>
      <div className="z stack">
        <Panel>
          <p className="small t2">Выбери программу — каждый день игра сама выдаст задание: упражнения, подходы, повторы и веса, рассчитанные по твоим прошлым результатам. 5 недель прогрессии, 6-я — разгрузка, потом новый цикл.{home ? ' Ты тренируешься дома — штанги и тренажёры заменены на гантели, турник и свой вес.' : ''}</p>
        </Panel>
        {(['fullbody', 'split'] as const).map((type) => (
          <div key={type} className="stack">
            <div className="pm-title" style={{ margin: '6px 0 0' }}><span>{type === 'fullbody' ? 'Full Body — всё тело за тренировку' : 'Сплит — мышцы по дням'}</span></div>
            {PROGRAMS.filter((p) => p.type === type).map((p) => {
              const on = p.id === current;
              return (
                <Panel key={p.id} className={on ? 'prog on' : 'prog'}>
                  <div className="row between">
                    <div className="mono" style={{ fontSize: 13, color: on ? 'var(--gold)' : '#fff' }}>{p.name}</div>
                    {on && <span className="chip active">Текущая · нед. {programWeek(state.program?.start)}/{CYCLE_WEEKS}</span>}
                  </div>
                  <div className="chips" style={{ margin: '8px 0' }}>
                    <span className="chip">{p.daysPerWeek}</span><span className="chip">{p.level}</span><span className="chip g">{p.goal}</span>
                  </div>
                  <p className="small t2">{p.description}</p>
                  <div className="tiny mut osw" style={{ margin: '8px 0 4px' }}>{p.schedule}</div>
                  <div className="prog-days">
                    {p.days.map((d, i) => (
                      <div key={d.title} className={`prog-day ${on && nextProgramDay(state, p) === i ? 'next' : ''}`}>
                        <div className="mono" style={{ fontSize: 10, color: '#fff' }}>{d.title}{on && nextProgramDay(state, p) === i ? ' ← следующая' : ''}</div>
                        <div className="tiny mut">{d.slots.map((s) => exMap.get(s.ex)?.name).filter(Boolean).join(' · ')}</div>
                      </div>
                    ))}
                  </div>
                  {on
                    ? <Cta danger className="sm" onClick={() => { dispatch({ type: 'setProgram', id: null }); toast('Программа отключена'); }} style={{ marginTop: 10 }}>Отключить программу</Cta>
                    : <Cta onClick={() => { haptic('success'); const pr = PRESET[p.id]; dispatch({ type: 'setSchedule', style: pr.style, days: pr.days }); toast(`«${p.short}» разложена по неделе — дни можно поменять`); onBack(); }} style={{ marginTop: 10 }}>Выбрать</Cta>}
                </Panel>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
