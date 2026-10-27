const { redis, WEEK_MS } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed.' });

  const cutoff = Date.now() - WEEK_MS;

  // Prune anyone whose last submission is older than a week.
  const stale = await redis.zrange('leaderboard:ts', 0, cutoff, { byScore: true });
  if (stale && stale.length) {
    await redis.zrem('leaderboard:score', ...stale);
    await redis.zrem('leaderboard:ts', ...stale);
  }

  const raw = await redis.zrange('leaderboard:score', 0, 19, { rev: true, withScores: true });
  const entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ key: raw[i], score: Number(raw[i + 1]) });
  }

  const names = await Promise.all(entries.map((e) => redis.hget(`account:${e.key}`, 'name')));
  const result = entries.map((e, i) => ({ rank: i + 1, name: names[i] || e.key, score: e.score }));

  return res.status(200).json({ ok: true, entries: result });
};
