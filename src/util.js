export const pad = n => String(n).padStart(2, '0');
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
export const dk = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const parseDk = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseDk(s); d.setDate(d.getDate() + n); return dk(d); };
export const todayKey = () => dk(new Date());
export const mondayOf = s => { const d = parseDk(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dk(d); };
export const hm = ts => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
export const hours = ms => ms / 3600000;

export const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WD_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function fmtDur(ms) {
  if (ms > 0 && ms < 60000) return '< 1 min';
  const m = Math.round(ms / 60000);
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h ' + pad(m % 60);
}
export function fmtH(ms) {
  if (ms <= 0) return '0 h';
  if (ms < 3600000) return Math.max(1, Math.round(ms / 60000)) + ' min';
  return hours(ms).toFixed(1).replace('.', ',') + ' h';
}
export const fmtShort = ms => !ms ? '' : (ms < 3600000 ? Math.max(1, Math.round(ms / 60000)) + 'm' : hours(ms).toFixed(1).replace('.', ','));
export function fmtClock(ms) {
  const s = Math.floor(ms / 1000);
  return (s >= 3600 ? Math.floor(s / 3600) + ':' : '') + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
}
export function relDay(s) {
  const t = todayKey();
  if (s === t) return 'Heute';
  if (s === addDays(t, 1)) return 'Morgen';
  if (s === addDays(t, -1)) return 'Gestern';
  return '';
}
export function longDate(s) { const d = parseDk(s); return d.getDate() + '. ' + MONTHS[d.getMonth()]; }
export function shortDate(s) { const d = parseDk(s); return d.getDate() + '.' + (d.getMonth() + 1) + '.'; }
export function weekdayLong(s) { const d = parseDk(s); return WD_LONG[(d.getDay() + 6) % 7]; }
export function weekLabel(mon) { return shortDate(mon) + ' – ' + shortDate(addDays(mon, 6)); }
export function daysBetween(a, b) { return Math.round((parseDk(b) - parseDk(a)) / 86400000); }
