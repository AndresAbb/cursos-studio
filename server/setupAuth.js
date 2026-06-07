// ─── One-time MongoDB auth bootstrap ─────────────────────────────
// Creates the MongoDB users the app needs, using the SAME credentials
// the app reads from .env, so both run setups (native + docker) keep
// authenticating against the same shared cursos_studio database.
//
//   1. Run this ONCE while mongod still has auth disabled:
//        node server/setupAuth.js          (or setup-mongo-auth.bat)
//   2. Enable authorization in mongod.cfg and restart mongod
//      (the script prints the exact steps when it finishes).
//
// It is safe to re-run: if auth is already enabled it reconnects using
// the admin credentials from .env and updates the users in place.

require('dotenv').config();
const mongoose = require('mongoose');

const HOST   = (process.env.MONGO_HOST || 'localhost:27017').trim();
const DB     = (process.env.MONGO_DB   || 'cursos_studio').trim();
const USER   = (process.env.MONGO_USER || '').trim();
const PASS   = process.env.MONGO_PASS || '';
const A_USER = (process.env.MONGO_ADMIN_USER || '').trim();
const A_PASS = process.env.MONGO_ADMIN_PASS || '';

function die(msg) { console.error('❌ ' + msg); process.exit(1); }

if (!USER || !PASS) {
  die('MONGO_USER and MONGO_PASS must be set in .env before running this.');
}

const enc = encodeURIComponent;
const plainUri = `mongodb://${HOST}/admin`;
const adminUri = `mongodb://${enc(A_USER)}:${enc(A_PASS)}@${HOST}/admin?authSource=admin`;

const connect = (uri) =>
  mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();

// Log in as the admin user. Returns the connection, or null if the admin
// user doesn't exist yet (or the password doesn't match).
async function tryAdminLogin() {
  if (!A_USER || !A_PASS) return null;
  try { return await connect(adminUri); }
  catch (err) {
    if (/Authentication failed/i.test(err.message || '')) return null;
    throw err;
  }
}

// createUser, or updateUser (pwd + roles) if it already exists.
async function upsertUser(db, name, pwd, roles) {
  try {
    await db.command({ createUser: name, pwd, roles });
    console.log(`✅ created user "${name}" on ${db.databaseName}`);
  } catch (err) {
    if (err.codeName === 'DuplicateKey' || err.code === 51003 || /already exists/i.test(err.message)) {
      await db.command({ updateUser: name, pwd, roles });
      console.log(`↻  updated existing user "${name}" on ${db.databaseName}`);
    } else {
      throw err;
    }
  }
}

const ADMIN_ROLES = [
  { role: 'userAdminAnyDatabase', db: 'admin' },
  { role: 'readWriteAnyDatabase', db: 'admin' },
];

(async () => {
  if (!A_USER || !A_PASS) {
    die('Set MONGO_ADMIN_USER / MONGO_ADMIN_PASS in .env — needed to create ' +
        'users and to re-run this once auth is on.');
  }

  // Phase 1: ensure the admin user exists and we can authenticate as it.
  // Works in all three states: auth OFF, auth ON with no users yet (via
  // MongoDB's localhost exception), and auth ON with the admin already there.
  let admin = await tryAdminLogin();
  if (!admin) {
    const plain = await connect(plainUri);
    try {
      await upsertUser(plain.getClient().db('admin'), A_USER, A_PASS, ADMIN_ROLES);
      // Re-auth as admin. If auth is still OFF this stays null, so the same
      // plain connection (which has full rights) creates the app user too.
      admin = await tryAdminLogin();
      if (!admin) {
        await upsertUser(plain.getClient().db(DB), USER, PASS, [{ role: 'readWrite', db: DB }]);
        console.log(`\n🎉 Users ready. Enable auth with enable-mongo-auth.ps1 (as admin), ` +
                    `then the app authenticates as "${USER}" against ${DB}.`);
        return;
      }
    } finally {
      await plain.close();
    }
  } else {
    // Refresh the admin's password/roles to match .env.
    await upsertUser(admin.getClient().db('admin'), A_USER, A_PASS, ADMIN_ROLES);
  }

  // Phase 2: the app user — read/write on the shared DB only.
  try {
    await upsertUser(admin.getClient().db(DB), USER, PASS, [{ role: 'readWrite', db: DB }]);
    console.log(`\n🎉 Users ready. The app authenticates as "${USER}" against ${DB}.`);
  } finally {
    await admin.close();
  }
})().catch((err) => die(err.message));
