// Kompass – stellt einen Kalender-Export kurz (15 Min.) unter einer Zufallsadresse bereit,
// damit iOS Safari ihn direkt in den Kalender übernehmen kann („Alle hinzufügen“).
const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Speicher nicht verbunden' });
  const cmd = async (args) => {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    const j = await r.json(); if (j.error) throw new Error(j.error); return j.result;
  };
  try {
    if (req.method === 'POST') {
      let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const ics = body && body.ics;
      if (typeof ics !== 'string' || !ics.startsWith('BEGIN:VCALENDAR') || ics.length > 300000) return res.status(400).json({ error: 'Ungültiger Kalender' });
      const t = crypto.randomBytes(16).toString('hex');
      await cmd(['SET', 'kompass-ics:' + t, ics, 'EX', 900]);
      return res.status(200).json({ token: t });
    }
    if (req.method === 'GET') {
      const t = req.query && req.query.t;
      if (typeof t !== 'string' || !/^[a-f0-9]{32}$/.test(t)) { res.statusCode = 400; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end('Ungültiger Link'); }
      const ics = await cmd(['GET', 'kompass-ics:' + t]);
      if (!ics) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end('Dieser Export ist abgelaufen. Bitte in Kompass erneut exportieren.'); }
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline; filename="Kompass.ics"');
      res.statusCode = 200; return res.end(ics);
    }
    res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (e) { return res.status(500).json({ error: String((e && e.message) || e) }); }
};
