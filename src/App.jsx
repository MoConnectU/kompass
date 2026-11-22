import { useState, useEffect } from 'react';
import { Toast } from '@heroui/react';
import { useStore } from './store.js';
import { todayKey, mondayOf } from './util.js';
import Heute from './views/Heute.jsx';
import Fokus from './views/Fokus.jsx';
import Woche from './views/Woche.jsx';
import Einrichten from './views/Einrichten.jsx';
import TaskModal from './views/TaskModal.jsx';

const ICONS = {
  heute: <path d="M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1" />,
  fokus: <><circle cx="12" cy="12" r="9" /><path d="M12 6l2 6-2 6-2-6z" /></>,
  woche: <path d="M5 20V11M12 20V5M19 20v-6" />,
  einrichten: <path d="M6 21V4M6 4h11l-2.5 4L17 12H6" />,
};
const TABS = [['heute', 'Heute'], ['fokus', 'Fokus'], ['woche', 'Woche'], ['einrichten', 'Einrichten']];

export default function App() {
  useStore();
  const [view, setView] = useState('heute');
  const [day, setDay] = useState(todayKey());
  const [week, setWeek] = useState(mondayOf(todayKey()));
  const [editId, setEditId] = useState(null);

  // Tageswechsel um Mitternacht erkennen
  useEffect(() => {
    let last = todayKey();
    const i = setInterval(() => { const t = todayKey(); if (t !== last) { setDay(d => (d === last ? t : d)); setWeek(mondayOf(t)); last = t; } }, 30000);
    return () => clearInterval(i);
  }, []);

  const go = v => { setView(v); window.scrollTo(0, 0); };

  return (
    <>
      <main className="mx-auto max-w-2xl px-5 pt-[calc(20px+env(safe-area-inset-top))] pb-8">
        {view === 'heute' && <Heute day={day} setDay={setDay} onEdit={setEditId} go={go} />}
        {view === 'fokus' && <Fokus go={go} />}
        {view === 'woche' && <Woche week={week} setWeek={setWeek} />}
        {view === 'einrichten' && <Einrichten />}
      </main>

      <nav aria-label="Hauptnavigation" className="fixed inset-x-0 bottom-0 z-10 border-t border-separator bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl justify-around py-1.5">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => go(k)} aria-current={view === k ? 'page' : undefined}
              className={'flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-xs transition-colors ' + (view === k ? 'font-semibold text-accent' : 'text-muted hover:text-foreground')}>
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[k]}</svg>
              {l}
            </button>
          ))}
        </div>
      </nav>

      <TaskModal id={editId} onClose={() => setEditId(null)} go={go} />
      <Toast.Provider placement="bottom" />
    </>
  );
}
