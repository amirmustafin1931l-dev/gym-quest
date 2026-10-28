import { useMemo } from 'react';
import { useStore } from '../store';
import { Panel, Stencil, Sunset } from '../components/gta';
import { ACHIEVEMENTS, type AchievementDef } from '../lib/achievements';
import { fmtDate } from '../lib/dates';

export const AchievementsScreen = ({ onBack }: { onBack: () => void }) => {
  const { state, exMap } = useStore();
  const unlocked = useMemo(() => new Map(state.achievements.map((a) => [a.id, a.date])), [state.achievements]);
  const ctx = useMemo(() => ({ state, workouts: state.workouts, ex: exMap }), [state, exMap]);
  const groups = [...new Set(ACHIEVEMENTS.map((a) => a.group))];
  const totalXp = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).reduce((s, a) => s + a.xp, 0);
  const progressOf = (a: AchievementDef) => { try { return a.progress?.(ctx) ?? 0; } catch { return 0; } };
  const nearest = ACHIEVEMENTS.filter((a) => !unlocked.has(a.id)).map((a) => ({ a, p: progressOf(a) })).sort((x, y) => y.p - x.p)[0];

  return (
    <div className="screen">
      <Sunset /><div className="halftone" />
      <div className="head">
        <div><button className="icon-btn" onClick={onBack} aria-label="Назад">←</button></div>
        <div style={{ textAlign: 'right' }}><div className="tag">ТРОФЕИ</div><div style={{ marginTop: 6 }}><Stencil kind="y">{unlocked.size} / {ACHIEVEMENTS.length} · {totalXp} respect</Stencil></div></div>
      </div>
      <div className="z stack">
        <div className="bar"><i style={{ width: `${(unlocked.size / ACHIEVEMENTS.length) * 100}%` }} /></div>
        {nearest && nearest.p > 0 && (
          <Panel><div className="pm-title"><span>Ближайший трофей</span><span>{Math.round(nearest.p * 100)}%</span></div>
            <div className="row between"><span className="mono small" style={{ color: '#fff' }}>{nearest.a.icon} {nearest.a.title}</span><span className="tiny mut">{nearest.a.desc}</span></div>
            <div className="bar thin" style={{ marginTop: 6 }}><i style={{ width: `${nearest.p * 100}%` }} /></div></Panel>
        )}
        {groups.map((g) => (
          <div key={g}>
            <div className="pm-title" style={{ marginBottom: 6 }}><span>{g}</span><span className="mut">{ACHIEVEMENTS.filter((a) => a.group === g && unlocked.has(a.id)).length}/{ACHIEVEMENTS.filter((a) => a.group === g).length}</span></div>
            <div className="grid-4">
              {ACHIEVEMENTS.filter((a) => a.group === g).map((a) => {
                const date = unlocked.get(a.id); const p = date ? 1 : progressOf(a);
                return (
                  <div key={a.id} className={`trophy ${date ? 'on' : 'off'}`} title={`${a.desc}${date ? ` · открыто ${fmtDate(date)}` : ''}`}>
                    <div className="ic">{a.icon}</div><div className="n">{a.title}</div>
                    {date ? <div className="xp">+{a.xp}</div> : p > 0 ? <div className="bar thin" style={{ marginTop: 4 }}><i style={{ width: `${p * 100}%` }} /></div> : <div className="xp mut">+{a.xp}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
