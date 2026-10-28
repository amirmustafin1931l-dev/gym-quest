import { useEffect, useState, type ReactNode } from 'react';
import { onToast } from '../lib/toast';

export const Card = ({ title, right, children, className = '', flat }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; flat?: boolean }) => (
  <section className={`card ${flat ? 'flat' : ''} ${className}`}>
    {(title || right) && (
      <div className="card-title">
        {typeof title === 'string' ? <h2>{title}</h2> : title}
        {right}
      </div>
    )}
    {children}
  </section>
);

export const Bar = ({ value, max = 1, gold, thin, color }: { value: number; max?: number; gold?: boolean; thin?: boolean; color?: string }) => (
  <div className={`bar ${gold ? 'gold' : ''} ${thin ? 'thin' : ''}`} role="progressbar" aria-valuenow={Math.round((value / max) * 100)} aria-valuemin={0} aria-valuemax={100}>
    <i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
  </div>
);

export const StatTile = ({ value, label, delta, deltaKind }: { value: ReactNode; label: string; delta?: ReactNode; deltaKind?: 'good' | 'bad' | 'muted' }) => (
  <div className="stat-tile">
    <div className="v">{value}</div>
    <div className="l">{label}</div>
    {delta !== undefined && <div className={`d ${deltaKind ?? 'muted'}`}>{delta}</div>}
  </div>
);

export const Modal = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="handle" />
        {children}
      </div>
    </div>
  );
};

export const Segmented = <T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) => (
  <div className="segmented" role="tablist">
    {options.map((o) => (
      <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
    ))}
  </div>
);

export const Toast = () => {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    return onToast((m) => {
      setMsg(m);
      window.clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 2600);
    });
  }, []);
  if (!msg) return null;
  return <div className="toast" role="status">{msg}</div>;
};

export const Empty = ({ icon, title, text }: { icon: string; title: string; text?: string }) => (
  <div className="empty">
    <div className="ic">{icon}</div>
    <div className="bold text-2">{title}</div>
    {text && <div className="small" style={{ marginTop: 4 }}>{text}</div>}
  </div>
);

export const NumInput = ({ value, onChange, placeholder, step = 1, inputMode = 'decimal' }: { value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string; step?: number; inputMode?: 'decimal' | 'numeric' }) => (
  <input
    type="number" inputMode={inputMode} step={step} min={0} placeholder={placeholder}
    value={value ?? ''}
    onChange={(e) => { const v = e.target.value; onChange(v === '' ? undefined : Math.max(0, Number(v.replace(',', '.')))); }}
    onFocus={(e) => e.target.select()}
  />
);
