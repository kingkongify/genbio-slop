const { redis, WEEK_MS, BOARDS } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed.' });

  const board = BOARDS[(req.query && req.query.mode) || 'quiz'];
  if (!board) return res.status(400).json({ ok: false, error: 'Unknown leaderboard.' });

  // Prune anyone whose last submission on this board is older than a week (weekly boards only).
  if (board.ts) {
    const stale = await redis.zrange(board.ts, 0, Date.now() - WEEK_MS, { byScore: true });
    if (stale && stale.length) {
      await redis.zrem(board.score, ...stale);
      await redis.zrem(board.ts, ...stale);
    }
  }

  const raw = await redis.zrange(board.score, 0, 19, { rev: true, withScores: true });
  const entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ key: raw[i], score: Number(raw[i + 1]) });
  }

  const names = await Promise.all(entries.map((e) => redis.hget(`account:${e.key}`, 'name')));
  const result = entries.map((e, i) => ({ rank: i + 1, name: names[i] || e.key, score: e.score }));

  return res.status(200).json({ ok: true, entries: result });
};
