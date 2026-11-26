import { renderScoreCard } from './share-card.js';

const GAME_PAGE_URL = 'https://bekharsky.github.io/piss-deal/';
const ALLOWED_ORIGINS = new Set([
  'https://bekharsky.github.io',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5187',
]);

const MAX_BODY_BYTES = 2_048;
const MAX_SHARE_BODY_BYTES = 1_024;
const MAX_NICKNAME_LENGTH = 18;
const MAX_SCORE = 2_000_000_000;
const MAX_WAVE = 1_000_000;

function isAllowedOrigin(origin, requestUrl) {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  return origin === new URL(requestUrl).origin;
}

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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function upsertMeta(html, attribute, name, content) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagPattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escapedName}["'])[^>]*>`, 'i');
  const tag = `<meta ${attribute}="${escapeAttribute(name)}" content="${escapeAttribute(content)}" />`;
  if (tagPattern.test(html)) return html.replace(tagPattern, tag);
  return html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function upsertCanonical(html, url) {
  const tag = `<link rel="canonical" href="${escapeAttribute(url)}" />`;
  const pattern = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function shareHtmlFallback({ pageUrl, imageUrl, title, description }) {
  return `<!doctype html>
  <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttribute(description)}">
    <meta property="og:type" content="website"><meta property="og:title" content="${escapeAttribute(title)}">
    <meta property="og:description" content="${escapeAttribute(description)}"><meta property="og:url" content="${escapeAttribute(pageUrl)}">
    <meta property="og:image" content="${escapeAttribute(imageUrl)}"><meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeAttribute(title)}">
    <meta name="twitter:description" content="${escapeAttribute(description)}"><meta name="twitter:image" content="${escapeAttribute(imageUrl)}">
  </head><body style="margin:0;padding:48px;background:#171e2c;color:#fff2d3;font:18px sans-serif;text-align:center">
    <h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><p><a href="${escapeAttribute(GAME_PAGE_URL)}" style="color:#ffd34e">Play Piss Deal</a></p>
  </body></html>`;
}

async function loadSharedScore(env, id) {
  return env.DB.prepare(
    'SELECT id, nickname, score, wave, created_at AS createdAt FROM shared_scores WHERE id = ?'
  ).bind(id).first();
}

function sharePageHeaders() {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    'X-Content-Type-Options': 'nosniff',
  };
}

async function serveScoreShare(request, env, id) {
  let result;
  try {
    result = await loadSharedScore(env, id);
  } catch {
    return new Response('Score sharing is temporarily unavailable.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  if (!result) return new Response('Score share not found.', { status: 404 });

  const pageUrl = new URL(`/share/${id}`, request.url).href;
  const imageUrl = `${pageUrl}/card.png?v=10`;
  const formattedScore = Number(result.score).toLocaleString('en');
  const title = `${formattedScore} points in Piss Deal`;
  const description = `${result.nickname} scored ${formattedScore} points in Piss Deal. Bad Bad Boy needs you. Find Joulupukki’s 6 sleigh parts.`;

  if (new URL(request.url).pathname.endsWith('/card.png')) {
    try {
      const image = await renderScoreCard(result);
      const headers = new Headers(image.headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(image.body, { status: image.status, headers });
    } catch {
      return new Response('Could not render score card.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
  }

  let html;
  try {
    const gamePage = await fetch(GAME_PAGE_URL);
    if (!gamePage.ok) throw new Error(`Game page returned ${gamePage.status}`);
    html = await gamePage.text();
  } catch {
    return new Response(shareHtmlFallback({ pageUrl, imageUrl, title, description }), {
      headers: sharePageHeaders(),
    });
  }

  html = html.replace(/<head(\s[^>]*)?>/i, match => `${match}\n<base href="${escapeAttribute(GAME_PAGE_URL)}">`);
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = upsertCanonical(html, pageUrl);
  html = upsertMeta(html, 'name', 'description', description);
  html = upsertMeta(html, 'property', 'og:type', 'website');
  html = upsertMeta(html, 'property', 'og:title', title);
  html = upsertMeta(html, 'property', 'og:description', description);
  html = upsertMeta(html, 'property', 'og:url', pageUrl);
  html = upsertMeta(html, 'property', 'og:image', imageUrl);
  html = upsertMeta(html, 'property', 'og:image:type', 'image/png');
  html = upsertMeta(html, 'property', 'og:image:width', '1200');
  html = upsertMeta(html, 'property', 'og:image:height', '630');
  html = upsertMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = upsertMeta(html, 'name', 'twitter:title', title);
  html = upsertMeta(html, 'name', 'twitter:description', description);
  html = upsertMeta(html, 'name', 'twitter:image', imageUrl);

  return new Response(html, { headers: sharePageHeaders() });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';
    const shareMatch = pathname.match(/^\/share\/([0-9a-f-]{36})(?:\/card\.png)?$/i);

    // Social crawlers do not send Origin headers. Share preview pages and their
    // PNG cards are public GET endpoints, so serve them before the API CORS gate.
    if (request.method === 'GET' && shareMatch) {
      return serveScoreShare(request, env, shareMatch[1]);
    }

    if (request.method === 'OPTIONS') {
      if (!isAllowedOrigin(origin, request.url)) return new Response('Origin not allowed', { status: 403 });
      return new Response(null, { status: 204, headers: headersFor(origin) });
    }

    if (!isAllowedOrigin(origin, request.url)) return new Response('Origin not allowed', { status: 403 });

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

    if (request.method === 'POST' && pathname === '/shares') {
      if (!request.headers.get('Content-Type')?.toLowerCase().includes('application/json')) {
        return json({ error: 'Expected application/json' }, 415, origin);
      }

      let raw;
      try {
        raw = await request.text();
      } catch {
        return json({ error: 'Invalid request body' }, 400, origin);
      }
      if (new TextEncoder().encode(raw).byteLength > MAX_SHARE_BODY_BYTES) return json({ error: 'Request too large' }, 413, origin);

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return json({ error: 'Invalid JSON' }, 400, origin);
      }

      const nickname = cleanNickname(payload?.nickname) || 'Bad Bad Boy';
      const score = payload?.score;
      const wave = payload?.wave;
      if (!Number.isSafeInteger(score) || score < 0 || score > MAX_SCORE
        || !Number.isSafeInteger(wave) || wave < 1 || wave > MAX_WAVE) {
        return json({ error: 'Invalid score share' }, 400, origin);
      }

      const id = crypto.randomUUID();
      try {
        await env.DB.prepare(
          'INSERT INTO shared_scores (id, nickname, score, wave) VALUES (?, ?, ?, ?)'
        ).bind(id, nickname, score, wave).run();
        return json({ url: new URL(`/share/${id}`, request.url).href }, 201, origin);
      } catch {
        return json({ error: 'Could not create score link' }, 503, origin);
      }
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};
