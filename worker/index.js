const ALLOWED_ORIGINS = new Set([
  'https://bekharsky.github.io',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5187',
]);

const MAX_BODY_BYTES = 2_048;
const MAX_NICKNAME_LENGTH = 18;
const MAX_SCORE = 2_000_000_000;
const MAX_WAVE = 1_000_000;

function headersFor(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headersFor(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function cleanNickname(value) {
  if (typeof value !== 'string') return '';
  return Array.from(value.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/gu, ' ').trim())
    .slice(0, MAX_NICKNAME_LENGTH).join('');
}

function isValidPlayerId(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    if (!ALLOWED_ORIGINS.has(origin)) return new Response('Origin not allowed', { status: 403 });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headersFor(origin) });

    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/leaderboard') {
      try {
        const result = await env.DB.prepare(
          'SELECT nickname, score, wave, updated_at AS updatedAt FROM leaderboard ORDER BY score DESC, updated_at ASC LIMIT 5'
        ).all();
        return json({ entries: result.results ?? [] }, 200, origin);
      } catch {
        return json({ error: 'Leaderboard is temporarily unavailable' }, 503, origin);
      }
    }

    if (request.method === 'POST' && pathname === '/scores') {
      if (!request.headers.get('Content-Type')?.toLowerCase().includes('application/json')) {
        return json({ error: 'Expected application/json' }, 415, origin);
      }

      let raw;
      try {
        raw = await request.text();
      } catch {
        return json({ error: 'Invalid request body' }, 400, origin);
      }
      if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413, origin);

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return json({ error: 'Invalid JSON' }, 400, origin);
      }

      const playerId = payload?.playerId;
      const nickname = cleanNickname(payload?.nickname);
      const score = payload?.score;
      const wave = payload?.wave;
      if (!isValidPlayerId(playerId) || nickname.length < 2
        || !Number.isSafeInteger(score) || score < 0 || score > MAX_SCORE
        || !Number.isSafeInteger(wave) || wave < 1 || wave > MAX_WAVE) {
        return json({ error: 'Invalid player score' }, 400, origin);
      }

      try {
        const entry = await env.DB.prepare(`
          INSERT INTO leaderboard (player_id, nickname, score, wave)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(player_id) DO UPDATE SET
            nickname = excluded.nickname,
            score = MAX(leaderboard.score, excluded.score),
            wave = CASE WHEN excluded.score > leaderboard.score THEN excluded.wave ELSE leaderboard.wave END,
            updated_at = CASE WHEN excluded.score > leaderboard.score THEN excluded.updated_at ELSE leaderboard.updated_at END
          RETURNING nickname, score, wave, updated_at AS updatedAt
        `).bind(playerId, nickname, score, wave).first();
        return json({ ok: true, entry }, 200, origin);
      } catch {
        return json({ error: 'Could not save score' }, 503, origin);
      }
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};
