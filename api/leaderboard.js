// Vercel Node.js Function: Global Leaderboard API backed by Upstash Redis / Vercel KV REST API.
const BOARD_KEY = 'afterglow-r35:leaderboard:v2';
const RUNS_KEY = 'afterglow-r35:submitted-runs:v2';
const MAX_ENTRIES = 100;
const MAX_RUN_IDS = 500;

function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

async function redisCmd(cfg, ...args) {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Redis HTTP ${res.status}: ${text.slice(0, 180)}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`Redis error: ${data.error}`);
  return data.result;
}

function sanitizeName(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14);
}

function normalizeEntries(raw) {
  if (!Array.isArray(raw)) return [];
  const byKey = new Map();
  for (const item of raw) {
    if (!item || typeof item.name !== 'string') continue;
    const name = sanitizeName(item.name);
    const best = Math.max(0, Math.round(Number(item.best) || 0));
    if (!name || !Number.isFinite(best)) continue;
    const key = name.toLowerCase();
    const runs = Math.max(1, Math.floor(Number(item.runs) || 1));
    const zone = String(item.zone || 'SUNSET COAST').slice(0, 24);
    const color = /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#1d61c9';
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { name, best, zone, color, runs });
    } else {
      if (best > prev.best) {
        prev.best = best;
        prev.zone = zone;
        prev.color = color;
      }
      prev.name = name;
      prev.runs = Math.max(prev.runs, runs);
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.best - a.best || b.runs - a.runs || a.name.localeCompare(b.name))
    .slice(0, MAX_ENTRIES);
}

async function loadState(cfg) {
  const [rawBoard, rawRuns] = await Promise.all([
    redisCmd(cfg, 'GET', BOARD_KEY),
    redisCmd(cfg, 'GET', RUNS_KEY)
  ]);
  const entries = normalizeEntries(rawBoard ? JSON.parse(rawBoard) : []);
  const runIds = Array.isArray(rawRuns ? JSON.parse(rawRuns) : null) ? JSON.parse(rawRuns) : [];
  return { entries, runIds };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET() {
  const cfg = getRedisConfig();
  if (!cfg) {
    return json({
      ok: false,
      code: 'CLOUD_NOT_CONFIGURED',
      error: 'Cloud leaderboard database is not configured. Link Upstash Redis (UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN) in Vercel Project Settings.'
    }, 503);
  }
  try {
    const { entries } = await loadState(cfg);
    return json({ ok: true, source: 'cloud', entries }, 200);
  } catch (error) {
    console.error('GET /api/leaderboard failed:', error);
    return json({ ok: false, code: 'CLOUD_READ_FAILED', error: 'Unable to load leaderboard from cloud storage.' }, 502);
  }
}

export async function POST(request) {
  const cfg = getRedisConfig();
  if (!cfg) {
    return json({
      ok: false,
      code: 'CLOUD_NOT_CONFIGURED',
      error: 'Cloud leaderboard database is not configured. Link Upstash Redis (UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN) in Vercel Project Settings.'
    }, 503);
  }
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: 'BAD_JSON', error: 'Invalid JSON request body.' }, 400);
  }

  const name = sanitizeName(payload?.name);
  const runId = String(payload?.runId || '').trim().slice(0, 64);
  const metres = Math.round(Number(payload?.distance));
  const zone = String(payload?.zone || 'SUNSET COAST').trim().slice(0, 24);
  const color = /^#[0-9a-f]{6}$/i.test(payload?.color) ? payload.color : '#1d61c9';

  if (!name) {
    return json({ ok: false, code: 'INVALID_NAME', error: 'Driver name is required.' }, 400);
  }
  if (!Number.isFinite(metres) || metres < 0 || metres > 5_000_000) {
    return json({ ok: false, code: 'INVALID_DISTANCE', error: 'Distance value is out of range.' }, 400);
  }

  try {
    const { entries, runIds } = await loadState(cfg);
    const key = name.toLowerCase();
    const alreadySubmitted = Boolean(runId && runIds.includes(runId));
    let entry = entries.find(item => item.name.toLowerCase() === key);
    let isNewBest = false;

    if (!alreadySubmitted) {
      if (!entry) {
        entry = { name, best: metres, zone, color, runs: 1 };
        entries.push(entry);
        isNewBest = metres > 0;
      } else {
        entry.name = name;
        entry.runs += 1;
        if (metres > entry.best) {
          entry.best = metres;
          entry.zone = zone;
          entry.color = color;
          isNewBest = true;
        }
      }
      if (runId) {
        runIds.push(runId);
        if (runIds.length > MAX_RUN_IDS) runIds.splice(0, runIds.length - MAX_RUN_IDS);
      }
      const sorted = normalizeEntries(entries);
      await Promise.all([
        redisCmd(cfg, 'SET', BOARD_KEY, JSON.stringify(sorted)),
        redisCmd(cfg, 'SET', RUNS_KEY, JSON.stringify(runIds))
      ]);
      const savedEntry = sorted.find(item => item.name.toLowerCase() === key) || entry;
      return json({ ok: true, source: 'cloud', duplicate: false, isNewBest, entry: savedEntry, entries: sorted }, 200);
    }

    return json({ ok: true, source: 'cloud', duplicate: true, isNewBest: false, entry: entry || null, entries }, 200);
  } catch (error) {
    console.error('POST /api/leaderboard failed:', error);
    return json({ ok: false, code: 'CLOUD_WRITE_FAILED', error: 'Unable to save score to cloud storage.' }, 502);
  }
}
