import { useState } from 'react';
import { useStore } from '../store';
import { Cta } from './gta';
import { describeSet, type DayTask } from '../lib/programs';
import { haptic } from '../lib/telegram';

/** Карточка «Задание на сегодня»: из программы или от тренера */
export const TaskCard = ({ task, onStart, onChange, compact }: { task: DayTask; onStart: () => void; onChange?: () => void; compact?: boolean }) => {
  const { exMap, state } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="task">
      <div className="task-hd">
        <span>📋 Задание на сегодня</span>
        <span className="green">+50 RP</span>
      </div>
      <div className="task-title">{task.title}</div>
      <div className="task-sub">{task.subtitle} · ~{task.minutes} мин</div>
      {task.greeting && !compact && <p className="task-greet">{task.greeting}</p>}
      {task.deload && <div className="task-deload">Разгрузочная неделя: восстанавливаемся перед новым циклом</div>}
      {!compact && <div className="task-warm"><b>Разминка:</b> {task.warmup}</div>}
      <div className="task-list">
        {task.exercises.map((e) => {
          const def = exMap.get(e.id);
          const isOpen = open === e.id;
          return (
            <button key={e.id} className="task-row" onClick={() => setOpen(isOpen ? null : e.id)} type="button">
              <span className="task-name">{def?.name ?? e.id}</span>
              <b>{describeSet(e, def)}</b>
              {isOpen && (
                <span className="task-note">
                  {e.note}{e.rir !== null ? ` · запас ${e.rir} повт.` : ''} · отдых {e.rest >= 120 ? `${Math.round(e.rest / 60 * 10) / 10} мин` : `${e.rest} с`}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!compact && <div className="task-prog">🎯 {task.progression}</div>}
      {!compact && <div className="task-tip">💡 {task.tip}</div>}
      <div className="row" style={{ marginTop: 10 }}>
        {onChange && <Cta dark className="sm" onClick={onChange} style={{ width: 120 }}>Сменить</Cta>}
        <Cta onClick={() => { haptic('medium'); onStart(); }} disabled={!!state.draft} style={{ flex: 1, height: 46 }}>{state.draft ? 'Миссия уже идёт' : '⚔️ Начать миссию'}</Cta>
      </div>
      <div className="tiny mut" style={{ marginTop: 6 }}>Нажми на упражнение — покажу зачем оно, запас повторов и отдых.</div>
    </section>
  );
};
