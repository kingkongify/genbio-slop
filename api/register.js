const { redis, normalize, hashPin } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed.' });

  const { username, pin } = req.body || {};
  const name = String(username || '').trim();
  const key = normalize(name);

  if (key.length < 2 || key.length > 20) {
    return res.status(400).json({ ok: false, error: 'Username must be 2-20 characters.' });
  }
  if (!/^[a-z0-9 _.-]+$/i.test(name)) {
    return res.status(400).json({ ok: false, error: 'Use letters, numbers, spaces, - or _ only.' });
  }
  if (!/^\d{4}$/.test(String(pin || ''))) {
    return res.status(400).json({ ok: false, error: 'PIN must be exactly 4 digits.' });
  }

  const accountKey = `account:${key}`;
  const pinHash = hashPin(key, pin);
  const existing = await redis.hgetall(accountKey);

  if (existing && existing.pinHash) {
    if (existing.pinHash !== pinHash) {
      return res.status(401).json({ ok: false, error: "That username is taken and the PIN doesn't match." });
    }
    return res.status(200).json({ ok: true, username: existing.name, created: false });
  }

  await redis.hset(accountKey, { name, pinHash, createdAt: Date.now() });
  return res.status(200).json({ ok: true, username: name, created: true });
};
