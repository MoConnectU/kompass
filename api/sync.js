// Kompass – Sync-Endpunkt (Vercel Serverless Function, keine Abhängigkeiten)
// Speichert den kompletten App-Zustand als JSON in Upstash Redis.
// Benötigt die Umgebungsvariablen, die Vercel beim Verbinden einer
// Upstash-Datenbank automatisch setzt:
//   KV_REST_API_URL + KV_REST_API_TOKEN   oder
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return res.status(500).json({ error: 'Speicher nicht verbunden (Upstash-Variablen fehlen)' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const id = req.method === 'GET' ? (req.query && req.query.id) : body.id;
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) {
    return res.status(400).json({ error: 'Ungültige Sync-ID' });
  }
  const key = 'kompass:' + id;

  const cmd = async (args) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  };

  try {
    if (req.method === 'GET') {
      const raw = await cmd(['GET', key]);
      return res.status(200).json({ state: raw ? JSON.parse(raw) : null });
    }

    if (req.method === 'POST') {
      const st = body.state;
      if (!st || typeof st !== 'object') {
        return res.status(400).json({ error: 'Kein Zustand übergeben' });
      }
      // Neuerer Stand auf dem Server gewinnt -> Client übernimmt ihn
      const curRaw = await cmd(['GET', key]);
      if (curRaw) {
        const cur = JSON.parse(curRaw);
        if ((cur.updatedAt || 0) > (st.updatedAt || 0)) {
          return res.status(200).json({ conflict: true, state: cur });
        }
      }
      await cmd(['SET', key, JSON.stringify(st)]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
