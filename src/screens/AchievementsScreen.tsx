import { useMemo } from 'react';
import { useStore } from '../store';
import { Bar, Card } from '../components/ui';
import { ACHIEVEMENTS, type AchievementDef } from '../lib/achievements';
import { fmtDate } from '../lib/dates';

export const AchievementsScreen = ({ onBack }: { onBack: () => void }) => {
  const { state, exMap } = useStore();
  const unlocked = useMemo(() => new Map(state.achievements.map((a) => [a.id, a.date])), [state.achievements]);
  const ctx = useMemo(() => ({ state, workouts: state.workouts, ex: exMap }), [state, exMap]);
  const groups = [...new Set(ACHIEVEMENTS.map((a) => a.group))];
  const totalXp = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).reduce((s, a) => s + a.xp, 0);
  const progressOf = (a: AchievementDef) => { try { return a.progress?.(ctx) ?? 0; } catch { return 0; } };

  return (
    <div className="screen">
      <div className="row">
        <button className="btn icon ghost" onClick={onBack} aria-label="Назад">←</button>
        <div className="grow">
          <h1 style={{ fontSize: 20 }}>Достижения</h1>
          <div className="small muted">{unlocked.size} из {ACHIEVEMENTS.length} · {totalXp} XP получено</div>
        </div>
      </div>
      <Bar value={unlocked.size} max={ACHIEVEMENTS.length} gold />
      {groups.map((g) => (
        <Card key={g} title={g}>
          <div className="list">
            {ACHIEVEMENTS.filter((a) => a.group === g).map((a) => {
              const date = unlocked.get(a.id);
              const p = date ? 1 : progressOf(a);
              return (
                <div key={a.id} className={`ach ${date ? '' : 'locked'}`}>
                  <span className="ic">{a.icon}</span>
                  <span className="grow">
                    <div className="t bold">{a.title}</div>
                    <div className="small muted">{a.desc}</div>
                    {date ? <div className="tiny good">Открыто {fmtDate(date)}</div> : p > 0 ? <div style={{ marginTop: 5 }}><Bar value={p} max={1} thin /></div> : null}
                  </span>
                  <span className="xp">+{a.xp}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
};
