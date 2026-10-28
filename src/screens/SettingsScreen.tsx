import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Card, Modal } from '../components/ui';
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
  const [importText, setImportText] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => { if (cloudAvailable()) cloudMeta().then(setMeta).catch(() => null); }, []);

  const saveProfile = () => { dispatch({ type: 'setProfile', patch: { name: name.trim(), apiKey: key.trim() || undefined } }); toast('Сохранено'); };

  const backup = async () => {
    setBusy(true);
    try { const m = await cloudSave(serialize(state)); setMeta(m); toast('Бэкап сохранён в Telegram'); }
    catch (e) { toast(`Ошибка: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };
  const restore = async () => {
    if (!confirm('Заменить текущие данные бэкапом из облака Telegram?')) return;
    setBusy(true);
    try { const raw = await cloudLoad(); if (!raw) { toast('В облаке нет бэкапа'); return; } dispatch({ type: 'hydrate', state: parseImport(raw) }); toast('Данные восстановлены'); }
    catch (e) { toast(`Ошибка: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };

  const exportJson = async () => {
    const json = serialize(state);
    try {
      if (navigator.share && inTelegram) {
        const file = new File([json], `gymquest-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
        await navigator.share({ files: [file], title: 'GymQuest export' });
        return;
      }
    } catch { /* fallthrough */ }
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `gymquest-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch { /* ignore */ }
    try { await navigator.clipboard.writeText(json); toast('JSON скопирован в буфер'); } catch { toast('Файл скачан'); }
  };

  const doImport = () => {
    try { dispatch({ type: 'hydrate', state: parseImport(importText) }); setImportOpen(false); setImportText(''); toast('Импортировано'); }
    catch (e) { toast(`Ошибка: ${(e as Error).message}`); }
  };

  const bwSorted = [...state.bodyweight].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="screen">
      <div className="row"><button className="btn icon ghost" onClick={onBack} aria-label="Назад">←</button><h1 style={{ fontSize: 20 }}>Настройки</h1></div>

      <Card title="Профиль">
        <div className="stack">
          <label className="small muted">Имя героя<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Атлет" /></label>
          <label className="small muted">API-ключ Anthropic (для ИИ-тренера)
            <div className="row">
              <input type={showKey ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" />
              <button className="btn icon" onClick={() => setShowKey((v) => !v)} aria-label="Показать ключ">{showKey ? '🙈' : '👁️'}</button>
            </div>
          </label>
          <p className="tiny muted">Ключ хранится только в памяти этого приложения на твоём устройстве и отправляется напрямую в API Anthropic. Получить ключ: console.anthropic.com → API Keys.</p>
          <button className="btn primary block" onClick={saveProfile}>Сохранить</button>
        </div>
      </Card>

      <Card title="Бэкап в Telegram" right={cloudAvailable() ? <span className="chip good">доступно</span> : <span className="chip">только в Telegram</span>}>
        <p className="small text-2">Данные хранятся на устройстве. Бэкап в облако Telegram делается автоматически после каждой тренировки и переносит прогресс между устройствами.</p>
        {meta && <p className="small muted" style={{ marginTop: 6 }}>Последний бэкап: {fmtDateTime(meta.savedAt)} · {fmtNum(meta.bytes / 1024, 1)} КБ</p>}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn grow" disabled={!cloudAvailable() || busy} onClick={backup}>☁️ Сохранить</button>
          <button className="btn grow" disabled={!cloudAvailable() || busy || !meta} onClick={restore}>⬇️ Восстановить</button>
        </div>
      </Card>

      <Card title="Экспорт и импорт">
        <div className="row">
          <button className="btn grow" onClick={exportJson}>📤 Экспорт JSON</button>
          <button className="btn grow" onClick={() => setImportOpen(true)}>📥 Импорт</button>
        </div>
      </Card>

      <Card title="Журнал веса тела">
        {bwSorted.length ? (
          <div className="list">
            {bwSorted.slice(0, 20).map((b) => (
              <div key={b.date} className="row between" style={{ padding: '8px 0' }}>
                <span className="text-2">{fmtDate(b.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className="row"><b>{b.kg} кг</b><button className="x" onClick={() => dispatch({ type: 'removeBodyweight', date: b.date })}>✕</button></span>
              </div>
            ))}
          </div>
        ) : <p className="small muted">Записей нет. Вес вводится на вкладке «Прогресс».</p>}
      </Card>

      <Card title="О приложении">
        <p className="small text-2">GymQuest — игровой дневник тренировок. XP начисляется за тренировки, тоннаж, рекорды и проработку отстающих мышц. {inTelegram ? 'Запущено внутри Telegram.' : 'Открыто в браузере: бэкап в Telegram недоступен, данные хранятся локально.'}</p>
        <button className="btn danger block" style={{ marginTop: 10 }} onClick={() => setResetOpen(true)}>Сбросить все данные</button>
      </Card>

      <Modal open={importOpen} onClose={() => setImportOpen(false)}>
        <h2>Импорт данных</h2>
        <p className="small text-2">Вставь содержимое JSON-файла экспорта. Текущие данные будут заменены.</p>
        <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(setImportText); }} />
        <textarea rows={5} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"version":1,…}' />
        <button className="btn primary block" disabled={!importText.trim()} onClick={doImport}>Импортировать</button>
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)}>
        <h2>Сбросить всё?</h2>
        <p className="text-2">Удалятся тренировки, XP, достижения и вес тела. API-ключ останется. Это нельзя отменить.</p>
        <div className="row">
          <button className="btn grow" onClick={() => setResetOpen(false)}>Оставить</button>
          <button className="btn danger grow" onClick={() => { dispatch({ type: 'reset' }); setResetOpen(false); toast('Данные сброшены'); }}>Сбросить</button>
        </div>
      </Modal>
    </div>
  );
};
