import { useState } from 'react';
import { Button, Card, Input, Disclosure, toast } from '@heroui/react';
import { useStore, useNow, actions, groups, activeQuests, activeAreas, questById, isQuestTask } from '../store.js';
import { todayKey, addDays, relDay, weekdayLong, longDate, hm, fmtDur, fmtH, dk } from '../util.js';
import { Pin, Section, Empty, TaskRow } from '../ui.jsx';
import Header from './Header.jsx';

function Pick({ on, color, children, onPress }) {
  return (
    <button type="button" onClick={onPress} aria-pressed={on}
      className={'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ' + (on ? 'border-foreground bg-surface-secondary text-foreground' : 'border-border text-muted hover:text-foreground')}>
      {color && <Pin color={color} size={8} />}{children}
    </button>
  );
}

export default function Heute({ day, setDay, onEdit, go }) {
  const S = useStore(); useNow();
  const t = todayKey();
  const aq = activeQuests(), areas = activeAreas();
  const [title, setTitle] = useState('');
  const [questId, setQuestId] = useState(null);
  const [areaId, setAreaId] = useState(null);
  const [due, setDue] = useState('');
  const [laterOpen, setLaterOpen] = useState(false);
  const q = questId && aq.find(x => x.id === questId) ? questId : null;
  const a = areaId && areas.find(x => x.id === areaId) ? areaId : null;

  const g = groups(day);
  const overdue = S.tasks.filter(x => !x.done && x.date < t).length;
  const otherOpen = laterOpen || aq.length === 0;

  const submit = e => {
    e.preventDefault();
    if (!title.trim()) return;
    actions.addTask(title, { questId: q, areaId: a, due: due || null, day });
    if (!q) { setLaterOpen(true); if (aq.length) toast('Unter „Später“ abgelegt'); }
    setTitle(''); setDue(''); setAreaId(null);
  };

  // Logbuch + Quest-Zeit des Tages
  const sessions = S.sessions.filter(s => dk(new Date(s.start)) === day).sort((x, y) => x.start - y.start);
  let questMs = 0, allMs = 0;
  for (const s of sessions) { const d = s.end - s.start; allMs += d; if (s.questId && questById(s.questId)) questMs += d; }
  const live = S.activeTimer && dk(new Date(S.activeTimer.start)) === day;
  const liveTask = live && S.tasks.find(x => x.id === S.activeTimer.taskId);
  if (live) { const d = Date.now() - S.activeTimer.start; allMs += d; if (liveTask && isQuestTask(liveTask)) questMs += d; }

  const rel = relDay(day);
  return (
    <>
      <Header kicker={(rel ? rel + ', ' : '') + weekdayLong(day)} title={longDate(day)}
        onPrev={() => setDay(addDays(day, -1))} onNext={() => setDay(addDays(day, 1))}
        onReset={day !== t ? () => setDay(t) : null} resetLabel="Heute" />

      {day === t && overdue > 0 && (
        <Card variant="secondary" className="mb-5 flex-row items-center justify-between gap-3 p-3">
          <span className="text-sm">{overdue} offene Aufgabe{overdue > 1 ? 'n' : ''} von früheren Tagen</span>
          <Button size="sm" variant="secondary" onPress={() => { actions.pullOverdue(); toast.success('Auf heute geholt'); }}>Auf heute holen</Button>
        </Card>
      )}

      <Card className="mb-2 gap-3 p-3">
        <form onSubmit={submit} className="flex gap-2">
          <Input aria-label="Neue Aufgabe oder Anfrage" placeholder="Neue Aufgabe oder Anfrage" value={title} onChange={e => setTitle(e.target.value)} className="flex-1" autoComplete="off" />
          <Button type="submit" isIconOnly aria-label="Hinzufügen">+</Button>
        </form>
        {aq.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {aq.map(x => <Pick key={x.id} on={q === x.id} color={x.color} onPress={() => setQuestId(x.id)}>{x.name}</Pick>)}
            <Pick on={!q} onPress={() => setQuestId(null)}>Ohne Quest</Pick>
          </div>
        )}
        {areas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Fachbereich</span>
            {areas.map(x => <Pick key={x.id} on={a === x.id} color={x.color} onPress={() => setAreaId(a === x.id ? null : x.id)}>{x.name}</Pick>)}
          </div>
        )}
        <label className="flex items-center gap-2 text-xs text-muted">
          Frist
          <input type="date" value={due} onChange={e => setDue(e.target.value)} className="rounded-lg border border-border bg-field px-2 py-1 text-sm text-foreground" />
          {due && <button type="button" className="text-muted underline" onClick={() => setDue('')}>entfernen</button>}
        </label>
      </Card>
      {aq.length === 0 && (
        <p className="mb-6 text-sm text-muted">Tipp: Unter <button type="button" className="text-accent underline" onClick={() => go('einrichten')}>Einrichten</button> legst du mit einem Klick die Quests für die Arbeit an.</p>
      )}

      <Section className="mt-6" title="Reihenfolge" aside={g.quest.length > 0 && day === t ? <Button size="sm" onPress={() => go('fokus')}>Fokus starten</Button> : null}>
        {g.quest.length ? <ol>{g.quest.map((x, i) => <TaskRow key={x.id} t={x} num={i + 1} sortable onEdit={onEdit} />)}</ol> : <Empty>Keine offenen Quest-Aufgaben.</Empty>}
      </Section>

      <Disclosure isExpanded={otherOpen} onExpandedChange={setLaterOpen} className="mb-7 border-t border-dashed border-border pt-3">
        <Disclosure.Heading>
          <Disclosure.Trigger className="flex w-full items-baseline justify-between gap-3 text-left">
            <span className="text-base font-semibold">Später</span>
            <span className="text-sm text-muted">{g.other.length} ohne Quest {otherOpen ? '▴' : '▾'}</span>
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content><Disclosure.Body>
          {g.other.length ? <ul className="mt-1">{g.other.map(x => <TaskRow key={x.id} t={x} sortable onEdit={onEdit} />)}</ul> : <Empty>Nichts offen.</Empty>}
        </Disclosure.Body></Disclosure.Content>
      </Disclosure>

      <Section title="Erledigt" aside={fmtH(questMs) + ' Quest-Zeit'}>
        {g.done.length ? <ul>{g.done.map(x => <TaskRow key={x.id} t={x} onEdit={onEdit} />)}</ul> : <Empty>Noch nichts erledigt.</Empty>}
      </Section>

      <Section title="Logbuch" aside={fmtDur(allMs) + ' gearbeitet'}>
        {sessions.length || live ? (
          <ul className="border-l border-border pl-4">
            {sessions.map(s => {
              const task = S.tasks.find(x => x.id === s.taskId); const qq = questById(s.questId);
              return (
                <li key={s.id} className="relative grid grid-cols-[96px_1fr_auto] items-baseline gap-3 py-1.5 text-sm">
                  <span className="absolute -left-[21px] top-3 size-2.5 rounded-full" style={{ background: qq ? qq.color : 'var(--border)' }} />
                  <span className="tabular text-muted">{hm(s.start)}–{hm(s.end)}</span>
                  <span className="truncate">{task ? task.title : s.title}</span>
                  <span className="tabular text-muted">{fmtDur(s.end - s.start)}</span>
                </li>
              );
            })}
            {live && (
              <li className="relative grid grid-cols-[96px_1fr_auto] items-baseline gap-3 py-1.5 text-sm font-medium text-accent">
                <span className="absolute -left-[21px] top-3 size-2.5 rounded-full bg-accent" />
                <span className="tabular">{hm(S.activeTimer.start)}–jetzt</span>
                <span className="truncate text-foreground">{liveTask ? liveTask.title : ''}</span>
                <span className="tabular">{fmtDur(Date.now() - S.activeTimer.start)}</span>
              </li>
            )}
          </ul>
        ) : <Empty>Hier erscheint deine echte Arbeitszeit, sobald du im Fokus den Timer startest.</Empty>}
      </Section>
    </>
  );
}
