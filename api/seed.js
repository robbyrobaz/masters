// One-time seed endpoint — writes full history array
const BLOB_URL = 'https://jsonblob.com/api/jsonBlob/019d7782-4c71-7537-a8b5-a28bf57b5013';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { history } = req.body;
    if (!Array.isArray(history)) return res.status(400).json({ error: 'Need history array' });

    await fetch(BLOB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(history),
    });

    res.status(200).json({ saved: true, count: history.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
