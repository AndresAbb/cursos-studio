// Optional password auth — enabled when APP_PASSWORD is set in env.
// When disabled, the app behaves exactly as before (no login required).
// Friend cross-server endpoints (accept-invite, presence) stay public because
// they are already authenticated by per-friend tokens.

const crypto = require('crypto');

const PASSWORD = process.env.APP_PASSWORD || '';
// AUTH_SECRET stays stable across restarts only if user sets it; otherwise
// sessions reset when the server restarts (acceptable for a personal app).
const SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'cs_auth';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// API paths that must remain reachable without a login
const PUBLIC_API = new Set([
  '/api/health',
  '/api/login',
  '/api/logout',
  '/api/auth/status',
  '/api/friends/presence', // pushToken-authenticated
]);

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig  = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  let a, b;
  try { a = Buffer.from(sig, 'hex'); b = Buffer.from(expected, 'hex'); } catch { return null; }
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(/;\s*/).forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i)] = p.slice(i + 1);
  });
  return out;
}

const isEnabled = () => !!PASSWORD;

function isAuthed(req) {
  if (!isEnabled()) return true;
  const cookies = parseCookies(req.headers.cookie);
  return !!verify(cookies[COOKIE_NAME]);
}

function middleware(req, res, next) {
  if (!isEnabled()) return next();
  if (!req.path.startsWith('/api/')) return next();
  if (PUBLIC_API.has(req.path)) return next();
  // Friend-acceptance is authenticated by the one-time invite token in the URL
  if (req.path.startsWith('/api/friends/accept/')) return next();
  if (isAuthed(req)) return next();
  res.status(401).json({ error: 'unauthorized' });
}

function login(password) {
  if (!isEnabled()) return null;
  const a = Buffer.from(String(password || ''), 'utf8');
  const b = Buffer.from(PASSWORD, 'utf8');
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return sign({ exp: Date.now() + COOKIE_MAX_AGE_MS });
}

function cookieHeader(token) {
  return [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(COOKIE_MAX_AGE_MS / 1000)}`,
  ].join('; ');
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

module.exports = { isEnabled, isAuthed, middleware, login, cookieHeader, clearCookieHeader };
