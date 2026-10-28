import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { Cta, Panel, Stencil, Sunset } from '../components/gta';
import { programById } from '../data/programs';
import { CYCLE_WEEKS, programWeek } from '../lib/programs';
import { DEFAULT_DAYS, WEEKDAYS, explain, programFor, warnings, weekPlan, type Style, type WeekRow } from '../lib/schedule';
import { haptic } from '../lib/telegram';
import { toast } from '../lib/toast';

export const WeekList = ({ rows, compact }: { rows: WeekRow[]; compact?: boolean }) => (
  <section className="pm" style={{ padding: 0 }}>
    {rows.map((r) => (
      <div key={r.idx} className={`wk ${r.status === 'today' || r.status === 'rest-today' ? 'today' : ''} ${r.status.startsWith('rest') ? 'rest' : ''}`}>
        <div className="d">{WEEKDAYS[r.idx]}<small>{r.date.getDate()}</small></div>
        <div className="w">{r.title}{!compact && <small>{r.detail}</small>}</div>
        {r.status === 'done' || r.status === 'extra' ? <span className="st done">✓{compact ? '' : ' выполнено'}</span>
          : r.status === 'missed' ? <span className="st miss">пропуск</span>
          : r.status === 'today' || r.status === 'rest-today' ? <span className="st now">сегодня</span>
          : r.status === 'next' ? <span className="st next">{WEEKDAYS[r.idx]}</span>
          : <span className="moon">☾</span>}
      </div>
    ))}
  </section>
);

export const ScheduleScreen = ({ onBack, onPrograms, startEditing }: { onBack: () => void; onPrograms: () => void; startEditing?: boolean }) => {
  const { state, dispatch, exMap } = useStore();
  const [editing, setEditing] = useState(startEditing || !state.schedule);
  const [style, setStyle] = useState<Style>(state.schedule?.style ?? 'fullbody');
  const [days, setDays] = useState<number[]>(state.schedule?.days ?? DEFAULT_DAYS[3]);
  const rows = useMemo(() => weekPlan(state, (id) => exMap.get(id)?.name), [state, exMap]);
  const program = programById(state.program?.id);
  const week = programWeek(state.program?.start);
  const plannedRows = rows.filter((r) => state.schedule?.days.includes(r.idx));
  const doneCount = plannedRows.filter((r) => r.status === 'done').length;
  const preview = programById(programFor(style, days.length));
  const warn = warnings(style, days);

  const toggle = (d: number) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort((a, b) => a - b)));
  const save = () => {
    if (days.length < 2) { toast('Выбери хотя бы 2 дня'); return; }
    dispatch({ type: 'setSchedule', style, days });
    haptic('success'); toast('Неделя сохранена'); setEditing(false);
  };

  if (editing) {
    return (
      <div className="screen">
        <Sunset /><div className="halftone" />
        <div className="head">
          {state.schedule ? <button className="icon-btn" onClick={() => setEditing(false)} aria-label="Назад">←</button> : <button className="icon-btn" onClick={onBack} aria-label="Назад">←</button>}
          <div style={{ textAlign: 'right' }}><div className="tag">НЕДЕЛЯ</div><div style={{ marginTop: 6 }}><Stencil kind="y">Настрой расписание</Stencil></div></div>
        </div>
        <div className="z stack">
          <Panel>
            <div className="pm-title"><span>1. Как тренируешься</span></div>
            <div className="seg2">
              <button className={style === 'fullbody' ? 'on' : ''} onClick={() => setStyle('fullbody')}>Full Body<small>всё тело каждый раз</small></button>
              <button className={style === 'split' ? 'on' : ''} onClick={() => setStyle('split')}>Сплит<small>мышцы по дням</small></button>
            </div>
          </Panel>
          <Panel>
            <div className="pm-title"><span>2. Сколько раз в неделю</span></div>
            <div className="segmented">{[2, 3, 4, 5, 6].map((n) => <button key={n} className={days.length === n ? 'active' : ''} onClick={() => setDays(DEFAULT_DAYS[n])}>{n}</button>)}</div>
            <p className="small t2" style={{ marginTop: 8 }}>{explain(style, days.length)}</p>
          </Panel>
          <Panel>
            <div className="pm-title"><span>3. В какие дни</span></div>
            <div className="days">{WEEKDAYS.map((d, i) => <button key={d} className={days.includes(i) ? 'on' : ''} onClick={() => toggle(i)}>{d}</button>)}</div>
            {warn.length ? warn.map((w) => <p key={w} className="small orange" style={{ marginTop: 8 }}>⚠ {w}</p>) : <p className="small t2" style={{ marginTop: 8 }}>Между тяжёлыми днями на одни мышцы — не меньше 48 часов. Расписание проверяет это само.</p>}
          </Panel>
          {preview && days.length >= 2 && (
            <Panel>
              <div className="pm-title"><span>Программа</span><button className="btn ghost sm" onClick={onPrograms}>Подробнее →</button></div>
              <div className="mono" style={{ fontSize: 12, color: '#fff' }}>{preview.name}</div>
              <div className="tiny mut osw" style={{ marginTop: 4 }}>{preview.days.map((d) => d.title).join(' → ')}</div>
              <p className="tiny mut" style={{ marginTop: 6 }}>Цикл {CYCLE_WEEKS} недель: 5 недель прогрессии и неделя разгрузки. Веса игра считает по твоим прошлым подходам.</p>
            </Panel>
          )}
          <Cta onClick={save} disabled={days.length < 2}>Сохранить неделю</Cta>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <Sunset /><div className="halftone" />
      <div className="head">
        <button className="icon-btn" onClick={onBack} aria-label="Назад">←</button>
        <div style={{ textAlign: 'right' }}><div className="tag">НЕДЕЛЯ {week}/{CYCLE_WEEKS}</div><div style={{ marginTop: 6 }}><Stencil kind="y" small>{program?.short ?? ''} · {state.schedule?.days.length} {state.schedule?.days.length === 2 || state.schedule?.days.length === 3 || state.schedule?.days.length === 4 ? 'дня' : 'дней'}</Stencil></div></div>
      </div>
      <div className="z stack">
        {week === CYCLE_WEEKS && <div className="task-deload">Неделя разгрузки: половина подходов и −10% веса</div>}
        <WeekList rows={rows} />
        <Panel>
          <div className="pm-title"><span>Неделя: {doneCount} из {plannedRows.length}</span></div>
          <div className="bar"><i style={{ width: `${plannedRows.length ? (doneCount / plannedRows.length) * 100 : 0}%` }} /></div>
          <p className="tiny mut" style={{ marginTop: 6 }}>Пропустишь день — тренировка сдвинется на следующий, ничего не потеряется.</p>
        </Panel>
        <div className="row">
          <Cta dark onClick={() => setEditing(true)} style={{ width: 130 }}>Изменить</Cta>
          <Cta onClick={onBack} style={{ flex: 1 }}>⚔️ Задание на сегодня</Cta>
        </div>
      </div>
    </div>
  );
};
