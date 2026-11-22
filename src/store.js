import { useSyncExternalStore, useEffect, useState } from 'react';
import { uid, dk, todayKey } from './util.js';

/* Gleicher Speicher-Schlüssel und gleiches Sync-Format wie Version 1/2,
   damit vorhandene Daten erhalten bleiben. */
const LS_STATE = 'kompass-state-v1';
const LS_CODE = 'kompass-sync-code';

export const COLORS = ['#2F6DB0', '#2E8B66', '#C8553D', '#D69B1A', '#7556A8', '#1E8C9A', '#B4497C', '#6A7B88'];
const OLD_COLORS = { '#7c9cff': '#2F6DB0', '#4cc38a': '#2E8B66', '#f2b84b': '#D69B1A', '#ef6b6b': '#C8553D', '#c084fc': '#7556A8', '#2dd4bf': '#1E8C9A', '#f472b6': '#B4497C', '#94a3b8': '#6A7B88' };
export const MAX_QUESTS = 3;

const emptyState = () => ({ quests: [], areas: [], tasks: [], sessions: [], reflections: {}, activeTimer: null, updatedAt: 0 });
function normalize(s) {
  const st = Object.assign(emptyState(), s || {});
  if (!Array.isArray(st.areas)) st.areas = [];
  st.quests.forEach(q => { if (OLD_COLORS[q.color]) q.color = OLD_COLORS[q.color]; });
  return st;
}
function loadState() {
  try { const s = JSON.parse(localStorage.getItem(LS_STATE)); if (s && Array.isArray(s.tasks)) return normalize(s); } catch (e) { /* leer */ }
  return emptyState();
}

export let S = loadState();
let version = 0;
const listeners = new Set();
const emit = () => { version++; listeners.forEach(l => l()); };
const subscribe = l => { listeners.add(l); return () => listeners.delete(l); };
export function useStore() { useSyncExternalStore(subscribe, () => version); return S; }

function saveLocal() { try { localStorage.setItem(LS_STATE, JSON.stringify(S)); } catch (e) { /* voll */ } }
/** Zustand ändern, lokal speichern, Sync anstoßen, neu rendern */
export function commit(fn) { if (fn) fn(S); S.updatedAt = Date.now(); saveLocal(); schedulePush(); emit(); }
/** Ändern ohne sofortiges Re-Rendern (beim Tippen) */
let quietTimer = null;
export function commitQuiet(fn) { if (fn) fn(S); clearTimeout(quietTimer); quietTimer = setTimeout(() => { S.updatedAt = Date.now(); saveLocal(); schedulePush(); }, 500); }

/* ---------- Abfragen ---------- */
export const questById = id => S.quests.find(q => q.id === id);
export const areaById = id => S.areas.find(a => a.id === id);
export const activeQuests = () => S.quests.filter(q => !q.archived);
export const activeAreas = () => S.areas.filter(a => !a.archived);
export const isQuestTask = t => { const q = t.questId && questById(t.questId); return !!(q && !q.archived); };
export const taskColor = t => { const q = t.questId && questById(t.questId); return q ? q.color : 'var(--border)'; };
export function spentMs(taskId) {
  let ms = 0;
  for (const s of S.sessions) if (s.taskId === taskId) ms += s.end - s.start;
  if (S.activeTimer && S.activeTimer.taskId === taskId) ms += Date.now() - S.activeTimer.start;
  return ms;
}
export function groups(day) {
  const all = S.tasks.filter(t => t.date === day).sort((a, b) => a.order - b.order);
  return {
    quest: all.filter(t => !t.done && isQuestTask(t)),
    other: all.filter(t => !t.done && !isQuestTask(t)),
    done: all.filter(t => t.done).sort((a, b) => (a.doneAt || 0) - (b.doneAt || 0)),
  };
}
export const focusQueue = () => { const g = groups(todayKey()); return g.quest.concat(g.other); };
const nextOrder = day => Math.max(0, ...S.tasks.filter(t => t.date === day).map(t => t.order)) + 1;

/* ---------- Timer ---------- */
function stopTimerRaw() {
  const a = S.activeTimer; if (!a) return;
  const end = Date.now();
  if (end - a.start >= 5000) {
    const t = S.tasks.find(x => x.id === a.taskId);
    S.sessions.push({ id: uid(), taskId: a.taskId, questId: t ? (t.questId || null) : null, areaId: t ? (t.areaId || null) : null, title: t ? t.title : '', start: a.start, end });
  }
  S.activeTimer = null;
}
function startTimerRaw(taskId) { if (S.activeTimer) stopTimerRaw(); S.activeTimer = { taskId, start: Date.now() }; }
/** Tickt jede Sekunde, solange ein Timer läuft */
export function useNow() {
  const running = !!S.activeTimer;
  const [, setT] = useState(0);
  useEffect(() => { if (!running) return; const i = setInterval(() => setT(x => x + 1), 1000); return () => clearInterval(i); }, [running]);
  return Date.now();
}

/* ---------- Aktionen ---------- */
export const actions = {
  addTask(title, { questId = null, areaId = null, due = null, day }) {
    title = title.trim(); if (!title) return;
    commit(S => S.tasks.push({ id: uid(), title, questId, areaId, receivedAt: todayKey(), due, date: day, order: nextOrder(day), done: false, doneAt: null, notes: '' }));
  },
  updateTask(id, patch) {
    commit(S => {
      const t = S.tasks.find(x => x.id === id); if (!t) return;
      if (patch.date && patch.date !== t.date) { t.order = nextOrder(patch.date); }
      Object.assign(t, patch);
    });
  },
  deleteTask(id) { commit(S => { if (S.activeTimer && S.activeTimer.taskId === id) stopTimerRaw(); S.tasks = S.tasks.filter(x => x.id !== id); }); },
  move(id, dir) {
    commit(S => {
      const t = S.tasks.find(x => x.id === id); if (!t) return;
      const g = groups(t.date); const list = isQuestTask(t) ? g.quest : g.other;
      const i = list.findIndex(x => x.id === id), j = i + dir;
      if (j < 0 || j >= list.length) return;
      const o = list[j].order; list[j].order = t.order; t.order = o;
    });
  },
  toggleDone(id) {
    commit(S => {
      const t = S.tasks.find(x => x.id === id); if (!t) return;
      if (!t.done && S.activeTimer && S.activeTimer.taskId === id) stopTimerRaw();
      t.done = !t.done; t.doneAt = t.done ? Date.now() : null;
      if (!t.done) t.order = nextOrder(t.date);
    });
  },
  pullOverdue() {
    const t = todayKey();
    commit(S => S.tasks.filter(x => !x.done && x.date < t).forEach(x => { x.date = t; x.order = nextOrder(t); }));
  },
  start(id) { commit(() => startTimerRaw(id)); },
  pause() { commit(() => stopTimerRaw()); },
  complete(id) {
    commit(S => {
      const wasRunning = !!S.activeTimer;
      const t = S.tasks.find(x => x.id === id);
      if (S.activeTimer && S.activeTimer.taskId === id) stopTimerRaw();
      if (t) { t.done = true; t.doneAt = Date.now(); }
      const nxt = focusQueue()[0];
      if (wasRunning && nxt) startTimerRaw(nxt.id);
    });
  },
  skip(id) {
    commit(S => {
      const t = S.tasks.find(x => x.id === id); if (!t) return;
      const running = S.activeTimer && S.activeTimer.taskId === id;
      if (running) stopTimerRaw();
      t.order = nextOrder(t.date);
      const nxt = focusQueue()[0];
      if (running && nxt) startTimerRaw(nxt.id);
    });
  },
  focusNow(id) {
    commit(S => {
      const t = S.tasks.find(x => x.id === id); if (!t) return;
      t.date = todayKey(); t.order = Math.min(0, ...S.tasks.filter(x => x.date === t.date).map(x => x.order)) - 1;
      startTimerRaw(id);
    });
  },
  addQuest(name = 'Neue Quest', weeklyGoalH = 5) {
    commit(S => {
      const used = activeQuests().map(q => q.color);
      S.quests.push({ id: uid(), name, goal: '', weeklyGoalH, color: COLORS.find(c => !used.includes(c)) || COLORS[0], archived: false });
    });
  },
  setupWork() {
    commit(S => {
      const free = () => { const used = S.quests.filter(q => !q.archived).map(q => q.color); return COLORS.find(c => !used.includes(c)) || COLORS[0]; };
      if (!S.quests.some(q => !q.archived && q.name === 'Anfragen'))
        S.quests.push({ id: uid(), name: 'Anfragen', goal: 'Anfragen der Fachbereiche zuverlässig und zügig erledigen', weeklyGoalH: 25, color: free(), archived: false });
      if (!S.quests.some(q => !q.archived && q.name === 'Optimierung'))
        S.quests.push({ id: uid(), name: 'Optimierung', goal: 'Wiederkehrende Anfragen vereinfachen, Abläufe dokumentieren', weeklyGoalH: 3, color: free(), archived: false });
    });
  },
  addArea(name) {
    name = name.trim(); if (!name) return;
    commit(S => {
      const used = activeAreas().map(a => a.color);
      S.areas.push({ id: uid(), name, color: COLORS.find(c => !used.includes(c)) || COLORS[S.areas.length % COLORS.length], archived: false });
    });
  },
  setReflection(week, key, value) { commitQuiet(S => { const r = S.reflections[week] = S.reflections[week] || {}; r[key] = value; r.savedAt = Date.now(); }); },
  importState(s) { S = normalize(s); commit(); },
};

/* ---------- Statistik ---------- */
export function weekStats(days) {
  const per = {}, perArea = {}, perDay = days.map(() => ({})); let quest = 0, all = 0;
  const add = (questId, areaId, start, ms) => {
    const di = days.indexOf(dk(new Date(start))); if (di < 0) return;
    all += ms;
    if (areaId) perArea[areaId] = (perArea[areaId] || 0) + ms;
    const q = questId && questById(questId);
    if (q) { quest += ms; per[q.id] = (per[q.id] || 0) + ms; perDay[di][q.id] = (perDay[di][q.id] || 0) + ms; }
    else perDay[di]._ = (perDay[di]._ || 0) + ms;
  };
  for (const s of S.sessions) {
    // ältere Einträge ohne areaId: Fachbereich aus der Aufgabe übernehmen
    const areaId = s.areaId !== undefined ? s.areaId : (S.tasks.find(t => t.id === s.taskId) || {}).areaId;
    add(s.questId, areaId, s.start, s.end - s.start);
  }
  if (S.activeTimer) { const t = S.tasks.find(x => x.id === S.activeTimer.taskId); add(t ? t.questId : null, t ? t.areaId : null, S.activeTimer.start, Date.now() - S.activeTimer.start); }
  const doneTasks = S.tasks.filter(t => t.done && t.doneAt && days.includes(dk(new Date(t.doneAt))));
  return { per, perArea, perDay, quest, all, done: doneTasks.length, doneTasks };
}

/* ---------- Sync (Upstash über /api/sync) ---------- */
export const sync = { code: localStorage.getItem(LS_CODE), id: null, status: 'ok', error: '', lastSync: 0 };
const setSync = (status, error = '') => { sync.status = status; sync.error = error; emit(); };
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('kompass|' + str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function getId() { if (!sync.id && sync.code) sync.id = await sha256(sync.code); return sync.id; }
async function pull() {
  const id = await getId(); if (!id) return null;
  setSync('busy');
  const r = await fetch('/api/sync?id=' + id, { cache: 'no-store' });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.status);
  if (j.state && (j.state.updatedAt || 0) > (S.updatedAt || 0)) { S = normalize(j.state); saveLocal(); }
  sync.lastSync = Date.now(); setSync('ok');
  return j.state;
}
let pushTimer = null, pushing = false;
function schedulePush() { if (!sync.code) return; clearTimeout(pushTimer); sync.status = 'busy'; pushTimer = setTimeout(push, 1200); }
async function push() {
  const id = await getId(); if (!id) return;
  if (pushing) { schedulePush(); return; }
  pushing = true;
  try {
    const r = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, state: S }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || r.status);
    if (j.conflict && j.state) { S = normalize(j.state); saveLocal(); }
    sync.lastSync = Date.now(); setSync('ok');
  } catch (e) { setSync('err', navigator.onLine ? String(e.message || e) : 'offline'); }
  finally { pushing = false; }
}
export async function syncNow() {
  if (!sync.code) return false;
  try { await pull(); await push(); return true; }
  catch (e) { setSync('err', navigator.onLine ? String(e.message || e) : 'offline'); return false; }
}
export async function connectSync(code) {
  sync.code = code; sync.id = null;
  try {
    const remote = await pull();
    localStorage.setItem(LS_CODE, code);
    if (!remote || (remote.updatedAt || 0) <= (S.updatedAt || 0)) await push();
    emit();
    return { ok: true, existing: !!remote };
  } catch (e) {
    sync.code = null; sync.id = null; setSync('ok');
    return { ok: false, error: String(e.message || e) };
  }
}
export function disconnectSync() { localStorage.removeItem(LS_CODE); sync.code = null; sync.id = null; emit(); }
export function syncTitle() {
  if (!sync.code) return 'Nur auf diesem Gerät';
  if (sync.status === 'busy') return 'Synchronisiere …';
  if (sync.status === 'err') return 'Sync-Fehler: ' + sync.error;
  if (!sync.lastSync) return 'Verbunden';
  const d = new Date(sync.lastSync); return 'Synchron, ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
  window.addEventListener('online', () => syncNow());
  setInterval(() => { if (document.visibilityState === 'visible' && !pushing && sync.status !== 'busy') syncNow(); }, 60000);
  if (sync.code) syncNow();
}
