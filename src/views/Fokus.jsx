import { Button, TextArea, Chip } from '@heroui/react';
import { useStore, useNow, actions, focusQueue, groups, questById, areaById, spentMs, taskColor, commitQuiet } from '../store.js';
import { todayKey, fmtClock } from '../util.js';
import { Pin, SyncDot, DueChip } from '../ui.jsx';

const R = 130, C = 2 * Math.PI * R;
function Dial({ ms, running, children }) {
  const frac = (ms % 3600000) / 3600000, ang = frac * 2 * Math.PI;
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const a = i * 6 * Math.PI / 180, major = i % 5 === 0, r1 = 146, r2 = major ? 158 : 153;
    ticks.push(<line key={i} className={'tick' + (major ? ' major' : '')} strokeWidth={major ? 2 : 1}
      x1={Math.sin(a) * r1} y1={-Math.cos(a) * r1} x2={Math.sin(a) * r2} y2={-Math.cos(a) * r2} />);
  }
  return (
    <div className={'dial' + (running ? ' run' : '')}>
      <svg viewBox="-170 -170 340 340" aria-hidden="true">
        {ticks}
        <path className="north" d="M0 -168 L6 -160 L-6 -160 Z" />
        <circle className="track" r={R} fill="none" strokeWidth="5" />
        <circle className="prog" r={R} fill="none" strokeWidth="5" strokeLinecap="round" transform="rotate(-90)" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
        {ms > 0 && <circle className="needle" r="7" cx={Math.sin(ang) * R} cy={-Math.cos(ang) * R} />}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">{children}</div>
    </div>
  );
}

export default function Fokus({ go }) {
  const S = useStore(); useNow();
  let cur = null;
  if (S.activeTimer) cur = S.tasks.find(x => x.id === S.activeTimer.taskId && !x.done) || null;
  if (!cur) cur = focusQueue()[0] || null;

  if (!cur) {
    const doneToday = groups(todayKey()).done.length;
    return (
      <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center gap-6 text-center">
        <Dial ms={0}><span className="text-sm text-muted">{doneToday ? doneToday + ' erledigt' : 'Kein Kurs gesetzt'}</span></Dial>
        <p className="text-2xl font-semibold">{doneToday ? 'Alles erledigt für heute.' : 'Für heute ist noch nichts geplant.'}</p>
        <Button variant="secondary" onPress={() => go('heute')}>{doneToday ? 'Zur Tagesübersicht' : 'Tag planen'}</Button>
      </div>
    );
  }
  const quest = questById(cur.questId), area = cur.areaId && areaById(cur.areaId);
  const running = S.activeTimer?.taskId === cur.id;
  const sp = spentMs(cur.id);
  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center gap-5 text-center">
      <div className="flex items-center gap-2 text-sm text-muted"><SyncDot /><Pin color={taskColor(cur)} size={8} />{quest && !quest.archived ? quest.name : 'Ohne Quest'}</div>
      <div className="flex flex-col items-center gap-2">
        {area && <Chip size="sm" variant="soft" style={{ color: area.color }}>{area.name}</Chip>}
        <h1 className="max-w-[22ch] text-2xl font-semibold leading-snug sm:text-3xl">{cur.title}</h1>
        <DueChip due={cur.due} />
      </div>
      <Dial ms={sp} running={running}>
        <span className={'tabular text-5xl font-light ' + (running ? 'text-accent' : '')}>{fmtClock(sp)}</span>
        <span className="text-sm text-muted">{running ? 'läuft' : sp ? 'pausiert' : 'bereit'}</span>
      </Dial>
      <div className="flex flex-wrap justify-center gap-2">
        {running
          ? <Button variant="secondary" size="lg" onPress={() => actions.pause()}>Pausieren</Button>
          : <Button size="lg" onPress={() => actions.start(cur.id)}>{sp ? 'Weiter' : 'Starten'}</Button>}
        <Button size="lg" variant="tertiary" className="bg-success text-success-foreground" onPress={() => actions.complete(cur.id)}>Erledigt</Button>
      </div>
      <TextArea key={cur.id} aria-label="Notizen" placeholder="Notizen zu dieser Aufgabe" defaultValue={cur.notes}
        onChange={e => { const v = e.target.value; commitQuiet(S => { const t = S.tasks.find(x => x.id === cur.id); if (t) t.notes = v; }); }}
        className="w-full max-w-md text-left" rows={3} />
      <Button variant="ghost" size="sm" onPress={() => actions.skip(cur.id)}>Ans Ende der Liste schieben</Button>
    </div>
  );
}
