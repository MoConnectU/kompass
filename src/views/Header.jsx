import { Button } from '@heroui/react';
import { SyncDot } from '../ui.jsx';

export default function Header({ kicker, title, onPrev, onNext, onReset, resetLabel }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-3 border-b border-separator pb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm text-muted"><SyncDot />{kicker}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
      </div>
      {onPrev && (
        <div className="flex shrink-0 items-center gap-1">
          {onReset && <Button size="sm" variant="tertiary" onPress={onReset}>{resetLabel}</Button>}
          <Button isIconOnly size="sm" variant="tertiary" aria-label="Zurück" onPress={onPrev}>‹</Button>
          <Button isIconOnly size="sm" variant="tertiary" aria-label="Weiter" onPress={onNext}>›</Button>
        </div>
      )}
    </header>
  );
}
