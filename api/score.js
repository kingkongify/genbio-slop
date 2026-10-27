const { redis, normalize, hashPin, BOARDS } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed.' });

  const { username, pin, score, mode = 'quiz' } = req.body || {};
  const key = normalize(username);
  const numScore = Number(score);
  const board = BOARDS[mode];

  if (!board || !key || !Number.isFinite(numScore) || numScore < 0 || numScore > 1000000) {
    return res.status(400).json({ ok: false, error: 'Invalid submission.' });
  }

  const account = await redis.hgetall(`account:${key}`);
  if (!account || !account.pinHash || account.pinHash !== hashPin(key, pin)) {
    return res.status(401).json({ ok: false, error: 'Not authenticated.' });
  }

  // GT: only ever raises an existing best; new players are still added.
  await redis.zadd(board.score, { gt: true }, { score: numScore, member: key });
  await redis.zadd(board.ts, { score: Date.now(), member: key });

  return res.status(200).json({ ok: true });
};
