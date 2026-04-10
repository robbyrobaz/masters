// Vercel serverless function — stores/retrieves full standings history for bar chart race
const BLOB_URL = 'https://jsonblob.com/api/jsonBlob/019d77a3-024a-7876-9c81-60d00cb229f6';

async function getHistory() {
  try {
    const res = await fetch(BLOB_URL, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function saveHistory(history) {
  await fetch(BLOB_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(history),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json(await getHistory());
  }

  if (req.method === 'POST') {
    try {
      const { entries } = req.body;
      if (!entries || !Array.isArray(entries)) {
        return res.status(400).json({ error: 'Need entries array' });
      }

      const history = await getHistory();
      const last = history[history.length - 1];

      // Under 20 snapshots: save every top-5 change. Over 20: hourly.
      const minInterval = history.length >= 20 ? 55 * 60 * 1000 : 30 * 1000;

      if (last && (Date.now() - last.time) < minInterval) {
        const top5changed = history.length < 20 &&
          !last.entries.slice(0, 5).every((p, i) => p.name === entries[i]?.name);
        if (!top5changed) {
          last.entries = entries;
          last.time = Date.now();
          await saveHistory(history);
          return res.status(200).json({ saved: false, reason: 'updated latest', count: history.length });
        }
      }

      history.push({ time: Date.now(), entries });
      if (history.length > 50) history.shift();
      await saveHistory(history);
      return res.status(200).json({ saved: true, count: history.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
