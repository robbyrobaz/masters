// Vercel serverless function — proxies ESPN Masters leaderboard to avoid CORS
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  try {
    const espnRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard');
    if (!espnRes.ok) throw new Error('ESPN API ' + espnRes.status);
    const data = await espnRes.json();

    const event = data.events?.[0];
    if (!event) return res.status(200).json({ error: 'No active event', competitors: [] });

    const competitors = [];
    for (const comp of event.competitions?.[0]?.competitors || []) {
      const athlete = comp.athlete || {};
      const name = athlete.displayName || '';
      const status = comp.status?.type?.description || '';
      let roundScores = [];
      if (comp.linescores) {
        roundScores = comp.linescores.map(ls => parseInt(ls.value) || 0);
      }

      const toPar = comp.statistics?.find(s => s.name === 'scoreToPar')?.displayValue || '';
      const position = comp.status?.position?.displayName || '';
      const thru = comp.status?.thru?.toString() || '';
      const isCut = status === 'cut' || comp.status?.type?.id === '3';

      competitors.push({ name, roundScores, toPar, thru, position, isCut, status });
    }

    res.status(200).json({
      eventName: event.name,
      competitors,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
