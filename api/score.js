const { redis, normalize, hashPin, BOARDS, applyMasteryDeltas, countMastered, validMasteryDeltas } = require('./_lib');

// One request per run end: an optional new best score and/or mastery progress deltas.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed.' });

  const { username, pin, score, mode = 'quiz', mastery } = req.body || {};
  const key = normalize(username);
  const hasScore = score !== undefined && score !== null;
  const numScore = Number(score);
  const board = BOARDS[mode];

  if (!key || (!hasScore && !mastery)) {
    return res.status(400).json({ ok: false, error: 'Invalid submission.' });
  }
  if (hasScore && (!board || !board.ts || !Number.isFinite(numScore) || numScore < 0 || numScore > 1000000)) {
    return res.status(400).json({ ok: false, error: 'Invalid score.' });
  }
  if (mastery && !validMasteryDeltas(mastery)) {
    return res.status(400).json({ ok: false, error: 'Invalid mastery data.' });
  }

  const account = await redis.hgetall(`account:${key}`);
  if (!account || !account.pinHash || account.pinHash !== hashPin(key, pin)) {
    return res.status(401).json({ ok: false, error: 'Not authenticated.' });
  }

  if (hasScore) {
    // GT: only ever raises an existing best; new players are still added.
    await redis.zadd(board.score, { gt: true }, { score: numScore, member: key });
    await redis.zadd(board.ts, { score: Date.now(), member: key });
  }

  let progress;
  if (mastery) {
    progress = applyMasteryDeltas((await redis.get(`mastery:${key}`)) || {}, mastery);
    await redis.set(`mastery:${key}`, progress);
    await redis.zadd(BOARDS.mastery.score, { score: countMastered(progress), member: key });
  }

  return res.status(200).json({ ok: true, mastery: progress });
};
