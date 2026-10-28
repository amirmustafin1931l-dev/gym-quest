import { useMemo, useState } from 'react';
import type { Category, Exercise, ExerciseKind, MuscleId } from '../types';
import { CATEGORIES, CATEGORY_ORDER, MUSCLES, MUSCLE_IDS } from '../data/muscles';
import { Modal } from './ui';
import { useStore } from '../store';
import { uid } from '../lib/dates';
import { haptic } from '../lib/telegram';

export const KIND_LABEL: Record<ExerciseKind, string> = {
  weight: 'Вес × повторы', bodyweight: 'Повторы (свой вес)', time: 'Время', cardio: 'Кардио (мин, км)',
};

export const ExerciseList = ({ onPick, recent }: { onPick: (e: Exercise) => void; recent?: string[] }) => {
  const { exercises } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'all' | 'recent'>(recent?.length ? 'recent' : 'all');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    let arr = exercises;
    if (cat === 'recent') arr = (recent ?? []).map((id) => exercises.find((e) => e.id === id)).filter((e): e is Exercise => !!e);
    else if (cat !== 'all') arr = arr.filter((e) => e.category === cat);
    if (s) arr = exercises.filter((e) => e.name.toLowerCase().includes(s) || e.primary.some((m) => MUSCLES[m].name.toLowerCase().includes(s)));
    return arr;
  }, [exercises, q, cat, recent]);

  return (
    <div className="stack">
      <input placeholder="Поиск упражнения или мышцы" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips scroll">
        {recent?.length ? <button className={`chip ${cat === 'recent' ? 'active' : ''}`} onClick={() => setCat('recent')}>🕒 Недавние</button> : null}
        <button className={`chip ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>Все</button>
        {CATEGORY_ORDER.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{CATEGORIES[c].icon} {CATEGORIES[c].name}</button>
        ))}
      </div>
      <div className="list">
        {list.map((e) => (
          <button key={e.id} className="list-item" onClick={() => onPick(e)}>
            <span className="ic">{CATEGORIES[e.category].icon}</span>
            <span className="grow">
              <div className="t">{e.name}{e.custom && <span className="chip gold" style={{ marginLeft: 6, padding: '1px 7px', fontSize: 10 }}>своё</span>}</div>
              <div className="s">{e.primary.map((m) => MUSCLES[m].short).join(', ')} · {KIND_LABEL[e.kind]}</div>
            </span>
          </button>
        ))}
        {!list.length && <div className="empty small">Ничего не найдено</div>}
      </div>
    </div>
  );
};

export const ExercisePickerModal = ({ open, onClose, onPick, recent }: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void; recent?: string[] }) => {
  const [creating, setCreating] = useState(false);
  return (
    <Modal open={open} onClose={onClose}>
      <div className="row between">
        <h2>{creating ? 'Своё упражнение' : 'Выбери упражнение'}</h2>
        <button className="btn sm" onClick={() => setCreating((v) => !v)}>{creating ? 'К списку' : '+ Своё'}</button>
      </div>
      {creating
        ? <NewExerciseForm onDone={(e) => { setCreating(false); onPick(e); }} />
        : <ExerciseList recent={recent} onPick={(e) => { haptic('light'); onPick(e); }} />}
    </Modal>
  );
};

export const NewExerciseForm = ({ onDone }: { onDone: (e: Exercise) => void }) => {
  const { dispatch, checkAchievements } = useStore();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [kind, setKind] = useState<ExerciseKind>('weight');
  const [primary, setPrimary] = useState<MuscleId[]>([]);
  const [secondary, setSecondary] = useState<MuscleId[]>([]);
  const toggle = (arr: MuscleId[], set: (v: MuscleId[]) => void, m: MuscleId) => set(arr.includes(m) ? arr.filter((x) => x !== m) : [...arr, m]);
  const valid = name.trim().length > 1 && primary.length > 0;
  return (
    <div className="stack">
      <input placeholder="Название, например «Жим в Смите»" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid-2">
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORIES[c].name}</option>)}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as ExerciseKind)}>
          {(Object.keys(KIND_LABEL) as ExerciseKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
      </div>
      <div className="small muted">Основные мышцы</div>
      <div className="chips">{MUSCLE_IDS.map((m) => <button key={m} className={`chip ${primary.includes(m) ? 'active' : ''}`} onClick={() => toggle(primary, setPrimary, m)}>{MUSCLES[m].short}</button>)}</div>
      <div className="small muted">Вспомогательные (необязательно)</div>
      <div className="chips">{MUSCLE_IDS.filter((m) => !primary.includes(m)).map((m) => <button key={m} className={`chip ${secondary.includes(m) ? 'active' : ''}`} onClick={() => toggle(secondary, setSecondary, m)}>{MUSCLES[m].short}</button>)}</div>
      <button className="btn primary block" disabled={!valid} onClick={() => {
        const e: Exercise = { id: 'custom_' + uid(), name: name.trim(), category, kind, primary, secondary: secondary.filter((m) => !primary.includes(m)), custom: true };
        dispatch({ type: 'addCustomExercise', exercise: e });
        setTimeout(checkAchievements, 0);
        onDone(e);
      }}>Создать</button>
    </div>
  );
};
