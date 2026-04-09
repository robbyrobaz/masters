// One-time seed endpoint — writes full history array to blob
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { history } = req.body;
    if (!Array.isArray(history)) return res.status(400).json({ error: 'Need history array' });

    await put('podium-history.json', JSON.stringify(history), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    res.status(200).json({ saved: true, count: history.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
