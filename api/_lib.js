const { Redis } = require('@upstash/redis');
const crypto = require('crypto');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Quiz keeps its original key names so existing entries survive.
const BOARDS = {
  quiz: { score: 'leaderboard:score', ts: 'leaderboard:ts' },
  spell: { score: 'leaderboard:spell:score', ts: 'leaderboard:spell:ts' },
};

function normalize(username) {
  return String(username || '').trim().toLowerCase();
}

function hashPin(usernameKey, pin) {
  return crypto.createHash('sha256').update(`${usernameKey}:${pin}:biomaster-pin-salt`).digest('hex');
}

module.exports = { redis, normalize, hashPin, WEEK_MS, BOARDS };
