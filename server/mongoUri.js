// ─── MongoDB connection-string builder ───────────────────────────
// Both run setups (run_local.bat → native Node, and docker compose →
// containerised app) talk to the SAME MongoDB on the host and the SAME
// database (cursos_studio). The only thing that differs between them is
// the host:
//   • native  → localhost:27017
//   • docker  → host.docker.internal:27017  (set via MONGO_HOST)
//
// Credentials live ONCE in .env (MONGO_USER / MONGO_PASS) so both setups
// authenticate as the same user against the same shared database.
//
// Precedence:
//   1. MONGODB_URI  → full override (e.g. an Atlas SRV string). Wins.
//   2. parts        → built from MONGO_HOST / MONGO_DB / MONGO_USER / …
//
// If MONGO_USER is empty the URI is built WITHOUT credentials, so the
// app still works against a MongoDB that has auth disabled.

function buildMongoUri(env = process.env) {
  if (env.MONGODB_URI && env.MONGODB_URI.trim()) return env.MONGODB_URI.trim();

  const host = (env.MONGO_HOST || 'localhost:27017').trim();
  const db   = (env.MONGO_DB   || 'cursos_studio').trim();
  const user = (env.MONGO_USER || '').trim();
  const pass = env.MONGO_PASS || '';

  if (!user) return `mongodb://${host}/${db}`;

  const cred       = `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@`;
  const authSource = (env.MONGO_AUTH_SOURCE || db).trim();
  return `mongodb://${cred}${host}/${db}?authSource=${authSource}`;
}

// Same string with the password masked — safe to print in logs.
function redactMongoUri(uri) {
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:@/]+:)([^@]*)(@)/, '$1****$3');
}

module.exports = { buildMongoUri, redactMongoUri };
