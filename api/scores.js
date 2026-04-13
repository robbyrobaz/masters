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
      // Detect MC: ESPN status field is unreliable — also check if player has <4 scoring rounds when event is final
      const playedRounds = roundScores.filter(r => r > 0);
      const eventDone = event.status?.type?.state === 'post' || event.status?.type?.description === 'Final';
      const isCut = status === 'cut' || comp.status?.type?.id === '3'
        || (eventDone && playedRounds.length > 0 && playedRounds.length < 4)
        || (!eventDone && playedRounds.length >= 2 && roundScores.length >= 3 && roundScores[2] === 0);

      competitors.push({ name, roundScores, toPar, thru, position, isCut, status });
    }

    const eventState = event.status?.type?.state || '';
    const eventStatus = event.status?.type?.description || '';

    res.status(200).json({
      eventName: event.name,
      eventState,
      eventStatus,
      competitors,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
