const { redis, normalize, hashPin } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed.' });

  const { username, pin, score } = req.body || {};
  const key = normalize(username);
  const numScore = Number(score);

  if (!key || !Number.isFinite(numScore) || numScore < 0 || numScore > 1000000) {
    return res.status(400).json({ ok: false, error: 'Invalid submission.' });
  }

  const account = await redis.hgetall(`account:${key}`);
  if (!account || !account.pinHash || account.pinHash !== hashPin(key, pin)) {
    return res.status(401).json({ ok: false, error: 'Not authenticated.' });
  }

  const current = await redis.zscore('leaderboard:score', key);
  if (current === null || numScore > Number(current)) {
    await redis.zadd('leaderboard:score', { score: numScore, member: key });
  }
  // Refresh last-played timestamp on every submission, win or not, so active players stay listed.
  await redis.zadd('leaderboard:ts', { score: Date.now(), member: key });

  return res.status(200).json({ ok: true });
};
