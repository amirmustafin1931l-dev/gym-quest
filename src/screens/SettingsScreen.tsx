import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Modal } from '../components/ui';
import { LookEditor } from '../components/LookEditor';
import { Cta, Panel, Stencil, Sunset } from '../components/gta';
import { cloudAvailable, cloudLoad, cloudMeta, cloudSave, inTelegram, type CloudMeta } from '../lib/telegram';
import { parseImport, serialize } from '../lib/storage';
import { fmtDate, fmtDateTime, fmtNum } from '../lib/dates';
import { toast } from '../lib/toast';

export const SettingsScreen = ({ onBack }: { onBack: () => void }) => {
  const { state, dispatch } = useStore();
  const [name, setName] = useState(state.profile.name);
  const [key, setKey] = useState(state.profile.apiKey ?? '');
  const [showKey, setShowKey] = useState(false);
  const [meta, setMeta] = useState<CloudMeta | null>(null);
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState(''); const [importOpen, setImportOpen] = useState(false); const [resetOpen, setResetOpen] = useState(false);
  useEffect(() => { if (cloudAvailable()) cloudMeta().then(setMeta).catch(() => null); }, []);
  const saveProfile = () => { dispatch({ type: 'setProfile', patch: { name: name.trim(), apiKey: key.trim() || undefined } }); toast('Сохранено'); };
  const backup = async () => { setBusy(true); try { const m = await cloudSave(serialize(state)); setMeta(m); toast('Бэкап сохранён в Telegram'); } catch (e) { toast(`Ошибка: ${(e as Error).message}`); } finally { setBusy(false); } };
  const restore = async () => { if (!confirm('Заменить текущие данные бэкапом из облака Telegram?')) return; setBusy(true); try { const raw = await cloudLoad(); if (!raw) { toast('В облаке нет бэкапа'); return; } dispatch({ type: 'hydrate', state: parseImport(raw) }); toast('Данные восстановлены'); } catch (e) { toast(`Ошибка: ${(e as Error).message}`); } finally { setBusy(false); } };
  const exportJson = async () => {
    const json = serialize(state);
    try { if (navigator.share && inTelegram) { const file = new File([json], `gymquest-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' }); await navigator.share({ files: [file], title: 'GymQuest export' }); return; } } catch { /* fallthrough */ }
    try { const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `gymquest-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); } catch { /* ignore */ }
    try { await navigator.clipboard.writeText(json); toast('JSON скопирован'); } catch { toast('Файл скачан'); }
  };
  const doImport = () => { try { dispatch({ type: 'hydrate', state: parseImport(importText) }); setImportOpen(false); setImportText(''); toast('Импортировано'); } catch (e) { toast(`Ошибка: ${(e as Error).message}`); } };
  const bwSorted = [...state.bodyweight].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="screen">
      <Sunset /><div className="halftone" />
      <div className="head">
        <button className="icon-btn" onClick={onBack} aria-label="Назад">←</button>
        <div style={{ textAlign: 'right' }}><div className="tag">ГЕРОЙ</div><div style={{ marginTop: 6 }}><Stencil kind="y">Настройки</Stencil></div></div>
      </div>
      <div className="z stack">
        <Panel><div className="pm-title"><span>Внешность и экипировка</span></div><LookEditor /></Panel>
        <Panel><div className="pm-title"><span>Профиль</span></div>
          <div className="stack">
            <label className="small mut">Имя героя<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Атлет" /></label>
            <label className="small mut">API-ключ Anthropic (ИИ-тренер)
              <div className="row"><input type={showKey ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" /><button className="icon-btn" onClick={() => setShowKey((v) => !v)} aria-label="Показать ключ">{showKey ? '🙈' : '👁️'}</button></div>
            </label>
            <p className="tiny mut">Ключ хранится только в этом приложении и отправляется напрямую в API Anthropic. Получить: console.anthropic.com → API Keys.</p>
            <Cta onClick={saveProfile}>Сохранить</Cta>
          </div></Panel>
        <Panel><div className="pm-title"><span>Бэкап в Telegram</span><span className={cloudAvailable() ? 'green' : 'mut'}>{cloudAvailable() ? 'доступно' : 'только в Telegram'}</span></div>
          <p className="small t2">Бэкап в облако Telegram делается автоматически после каждой миссии и переносит прогресс между устройствами.</p>
          {meta && <p className="tiny mut" style={{ marginTop: 6 }}>Последний бэкап: {fmtDateTime(meta.savedAt)} · {fmtNum(meta.bytes / 1024, 1)} КБ</p>}
          <div className="row" style={{ marginTop: 10 }}><Cta dark disabled={!cloudAvailable() || busy} onClick={backup} style={{ flex: 1 }}>☁️ Сохранить</Cta><Cta dark disabled={!cloudAvailable() || busy || !meta} onClick={restore} style={{ flex: 1 }}>⬇️ Восстановить</Cta></div></Panel>
        <Panel><div className="pm-title"><span>Экспорт и импорт</span></div><div className="row"><Cta dark onClick={exportJson} style={{ flex: 1 }}>📤 Экспорт</Cta><Cta dark onClick={() => setImportOpen(true)} style={{ flex: 1 }}>📥 Импорт</Cta></div></Panel>
        <Panel><div className="pm-title"><span>Журнал веса тела</span></div>
          {bwSorted.length ? <div className="list">{bwSorted.slice(0, 20).map((x) => <div key={x.date} className="row between" style={{ padding: '8px 0' }}><span className="t2 small">{fmtDate(x.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span className="row"><b className="mono small">{x.kg} кг</b><button className="icon-btn" style={{ width: 30, height: 30, fontSize: 12 }} onClick={() => dispatch({ type: 'removeBodyweight', date: x.date })}>✕</button></span></div>)}</div> : <p className="small mut">Записей нет. Вес вводится на вкладке «Статы».</p>}</Panel>
        <Panel><div className="pm-title"><span>О приложении</span></div>
          <p className="small t2">GymQuest — игровой дневник тренировок в стиле San Andreas. Respect начисляется за миссии, тоннаж, рекорды и проработку отстающих мышц. {inTelegram ? 'Запущено внутри Telegram.' : 'Открыто в браузере: бэкап в Telegram недоступен.'}</p>
          <Cta danger onClick={() => setResetOpen(true)} style={{ marginTop: 10 }}>Сбросить все данные</Cta></Panel>
      </div>
      <Modal open={importOpen} onClose={() => setImportOpen(false)}>
        <div className="mono goldc">Импорт данных</div><p className="small t2">Вставь содержимое JSON-файла экспорта. Текущие данные будут заменены.</p>
        <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(setImportText); }} />
        <textarea rows={5} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"version":1,…}' />
        <Cta disabled={!importText.trim()} onClick={doImport}>Импортировать</Cta>
      </Modal>
      <Modal open={resetOpen} onClose={() => setResetOpen(false)}>
        <div className="mono goldc">Сбросить всё?</div><p className="small t2">Удалятся миссии, Respect, трофеи и вес тела. API-ключ останется.</p>
        <div className="row"><Cta dark onClick={() => setResetOpen(false)} style={{ flex: 1 }}>Оставить</Cta><Cta danger onClick={() => { dispatch({ type: 'reset' }); setResetOpen(false); toast('Данные сброшены'); }} style={{ flex: 1 }}>Сбросить</Cta></div>
      </Modal>
    </div>
  );
};
