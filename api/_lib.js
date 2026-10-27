const { Redis } = require('@upstash/redis');
const crypto = require('crypto');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Quiz keeps its original key names so existing entries survive. Mastery has no ts: it never expires.
const BOARDS = {
  quiz: { score: 'leaderboard:score', ts: 'leaderboard:ts' },
  spell: { score: 'leaderboard:spell:score', ts: 'leaderboard:spell:ts' },
  mastery: { score: 'leaderboard:mastery' },
};

// A name is mastered at 10 correct quiz answers + 2 clean spellings. Must match index.html.
const QUIZ_GOAL = 10;
const SPELL_GOAL = 2;

function normalize(username) {
  return String(username || '').trim().toLowerCase();
}

function hashPin(usernameKey, pin) {
  return crypto.createHash('sha256').update(`${usernameKey}:${pin}:biomaster-pin-salt`).digest('hex');
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// progress: { "<itemId>": [quizCount, spellCount] }; deltas have the same shape
function applyMasteryDeltas(progress, deltas) {
  const next = { ...progress };
  for (const [id, [dq, ds]] of Object.entries(deltas)) {
    const [q, s] = next[id] || [0, 0];
    next[id] = [clamp(q + dq, 0, QUIZ_GOAL), clamp(s + ds, 0, SPELL_GOAL)];
  }
  return next;
}

function countMastered(progress) {
  return Object.values(progress).filter(([q, s]) => q >= QUIZ_GOAL && s >= SPELL_GOAL).length;
}

function validMasteryDeltas(deltas) {
  if (!deltas || typeof deltas !== 'object' || Array.isArray(deltas)) return false;
  const entries = Object.entries(deltas);
  return entries.length <= 200 && entries.every(([id, d]) =>
    /^\d{1,3}$/.test(id) && Array.isArray(d) && d.length === 2 &&
    d.every((n) => Number.isInteger(n) && Math.abs(n) <= 100));
}

module.exports = { redis, normalize, hashPin, WEEK_MS, BOARDS, applyMasteryDeltas, countMastered, validMasteryDeltas };
