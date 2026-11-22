import { useState } from 'react';
import { Button, Card, Input, Label, TextField, toast } from '@heroui/react';
import { useStore, actions, commit, commitQuiet, activeQuests, activeAreas, COLORS, MAX_QUESTS, sync, syncTitle, syncNow, connectSync, disconnectSync, S as STATE } from '../store.js';
import { todayKey } from '../util.js';
import { Pin, Section, SyncDot } from '../ui.jsx';
import Header from './Header.jsx';

function Palette({ value, onPick }) {
  return (
    <div role="group" aria-label="Farbe" className="flex flex-wrap gap-2">
      {COLORS.map(c => (
        <button key={c} type="button" aria-label="Farbe wählen" aria-pressed={value === c} onClick={() => onPick(c)}
          className={'size-6 rounded-full ' + (value === c ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : '')} style={{ background: c }} />
      ))}
    </div>
  );
}
const setQ = (id, k, v) => commitQuiet(S => { const q = S.quests.find(x => x.id === id); if (q) q[k] = v; });
const setA = (id, k, v) => commitQuiet(S => { const a = S.areas.find(x => x.id === id); if (a) a[k] = v; });

export default function Einrichten() {
  const S = useStore();
  const aq = activeQuests(), archQ = S.quests.filter(q => q.archived);
  const areas = activeAreas(), archA = S.areas.filter(a => a.archived);
  const [newArea, setNewArea] = useState('');
  const [code, setCode] = useState('');

  return (
    <>
      <Header kicker="Kompass" title="Einrichten" />

      {!aq.some(q => q.name === 'Anfragen') && (
        <Card variant="secondary" className="mb-7 gap-3 p-4">
          <Card.Title>Für die Arbeit einrichten</Card.Title>
          <Card.Description>Legt zwei Quests an: „Anfragen“ für die Arbeit der Fachbereiche (25 h pro Woche) und „Optimierung“ für alles, was Abläufe dauerhaft vereinfacht (3 h pro Woche). Beides kannst du danach anpassen.</Card.Description>
          <div><Button onPress={() => { actions.setupWork(); toast.success('Quests für die Arbeit angelegt'); }}>Quests anlegen</Button></div>
        </Card>
      )}

      <Section title={`Quests (${aq.length}/${MAX_QUESTS})`}>
        <p className="mb-3 text-sm text-muted">Höchstens drei große Ziele. Das Wochenziel misst Stunden, die du investierst, nicht das Ergebnis.</p>
        <div className="flex flex-col gap-3">
          {aq.map(q => (
            <Card key={q.id} className="gap-3 p-4">
              <div className="flex items-center gap-2">
                <Pin color={q.color} size={12} />
                <Input aria-label="Name der Quest" defaultValue={q.name} onChange={e => setQ(q.id, 'name', e.target.value)} onBlur={() => commit()} className="flex-1 font-semibold" />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <TextField>
                  <Label>Woran merkst du, dass sie geschafft ist?</Label>
                  <Input defaultValue={q.goal || ''} placeholder="z. B. Anfragen innerhalb von 3 Tagen erledigt" onChange={e => setQ(q.id, 'goal', e.target.value)} />
                </TextField>
                <TextField>
                  <Label>Stunden pro Woche</Label>
                  <Input type="number" min="0" step="0.5" inputMode="decimal" defaultValue={q.weeklyGoalH ?? ''} onChange={e => setQ(q.id, 'weeklyGoalH', e.target.value === '' ? '' : Number(e.target.value))} onBlur={() => commit()} />
                </TextField>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Palette value={q.color} onPick={c => commit(S => { S.quests.find(x => x.id === q.id).color = c; })} />
                <Button size="sm" variant="ghost" onPress={() => { if (confirm(`„${q.name}“ archivieren? Aufgaben bleiben erhalten.`)) commit(S => { S.quests.find(x => x.id === q.id).archived = true; }); }}>Archivieren</Button>
              </div>
            </Card>
          ))}
        </div>
        <Button className="mt-3 w-full" variant={aq.length ? 'secondary' : 'primary'} onPress={() => actions.addQuest()}>Quest hinzufügen</Button>
        {aq.length >= MAX_QUESTS && <p className="mt-2 text-sm text-warning">Mehr als drei Quests gleichzeitig verwässern den Fokus.</p>}
        {archQ.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-sm text-muted">Archiv</p>
            {archQ.map(q => <div key={q.id} className="flex items-center gap-2 py-1 text-sm"><Pin color={q.color} /><span className="flex-1">{q.name}</span><Button size="sm" variant="ghost" onPress={() => commit(S => { S.quests.find(x => x.id === q.id).archived = false; })}>Reaktivieren</Button></div>)}
          </div>
        )}
      </Section>

      <Section title="Fachbereiche">
        <p className="mb-3 text-sm text-muted">Von wem kommen deine Anfragen? Der Fachbereich steht vor dem Titel, und in der Woche siehst du die Zeit pro Fachbereich.</p>
        {areas.length > 0 && (
          <Card className="mb-3 p-2">
            {areas.map(a => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 border-b border-separator p-2 last:border-b-0">
                <Pin color={a.color} />
                <Input aria-label="Name des Fachbereichs" defaultValue={a.name} onChange={e => setA(a.id, 'name', e.target.value)} onBlur={() => commit()} className="min-w-32 flex-1" />
                <Palette value={a.color} onPick={c => commit(S => { S.areas.find(x => x.id === a.id).color = c; })} />
                <Button size="sm" variant="ghost" onPress={() => commit(S => { S.areas.find(x => x.id === a.id).archived = true; })}>Entfernen</Button>
              </div>
            ))}
          </Card>
        )}
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); actions.addArea(newArea); setNewArea(''); }}>
          <Input aria-label="Neuer Fachbereich" placeholder="z. B. Vertrieb, Controlling, Marktfolge" value={newArea} onChange={e => setNewArea(e.target.value)} className="flex-1" />
          <Button type="submit" variant="secondary">Hinzufügen</Button>
        </form>
        {archA.length > 0 && <p className="mt-2 text-xs text-muted">Entfernt: {archA.map(a => a.name).join(', ')}. <button type="button" className="underline" onClick={() => commit(S => S.areas.forEach(a => { a.archived = false; }))}>Wiederherstellen</button></p>}
      </Section>

      <Section title="Sync zwischen Handy und PC">
        <p className="mb-3 text-sm text-muted">Gib auf allen Geräten denselben geheimen Code ein, mindestens 8 Zeichen. Wer den Code kennt, sieht deine Daten.</p>
        {sync.code ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-sm"><SyncDot />{syncTitle()}</span>
            <Button size="sm" variant="secondary" onPress={async () => { (await syncNow()) ? toast.success('Synchronisiert') : toast.danger('Sync fehlgeschlagen'); }}>Jetzt synchronisieren</Button>
            <Button size="sm" variant="danger-soft" onPress={() => { if (confirm('Sync auf diesem Gerät trennen? Die Daten bleiben lokal erhalten.')) disconnectSync(); }}>Trennen</Button>
          </div>
        ) : (
          <form className="flex gap-2" onSubmit={async e => {
            e.preventDefault();
            if (code.trim().length < 8) { toast.warning('Der Code braucht mindestens 8 Zeichen.'); return; }
            const r = await connectSync(code.trim());
            r.ok ? toast.success(r.existing ? 'Verbunden, Daten geladen' : 'Verbunden, neuer Sync-Bereich angelegt') : toast.danger('Verbindung fehlgeschlagen: ' + r.error);
            setCode('');
          }}>
            <Input type="password" aria-label="Sync-Code" placeholder="Sync-Code" value={code} onChange={e => setCode(e.target.value)} className="flex-1" autoComplete="off" />
            <Button type="submit">Verbinden</Button>
          </form>
        )}
      </Section>

      <Section title="Daten">
        <p className="mb-3 text-sm text-muted">Trage keine Kundennamen oder vertraulichen Inhalte ein. Formuliere Anfragen neutral.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onPress={() => {
            const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kompass-backup-' + todayKey() + '.json'; a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }}>Backup exportieren</Button>
          <label className="button button--secondary button--md cursor-pointer">
            Backup importieren
            <input type="file" accept="application/json" className="hidden" onChange={e => {
              const f = e.target.files[0]; if (!f) return;
              const rd = new FileReader();
              rd.onload = () => {
                try { const s = JSON.parse(rd.result); if (!s || !Array.isArray(s.tasks)) throw 0; if (confirm('Aktuelle Daten durch das Backup ersetzen?')) { actions.importState(s); toast.success('Backup importiert'); } }
                catch (_) { toast.danger('Die Datei ist kein gültiges Kompass-Backup.'); }
              };
              rd.readAsText(f);
            }} />
          </label>
        </div>
      </Section>
    </>
  );
}
