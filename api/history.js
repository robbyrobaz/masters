// Vercel serverless function — stores/retrieves podium history from Blob
import { put, list } from '@vercel/blob';

const BLOB_KEY = 'podium-history.json';
const MAX_HISTORY = 100;

async function getHistory() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    return [];
  }
}

async function saveHistory(history) {
  await put(BLOB_KEY, JSON.stringify(history), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

      // Only save if podium ORDER changed (names different)
      if (last) {
        const sameOrder = last.top3.every((p, i) => p.name === top3[i]?.name);
        if (sameOrder) {
          // Update scores on latest entry silently
          last.top3 = top3;
          last.time = Date.now();
          await saveHistory(history);
          return res.status(200).json({ saved: false, reason: 'same order — scores updated', count: history.length });
        }
      }

      // New podium arrangement — save snapshot
      history.push({ time: Date.now(), top3 });
      if (history.length > MAX_HISTORY) history.shift();
      await saveHistory(history);

      return res.status(200).json({ saved: true, count: history.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
