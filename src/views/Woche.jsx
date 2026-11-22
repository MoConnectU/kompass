import { Card, ProgressBar, Tabs, TextArea } from '@heroui/react';
import { useStore, useNow, weekStats, activeQuests, questById, areaById, actions } from '../store.js';
import { addDays, mondayOf, todayKey, weekLabel, fmtH, fmtShort, hours, WD, parseDk } from '../util.js';
import { Pin, Section, Empty } from '../ui.jsx';
import Header from './Header.jsx';

function Bar({ value, color, label }) {
  return (
    <ProgressBar aria-label={label} value={value} size="sm" className="mt-2 w-full">
      <ProgressBar.Track><ProgressBar.Fill style={color ? { background: color } : undefined} /></ProgressBar.Track>
    </ProgressBar>
  );
}
const pct = (ms, goalH) => goalH ? Math.min(100, Math.max(ms ? 1.5 : 0, hours(ms) / goalH * 100)) : (ms ? 100 : 0);
const de = n => String(n).replace('.', ',');

function Columns({ values, labels, highlight, height = 120 }) {
  const max = Math.max(1, ...values.map(v => v.total));
  return (
    <>
      <div className="flex items-end gap-2 border-b border-border" style={{ height }}>
        {values.map((v, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] tabular text-muted">{fmtShort(v.total)}</span>
            <div className="flex w-full max-w-8 flex-col-reverse overflow-hidden rounded-t bg-surface-secondary" style={{ minHeight: 2 }}>
              {v.segs.map(([c, ms], j) => <i key={j} className="block w-full" style={{ height: Math.max(2, ms / max * (height - 28)), background: c }} />)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">{labels.map((l, i) => <span key={i} className={'flex-1 text-center text-xs ' + (highlight === i ? 'font-semibold text-foreground' : 'text-muted')}>{l}</span>)}</div>
    </>
  );
}

export default function Woche({ week, setWeek }) {
  const S = useStore(); useNow();
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const st = weekStats(days);
  const cur = week === mondayOf(todayKey());
  const goal = activeQuests().reduce((a, q) => a + (Number(q.weeklyGoalH) || 0), 0);
  const qs = S.quests.filter(q => !q.archived || st.per[q.id]);

  // Fachbereiche: Zeit + erledigte Anfragen
  const areaIds = Array.from(new Set([...Object.keys(st.perArea), ...st.doneTasks.filter(t => t.areaId).map(t => t.areaId)])).filter(id => areaById(id));
  areaIds.sort((a, b) => (st.perArea[b] || 0) - (st.perArea[a] || 0));
  const areaMax = Math.max(1, ...areaIds.map(id => st.perArea[id] || 0));
  const openByArea = id => S.tasks.filter(t => !t.done && t.areaId === id).length;

  const dayCols = st.perDay.map(o => ({ total: Object.values(o).reduce((a, b) => a + b, 0), segs: Object.entries(o).map(([k, ms]) => [k === '_' ? 'var(--border)' : (questById(k) || {}).color, ms]) }));
  const hist = Array.from({ length: 8 }, (_, i) => addDays(week, -7 * (7 - i)));
  const histCols = hist.map(m => { const q = weekStats(Array.from({ length: 7 }, (_, i) => addDays(m, i))).quest; return { total: q, segs: [[m === week ? 'var(--accent)' : 'var(--border)', q]] }; });
  const r = S.reflections[week] || {};

  return (
    <>
      <Header kicker={cur ? 'Diese Woche' : 'Woche'} title={weekLabel(week)}
        onPrev={() => setWeek(addDays(week, -7))} onNext={() => setWeek(addDays(week, 7))}
        onReset={!cur ? () => setWeek(mondayOf(todayKey())) : null} resetLabel="Jetzt" />

      <Section>
        <p className="text-3xl font-semibold tracking-tight">{fmtH(st.quest)} <span className="text-base font-normal text-muted">{goal ? `von ${de(goal)} h Quest-Zeit` : 'Quest-Zeit'}</span></p>
        {goal > 0 && <Bar value={pct(st.quest, goal)} label="Quest-Zeit gegen Wochenziel" />}
        <p className="mt-3 text-sm text-muted">{fmtH(st.all)} insgesamt gearbeitet, davon {st.all ? Math.round(st.quest / st.all * 100) : 0} % für Quests. {st.done} Aufgabe{st.done === 1 ? '' : 'n'} erledigt.</p>
      </Section>

      <Tabs variant="secondary" className="mb-7 w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Auswertung">
            <Tabs.Tab id="quests">Nach Quest<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="areas">Nach Fachbereich<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="quests" className="pt-3">
          {qs.length ? qs.map(q => {
            const ms = st.per[q.id] || 0, g = Number(q.weeklyGoalH) || 0;
            return (
              <div key={q.id} className="border-b border-separator py-3 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 font-medium"><Pin color={q.color} />{q.name}</span>
                  <span className="text-sm tabular text-muted">{fmtH(ms)}{g ? ` von ${de(g)} h` : ''}</span>
                </div>
                <Bar value={pct(ms, g)} color={q.color} label={q.name} />
              </div>
            );
          }) : <Empty>Noch keine Quests.</Empty>}
        </Tabs.Panel>
        <Tabs.Panel id="areas" className="pt-3">
          {areaIds.length ? areaIds.map(id => {
            const ar = areaById(id), ms = st.perArea[id] || 0;
            const done = st.doneTasks.filter(t => t.areaId === id).length, open = openByArea(id);
            return (
              <div key={id} className="border-b border-separator py-3 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 font-medium"><Pin color={ar.color} />{ar.name}</span>
                  <span className="text-sm tabular text-muted">{fmtH(ms)}</span>
                </div>
                <Bar value={ms / areaMax * 100} color={ar.color} label={ar.name} />
                <p className="mt-1.5 text-xs text-muted">{done} erledigt, {open} offen</p>
              </div>
            );
          }) : <Empty>Noch keine Zeit für Fachbereiche erfasst. Wähle beim Anlegen einer Anfrage den Fachbereich aus.</Empty>}
        </Tabs.Panel>
      </Tabs>

      <Section title="Tage"><Columns values={dayCols} labels={WD} highlight={days.indexOf(todayKey())} /></Section>
      <Section title="Letzte acht Wochen"><Columns values={histCols} height={96} labels={hist.map(m => parseDk(m).getDate() + '.' + (parseDk(m).getMonth() + 1) + '.')} highlight={7} /></Section>

      <Section title="Rückblick" aside={r.savedAt ? 'Gespeichert' : 'etwa 20 Minuten'}>
        <Card className="gap-4 p-4">
          {[['good', 'Was lief gut?'], ['bad', 'Was lief schlecht, und warum?'], ['improve', 'Was ändere ich nächste Woche konkret?'], ['coherence', 'Passen meine Ziele und mein Alltag noch zusammen?']].map(([k, l]) => (
            <label key={week + k} className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{l}</span>
              <TextArea defaultValue={r[k] || ''} rows={3} onChange={e => actions.setReflection(week, k, e.target.value)} />
            </label>
          ))}
          <p className="text-xs text-muted">Wird beim Tippen gespeichert.</p>
        </Card>
      </Section>
    </>
  );
}
