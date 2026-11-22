import { Button, Chip } from '@heroui/react';
import { useStore, actions, spentMs, taskColor, areaById, sync, syncTitle } from './store.js';
import { fmtDur, todayKey, daysBetween, shortDate } from './util.js';

export const Pin = ({ color, size = 10 }) => (
  <span aria-hidden="true" className="inline-block shrink-0 rounded-full" style={{ background: color, width: size, height: size }} />
);

export function SyncDot() {
  useStore();
  const c = !sync.code ? 'var(--border)' : sync.status === 'err' ? 'var(--danger)' : sync.status === 'busy' ? 'var(--warning)' : 'var(--success)';
  return <span title={syncTitle()} aria-label={syncTitle()} className="inline-block size-2 rounded-full" style={{ background: c }} />;
}

export function Section({ title, aside, children, className = '' }) {
  return (
    <section className={'mb-7 ' + className}>
      {(title || aside) && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          {aside && <div className="text-sm text-muted">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }) { return <p className="py-3 text-sm text-muted">{children}</p>; }

/** Frist-Hinweis: überfällig / heute / in X Tagen */
export function DueChip({ due, done }) {
  if (!due || done) return null;
  const d = daysBetween(todayKey(), due);
  if (d < 0) return <Chip size="sm" color="danger" variant="soft">überfällig seit {shortDate(due)}</Chip>;
  if (d === 0) return <Chip size="sm" color="warning" variant="soft">Frist heute</Chip>;
  if (d <= 2) return <Chip size="sm" color="warning" variant="soft">Frist {shortDate(due)}</Chip>;
  return <Chip size="sm" variant="soft">Frist {shortDate(due)}</Chip>;
}

export function TaskRow({ t, num, sortable, onEdit }) {
  const running = useStore().activeTimer?.taskId === t.id;
  const sp = spentMs(t.id);
  const area = t.areaId && areaById(t.areaId);
  return (
    <li className="flex items-center gap-3 border-b border-separator py-3 last:border-b-0">
      {num != null && <span className="w-5 shrink-0 text-right text-sm tabular text-muted">{num}</span>}
      <Pin color={taskColor(t)} />
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEdit(t.id)}>
        <div className={'break-words ' + (t.done ? 'text-muted line-through' : '')}>
          {area && <span className="font-medium" style={{ color: area.color }}>{area.name}: </span>}{t.title}
        </div>
        {(running || sp > 0 || t.notes || (t.due && !t.done)) && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            {running && <span className="font-semibold text-accent">Läuft</span>}
            {sp > 0 && <span className="tabular">{fmtDur(sp)}</span>}
            {t.notes && <span>Mit Notiz</span>}
            <DueChip due={t.due} done={t.done} />
          </div>
        )}
      </button>
      {sortable && (
        <div className="flex shrink-0 flex-col">
          <Button isIconOnly size="sm" variant="ghost" aria-label="Nach oben" onPress={() => actions.move(t.id, -1)} className="h-6 min-w-8">▲</Button>
          <Button isIconOnly size="sm" variant="ghost" aria-label="Nach unten" onPress={() => actions.move(t.id, 1)} className="h-6 min-w-8">▼</Button>
        </div>
      )}
      <button type="button" aria-label={t.done ? 'Wieder öffnen' : 'Als erledigt markieren'} onClick={() => actions.toggleDone(t.id)}
        className={'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors ' + (t.done ? 'border-success bg-success text-success-foreground' : 'border-border hover:border-success')}>
        {t.done ? '✓' : ''}
      </button>
    </li>
  );
}
