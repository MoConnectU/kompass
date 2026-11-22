import { useEffect, useState } from 'react';
import { Button, Input, Label, ListBox, Modal, Select, TextArea, TextField } from '@heroui/react';
import { useStore, actions, spentMs } from '../store.js';
import { addDays, todayKey, fmtDur } from '../util.js';

function DateField({ label, value, onChange, clearable }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-foreground">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <input type="date" value={value || ''} onChange={e => onChange(e.target.value || null)}
          className="w-full rounded-xl border border-border bg-field px-3 py-2 text-foreground" />
        {clearable && value && <button type="button" className="text-xs text-muted underline" onClick={() => onChange(null)}>leeren</button>}
      </span>
    </label>
  );
}

function Pick({ label, value, onChange, items, emptyLabel }) {
  return (
    <Select className="w-full" value={value || '__none'} onChange={k => onChange(k === '__none' ? null : k)}>
      <Label>{label}</Label>
      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="__none" textValue={emptyLabel}>{emptyLabel}<ListBox.ItemIndicator /></ListBox.Item>
          {items.map(x => <ListBox.Item key={x.id} id={x.id} textValue={x.name}>{x.name}<ListBox.ItemIndicator /></ListBox.Item>)}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export default function TaskModal({ id, onClose, go }) {
  const S = useStore();
  const t = id ? S.tasks.find(x => x.id === id) : null;
  const [f, setF] = useState(null);
  useEffect(() => { if (t) setF({ title: t.title, questId: t.questId || null, areaId: t.areaId || null, date: t.date, receivedAt: t.receivedAt || null, due: t.due || null, notes: t.notes || '' }); else setF(null); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  const open = !!(t && f);
  const save = extra => { actions.updateTask(t.id, { ...f, title: f.title.trim() || t.title, ...extra }); onClose(); };

  const quests = S.quests.filter(q => !q.archived || (t && q.id === t.questId));
  const areas = S.areas.filter(a => !a.archived || (t && a.id === t.areaId));

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={o => { if (!o) onClose(); }}>
        <Modal.Container placement="auto">
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header><Modal.Heading>Aufgabe bearbeiten</Modal.Heading></Modal.Header>
            {open && (
              <Modal.Body className="flex flex-col gap-4">
                <TextField>
                  <Label>Titel</Label>
                  <Input value={f.title} onChange={e => set('title', e.target.value)} />
                </TextField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Pick label="Quest" value={f.questId} onChange={v => set('questId', v)} items={quests} emptyLabel="Ohne Quest" />
                  <Pick label="Fachbereich" value={f.areaId} onChange={v => set('areaId', v)} items={areas} emptyLabel="Kein Fachbereich" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <DateField label="Geplant für" value={f.date} onChange={v => set('date', v || t.date)} />
                  <DateField label="Eingang" value={f.receivedAt} onChange={v => set('receivedAt', v)} clearable />
                  <DateField label="Frist" value={f.due} onChange={v => set('due', v)} clearable />
                </div>
                <TextField>
                  <Label>Notizen</Label>
                  <TextArea rows={4} value={f.notes} onChange={e => set('notes', e.target.value)} />
                </TextField>
                <p className="text-sm text-muted">Investierte Zeit: {fmtDur(spentMs(t.id))}</p>
              </Modal.Body>
            )}
            {open && (
              <Modal.Footer className="flex flex-wrap gap-2">
                <Button variant="danger-soft" onPress={() => { if (confirm('Aufgabe löschen? Die erfasste Zeit bleibt im Logbuch.')) { actions.deleteTask(t.id); onClose(); } }}>Löschen</Button>
                <span className="flex-1" />
                {!t.done && <Button variant="secondary" onPress={() => save({ date: addDays(todayKey(), 1) })}>Auf morgen</Button>}
                {!t.done && <Button variant="secondary" onPress={() => { actions.updateTask(t.id, { ...f, title: f.title.trim() || t.title }); actions.focusNow(t.id); onClose(); go('fokus'); }}>Jetzt fokussieren</Button>}
                <Button onPress={() => save()}>Speichern</Button>
              </Modal.Footer>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
