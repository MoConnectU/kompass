// Kompass – Kalender-Abo (webcal). Liefert alle Logbuch-Einträge als .ics.
// Adresse: /api/feed?id=<Sync-ID>  (64 Hex-Zeichen, aus dem geheimen Sync-Code abgeleitet)
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const text = (code, msg) => { res.statusCode = code; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end(msg); };
  if (!url || !token) return text(500, 'Speicher nicht verbunden');
  const id = req.query && req.query.id;
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) return text(400, 'Ungültiger Abo-Link');
  try {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(['GET', 'kompass:' + id]) });
    const j = await r.json(); if (j.error) throw new Error(j.error);
    if (!j.result) return text(404, 'Kein Kompass-Kalender für diesen Link');
    const S = JSON.parse(j.result);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="Kompass.ics"');
    return res.end(buildIcs(S));
  } catch (e) { return text(500, 'Fehler: ' + String((e && e.message) || e)); }
};

const pad = n => String(n).padStart(2, '0');
function icsDate(ts) { const d = new Date(ts); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; }
const esc = v => String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function fold(line) {
  const out = []; let cur = '', len = 0;
  for (const ch of line) { const n = Buffer.byteLength(ch); if (len + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0; } cur += ch; len += n; }
  out.push(cur); return out.join('\r\n ');
}
function dur(ms) { const m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + pad(m % 60); }
function buildIcs(S) {
  const tasks = new Map((S.tasks || []).map(t => [t.id, t]));
  const quests = new Map((S.quests || []).map(q => [q.id, q]));
  const areas = new Map((S.areas || []).map(a => [a.id, a]));
  const since = Date.now() - 400 * 86400000; // gut ein Jahr zurück
  const now = icsDate(Date.now());
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kompass//Kompass Logbuch//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Kompass', 'X-WR-CALDESC:Erfasste Arbeitszeit aus Kompass', 'REFRESH-INTERVAL;VALUE=DURATION:PT15M', 'X-PUBLISHED-TTL:PT15M'];
  for (const se of (S.sessions || [])) {
    if (!(se.end > se.start) || se.end < since) continue;
    const t = tasks.get(se.taskId);
    const q = quests.get(se.questId !== undefined ? se.questId : (t && t.questId));
    const ar = areas.get(se.areaId !== undefined ? se.areaId : (t && t.areaId));
    const title = (ar ? ar.name + ': ' : '') + (t ? t.title : (se.title || 'Eintrag'));
    const desc = ['Aus Kompass erfasst (' + dur(se.end - se.start) + ')', q ? 'Quest: ' + q.name : '', ar ? 'Fachbereich: ' + ar.name : '', t && t.notes ? 'Notizen: ' + t.notes : ''].filter(Boolean).join('\n');
    L.push('BEGIN:VEVENT', 'UID:kompass-' + se.id + '@kompass', 'DTSTAMP:' + now, 'DTSTART:' + icsDate(se.start), 'DTEND:' + icsDate(se.end),
      fold('SUMMARY:' + esc(title)), fold('DESCRIPTION:' + esc(desc)));
    if (q) L.push(fold('CATEGORIES:' + esc(q.name)));
    L.push('TRANSP:OPAQUE', 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}
