// Vercel serverless function — stores/retrieves podium history from jsonblob.com (free, no signup)
const BLOB_URL = 'https://jsonblob.com/api/jsonBlob/019d7782-4c71-7537-a8b5-a28bf57b5013';

async function getHistory() {
  try {
    const res = await fetch(BLOB_URL, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
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
    const history = await getHistory();
    return res.status(200).json(history);
  }

  if (req.method === 'POST') {
    try {
      const { top3 } = req.body;
      if (!top3 || !Array.isArray(top3) || top3.length < 3) {
        return res.status(400).json({ error: 'Need top3 array with 3 entries' });
      }

      const history = await getHistory();
      const last = history[history.length - 1];

      // Only save if podium ORDER changed
      if (last) {
        const sameOrder = last.top3.every((p, i) => p.name === top3[i]?.name);
        if (sameOrder) {
          last.top3 = top3;
          last.time = Date.now();
          await saveHistory(history);
          return res.status(200).json({ saved: false, reason: 'same order — scores updated', count: history.length });
        }
      }

      history.push({ time: Date.now(), top3 });
      if (history.length > 100) history.shift();
      await saveHistory(history);

      return res.status(200).json({ saved: true, count: history.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
