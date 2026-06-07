require('dotenv').config();
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const os     = require('os');

const { Course, Module, Note, Sticker, Exam, ExternalCourse, Settings, Friend, Skill, GhostCourse, NetworkNode } = require('./models');
const { isAvailable: ytdlpAvailable, fetchPlaylist } = require('./ytdlp');
const { isConfigured: spotifyConfigured, fetchItems: spotifyFetchItems } = require('./services/spotify');
const { checkEmbed } = require('./services/embedCheck');
const { writeNote } = require('./services/obsidian');
const { generateExam: aiGenerateExam, isConfigured: aiConfigured } = require('./services/ai');
const auth = require('./auth');
const { buildMongoUri, redactMongoUri } = require('./mongoUri');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = buildMongoUri();

// ─── Local config files (read once at boot) ──────
// courses.json — feature flags for course-level behaviour (e.g. multiplayer)
// graph.json   — feature flags for the Skills Graph (e.g. include externals)
function loadJsonConfig(name, defaults) {
  const p = path.join(__dirname, '..', name);
  try {
    if (fs.existsSync(p)) return { ...defaults, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch (err) {
    console.warn(`⚠ Could not parse ${name}:`, err.message);
  }
  return { ...defaults };
}
const coursesConfig = loadJsonConfig('courses.json', { multiplayer: false });
const graphConfig   = loadJsonConfig('graph.json',   { includeExternalCourses: true });
console.log('🎛  courses.json:', coursesConfig);
console.log('🎛  graph.json:  ', graphConfig);

// ─── Middleware ──────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(auth.middleware);
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Auth routes ─────────────────────────────────
app.get('/api/auth/status', (req, res) => {
  res.json({ enabled: auth.isEnabled(), authed: auth.isAuthed(req) });
});

app.post('/api/login', (req, res) => {
  if (!auth.isEnabled()) return res.json({ ok: true });
  const token = auth.login(req.body?.password);
  if (!token) return res.status(401).json({ error: 'Contraseña incorrecta' });
  res.setHeader('Set-Cookie', auth.cookieHeader(token));
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', auth.clearCookieHeader());
  res.json({ ok: true });
});

// uploads dir
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// In-memory upload for the JSON course importer — the file is parsed and
// discarded, never written to /uploads.
const jsonUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── DB Connection ───────────────────────────────
let dbReady = false;
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    dbReady = true;
    console.log('✅ MongoDB conectado:', redactMongoUri(MONGODB_URI));
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
  }
}
connectDB();

const w = (fn) => (req, res) => fn(req, res).catch(err => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// ─── Health ──────────────────────────────────────
app.get('/api/health', w(async (req, res) => {
  const ytdlp = await ytdlpAvailable();
  const spotify = spotifyConfigured();
  res.json({
    ok: true,
    db: dbReady ? 'connected' : 'disconnected',
    ytdlp,
    spotify,
    ai: {
      openai:     aiConfigured('openai'),
      anthropic:  aiConfigured('anthropic'),
    },
    features: {
      multiplayer: !!coursesConfig.multiplayer,
      graphIncludeExternalCourses: !!graphConfig.includeExternalCourses,
    },
  });
}));

// Same flags, accessible without the full health roundtrip
app.get('/api/config', (req, res) => {
  res.json({
    courses: coursesConfig,
    graph:   graphConfig,
  });
});

// ════════════════════════════════════════════════
// SETTINGS (singleton)
// ════════════════════════════════════════════════
app.get('/api/settings', w(async (req, res) => {
  let s = await Settings.findById('global').lean();
  if (!s) s = (await Settings.create({ _id: 'global' })).toObject();
  res.json(s);
}));

app.put('/api/settings', w(async (req, res) => {
  const allowed = ['obsidianVaultPath','obsidianAutoSave','aiProvider','aiModel','quickLinks','showQuickLinks'];
  const data = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  const s = await Settings.findByIdAndUpdate('global', data, { new: true, upsert: true });
  res.json(s);
}));

// ════════════════════════════════════════════════
// COURSES
// ════════════════════════════════════════════════
app.get('/api/courses', w(async (req, res) => {
  // Active courses sort by manual `order`; archived ones fall to the end.
  const courses = await Course.find().sort({ order: 1, createdAt: -1 }).lean();
  const ids = courses.map(c => c._id);
  const moduleCounts = await Module.aggregate([
    { $match: { courseId: { $in: ids } } },
    { $group: { _id: '$courseId', total: { $sum: 1 }, done: { $sum: { $cond: ['$done', 1, 0] } } } }
  ]);
  const map = Object.fromEntries(moduleCounts.map(m => [String(m._id), m]));
  res.json(courses.map(c => ({
    ...c,
    totalModules: map[String(c._id)]?.total || 0,
    doneModules:  map[String(c._id)]?.done  || 0,
  })));
}));

function deriveFavicon(homepageUrl) {
  if (!homepageUrl) return { favicon: '', domain: '' };
  try {
    const domain = new URL(homepageUrl).hostname;
    return { favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`, domain };
  } catch { return { favicon: '', domain: '' }; }
}

app.post('/api/courses', w(async (req, res) => {
  const data = { ...req.body };
  if (data.homepageUrl && !data.favicon) {
    const { favicon } = deriveFavicon(data.homepageUrl);
    if (favicon) data.favicon = favicon;
  }
  const c = await Course.create(data);
  res.json(c);
}));

app.get('/api/courses/:id', w(async (req, res) => {
  const c = await Course.findById(req.params.id).lean();
  if (!c) return res.status(404).json({ error: 'No encontrado' });
  res.json(c);
}));

// Reorder — accepts { orderedIds: [...] } and writes the index into `order`.
// Routed BEFORE /:id so "reorder" isn't treated as a course id.
app.post('/api/courses/reorder', w(async (req, res) => {
  const ids = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : [];
  await Promise.all(ids.map((id, i) =>
    Course.findByIdAndUpdate(id, { order: i }).catch(() => null)
  ));
  res.json({ ok: true, count: ids.length });
}));

// Update lifecycle status (active|finished|cancelled).
app.post('/api/courses/:id/status', w(async (req, res) => {
  const { status } = req.body;
  if (!['active','finished','cancelled'].includes(status)) {
    return res.status(400).json({ error: 'status inválido' });
  }
  const c = await Course.findByIdAndUpdate(
    req.params.id,
    { status, statusChangedAt: new Date() },
    { new: true }
  );
  res.json(c);
}));

app.patch('/api/courses/:id', w(async (req, res) => {
  const data = { ...req.body };
  // If user changed homepageUrl and didn't pass an explicit favicon, refresh it.
  if (data.homepageUrl !== undefined && data.favicon === undefined) {
    const { favicon } = deriveFavicon(data.homepageUrl);
    data.favicon = favicon;
  }
  const c = await Course.findByIdAndUpdate(req.params.id, data, { new: true });
  res.json(c);
}));

app.delete('/api/courses/:id', w(async (req, res) => {
  const id = req.params.id;
  await Module.deleteMany({ courseId: id });
  await Note.deleteMany({ courseId: id });
  await Sticker.deleteMany({ courseId: id });
  await Exam.deleteMany({ courseId: id });
  await Course.findByIdAndDelete(id);
  res.json({ ok: true });
}));

// Grades
app.get('/api/courses/:id/grades', w(async (req, res) => {
  const c = await Course.findById(req.params.id).lean();
  if (!c) return res.status(404).json({ error: 'No encontrado' });
  res.json(c.grades || []);
}));

// Exam prompt from weekly/monthly/all materials
app.get('/api/courses/:id/exam-prompt', w(async (req, res) => {
  const { scope = 'week', week } = req.query;
  const course = await Course.findById(req.params.id).lean();
  if (!course) return res.status(404).json({ error: 'No encontrado' });

  let modules;
  const w = parseInt(week) || 0;
  if (scope === 'week') {
    modules = await Module.find({ courseId: course._id, week: w }).lean();
  } else if (scope === 'month') {
    const startW = Math.floor(w / 4) * 4;
    modules = await Module.find({ courseId: course._id, week: { $gte: startW, $lt: startW + 4 } }).lean();
  } else {
    modules = await Module.find({ courseId: course._id }).lean();
  }

  const moduleList = modules
    .filter(m => m.type !== 'ai-exam')
    .map(m => `- Sem ${m.week+1}: ${m.title}${m.description ? ' — ' + m.description : ''}`)
    .join('\n') || '(sin módulos en este rango)';

  const labels = (course.syllabusLabels || [])
    .map(l => `• ${l.title} (sem ${l.startWeek+1}–${l.endWeek+1})${l.description ? ': ' + l.description : ''}`)
    .join('\n');

  const scopeStr = scope === 'week' ? `la semana ${w+1}`
                 : scope === 'month' ? `el mes (semanas ${Math.floor(w/4)*4+1}–${Math.floor(w/4)*4+4})`
                 : 'el curso completo';

  const prompt = `Genera un examen sobre los contenidos de ${scopeStr} del curso "${course.title}".

Módulos cubiertos:
${moduleList}
${labels ? '\nEstructura del curso:\n' + labels : ''}

Instrucciones: Mezcla opción múltiple (60%) con respuesta corta (40%). Dificultad progresiva.`;

  res.json({ prompt });
}));

// Final exam prompt
app.get('/api/courses/:id/final-exam-prompt', w(async (req, res) => {
  const course = await Course.findById(req.params.id).lean();
  if (!course) return res.status(404).json({ error: 'No encontrado' });

  const modules = await Module.find({ courseId: course._id, type: { $ne: 'ai-exam' } }).lean();
  const exams   = await Exam.find({ courseId: course._id, score: { $ne: null } }).lean();

  const byWeek = {};
  modules.forEach(m => { (byWeek[m.week] = byWeek[m.week] || []).push(m); });

  const weekSummary = Object.entries(byWeek)
    .sort(([a],[b]) => +a - +b)
    .map(([wk, mods]) => {
      const label = (course.syllabusLabels || []).find(l => l.startWeek <= +wk && l.endWeek >= +wk);
      return `Semana ${+wk+1}${label ? ` [${label.title}]` : ''}:\n` +
             mods.map(m => `  • ${m.title}`).join('\n');
    }).join('\n');

  const examHistory = exams.length
    ? '\nExámenes previos:\n' + exams.map(e => `  • ${e.score}/${e.total} pts`).join('\n')
    : '';

  const sections = (course.syllabusLabels || []).length
    ? '\nSecciones del sílabo:\n' + course.syllabusLabels.map(l =>
        `  • ${l.title}${l.description ? ': ' + l.description : ''}`).join('\n')
    : '';

  const prompt = `Genera un EXAMEN FINAL para el curso "${course.title}".

Contenidos:
${weekSummary || '(sin contenido registrado)'}
${sections}${examHistory}

Instrucciones: Cubre TODOS los temas del curso de forma integral. Incluye preguntas síntesis que conecten múltiples semanas. Mayor dificultad que los parciales. Mezcla opción múltiple (50%), respuesta corta (30%) y desarrollo (20%).`;

  res.json({ prompt });
}));

// ════════════════════════════════════════════════
// MODULES
// ════════════════════════════════════════════════
app.get('/api/courses/:courseId/modules', w(async (req, res) => {
  const mods = await Module.find({ courseId: req.params.courseId })
    .sort({ week: 1, dayOfWeek: 1, order: 1, createdAt: 1 }).lean();
  res.json(mods);
}));

app.post('/api/courses/:courseId/modules', w(async (req, res) => {
  const data = { ...req.body, courseId: req.params.courseId };

  // Embed check for web modules
  if (data.type === 'web' && data.url) {
    try {
      const check = await checkEmbed(data.url);
      if (!check.canEmbed) {
        data.type    = 'web-link';
        data.favicon = check.favicon;
        data.domain  = check.domain;
        if (!data.title || data.title === data.url) data.title = check.title || data.domain || data.url;
      }
    } catch { /* non-fatal */ }
  }

  const m = await Module.create(data);
  res.json(m);
}));

// Bulk import — supports multi-day, real item fetching from yt-dlp / Spotify
app.post('/api/courses/:courseId/modules/bulk', w(async (req, res) => {
  const {
    type, url,
    daysOfWeek = [0],
    order = 'oldest',
    limit = 20,
    startWeek = 0,
    incrementalWeeks = true,
    fetchReal = false,
    // Legacy support: single dayOfWeek
    dayOfWeek,
    items: rawItems,
  } = req.body;

  const days = Array.isArray(daysOfWeek) && daysOfWeek.length > 0
    ? daysOfWeek
    : (dayOfWeek !== undefined ? [dayOfWeek] : [0]);

  let items = rawItems || [];

  // Fetch real items from yt-dlp / Spotify
  if (fetchReal && url) {
    if (type === 'youtube') {
      const avail = await ytdlpAvailable();
      if (!avail) return res.status(400).json({ error: 'yt-dlp no disponible. Instálalo para importar playlists reales.' });
      items = await fetchPlaylist(url, { limit });
    } else if (type === 'spotify') {
      if (!spotifyConfigured()) return res.status(400).json({ error: 'Spotify no configurado. Agrega SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET.' });
      items = await spotifyFetchItems(url, limit);
    }
  }

  if (!items.length) return res.status(400).json({ error: 'Lista vacía — no se encontraron items' });

  let arr = [...items].slice(0, limit);
  if (order === 'newest') arr.reverse();
  else if (order === 'az') arr.sort((a,b) => (a.title||'').localeCompare(b.title||''));
  else if (order === 'za') arr.sort((a,b) => (b.title||'').localeCompare(a.title||''));

  // Distribute across days: items fill day slots, advance week after all days used
  const docs = arr.map((it, i) => {
    const slot      = i % days.length;
    const weekDelta = Math.floor(i / days.length);
    return {
      courseId:     req.params.courseId,
      type,
      title:        it.title || `Item ${i+1}`,
      url:          it.url || url,
      dayOfWeek:    days[slot],
      week:         incrementalWeeks ? startWeek + weekDelta : startWeek,
      order:        Math.floor(i / days.length),
      importedFrom: it.source || url || '',
    };
  });

  const created = await Module.insertMany(docs);
  res.json(created);
}));

// ─── JSON import ─────────────────────────────────
// Import a whole course + its modules, OR add modules to an existing
// course, from a single JSON document. Accepts either a multipart file
// upload (field "file") or a raw application/json body.
//
// Format (see README → "Importar un curso desde JSON"):
//   {
//     "course":  { "title": "...", "emoji": "...", ... },   // new course
//     "modules": [ { "title": "...", "type": "youtube", ... } ]
//   }
// To add modules to an existing course, omit "course" and pass the
// course id as ?courseId=… (or a top-level "courseId" field). A bare
// JSON array is treated as the modules list.
const MODULE_TYPES  = ['youtube','spotify','web','web-link','text','ai-exam'];
const COURSE_FIELDS = ['title','emoji','color','description','favicon','homepageUrl',
                       'startDate','endDate','background','syllabusLabels'];
const MODULE_FIELDS = ['title','type','url','week','dayOfWeek','order','description',
                       'thumbnail','favicon','domain','textContent','examConfig',
                       'importedFrom','done','watchedSeconds'];

const pick = (src, fields) => {
  const out = {};
  for (const f of fields) if (src[f] !== undefined) out[f] = src[f];
  return out;
};

app.post('/api/import/course', jsonUpload.single('file'), w(async (req, res) => {
  // 1. Parse payload from the uploaded file or the JSON body.
  let payload;
  if (req.file) {
    try { payload = JSON.parse(req.file.buffer.toString('utf8')); }
    catch (e) { return res.status(400).json({ error: 'JSON inválido: ' + e.message }); }
  } else if (req.body && typeof req.body === 'object') {
    payload = req.body;
  } else {
    return res.status(400).json({ error: 'Falta el archivo JSON (campo "file") o un cuerpo JSON.' });
  }
  if (Array.isArray(payload)) payload = { modules: payload };   // bare array == modules
  const rawModules = Array.isArray(payload.modules) ? payload.modules : [];

  // 2. Resolve target course: existing (courseId) or new (course object).
  const courseId = req.query.courseId || payload.courseId;
  let course;
  if (courseId) {
    course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado: ' + courseId });
  } else {
    if (!payload.course || !payload.course.title) {
      return res.status(400).json({
        error: 'Para crear un curso nuevo incluye "course" con al menos "title". ' +
               'Para añadir módulos a uno existente, pasa ?courseId=… .',
      });
    }
    const data = pick(payload.course, COURSE_FIELDS);
    if (data.homepageUrl && !data.favicon) {
      const { favicon } = deriveFavicon(data.homepageUrl);
      if (favicon) data.favicon = favicon;
    }
    course = await Course.create(data);
  }

  // 3. Validate + build module docs (unknown fields are dropped by pick()).
  const errors = [];
  const docs = rawModules.map((m, i) => {
    const d = pick(m || {}, MODULE_FIELDS);
    if (!d.title) errors.push(`módulo #${i + 1}: falta "title"`);
    if (!d.type)  errors.push(`módulo #${i + 1}: falta "type"`);
    else if (!MODULE_TYPES.includes(d.type)) {
      errors.push(`módulo #${i + 1}: "type" inválido "${d.type}" (usa: ${MODULE_TYPES.join(', ')})`);
    }
    d.courseId = course._id;
    return d;
  });

  if (errors.length) {
    // Roll back a freshly-created course so a bad import leaves no orphan.
    if (!courseId) await Course.deleteOne({ _id: course._id });
    return res.status(400).json({ error: 'Errores de validación en los módulos', details: errors });
  }

  const created = docs.length ? await Module.insertMany(docs) : [];
  res.json({
    course,
    createdCourse: !courseId,
    modulesCreated: created.length,
    modules: created,
  });
}));

app.patch('/api/modules/:id', w(async (req, res) => {
  const m = await Module.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(m);
}));

// Duplicate module to a new date
app.post('/api/modules/:id/duplicate', w(async (req, res) => {
  const src = await Module.findById(req.params.id).lean();
  if (!src) return res.status(404).json({ error: 'No encontrado' });
  const { _id, createdAt, updatedAt, ...rest } = src;
  const dup = await Module.create({
    ...rest,
    week:       req.body.week       !== undefined ? req.body.week       : src.week,
    dayOfWeek:  req.body.dayOfWeek  !== undefined ? req.body.dayOfWeek  : src.dayOfWeek,
    done:           false,
    watchedSeconds: 0,
  });
  res.json(dup);
}));

// Add watch time
app.post('/api/modules/:id/time', w(async (req, res) => {
  const seconds = Number(req.body.seconds) || 0;
  const m = await Module.findByIdAndUpdate(
    req.params.id,
    { $inc: { watchedSeconds: seconds } },
    { new: true }
  );
  if (m) await Course.findByIdAndUpdate(m.courseId, { $inc: { totalSeconds: seconds } });
  res.json(m);
}));

app.delete('/api/modules/:id', w(async (req, res) => {
  await Note.deleteMany({ moduleId: req.params.id });
  await Exam.deleteMany({ moduleId: req.params.id });
  await Module.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// ════════════════════════════════════════════════
// EXAMS
// ════════════════════════════════════════════════

// Helper: compute if the module's scheduled date has arrived
function moduleScheduledDate(m, course) {
  const cs = new Date(course.startDate);
  cs.setHours(0, 0, 0, 0);
  const dow = cs.getDay();
  const diffToMon = (dow === 0 ? -6 : 1) - dow;
  const monday = new Date(cs);
  monday.setDate(cs.getDate() + diffToMon);
  const d = new Date(monday);
  d.setDate(monday.getDate() + m.week * 7 + m.dayOfWeek);
  d.setHours(0, 0, 0, 0);
  return d;
}

app.get('/api/modules/:id/exam', w(async (req, res) => {
  const m = await Module.findById(req.params.id).lean();
  if (!m) return res.status(404).json({ error: 'No encontrado' });
  const course = await Course.findById(m.courseId).lean();

  const moduleDate = moduleScheduledDate(m, course);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const reachedDate = today >= moduleDate;

  const exam = await Exam.findOne({ moduleId: m._id }).lean();
  if (!exam) return res.json({ exam: null, reachedDate, moduleDate });

  const visible = !m.examConfig?.locked || reachedDate || !!exam.unlockedAt;
  res.json({ exam: { ...exam, visible }, reachedDate, moduleDate });
}));

app.post('/api/modules/:id/exam/generate', w(async (req, res) => {
  const m = await Module.findById(req.params.id);
  if (!m) return res.status(404).json({ error: 'No encontrado' });
  const cfg = m.examConfig || {};

  const content = await aiGenerateExam({
    provider:      cfg.provider,
    topic:         cfg.prompt,
    questionCount: cfg.questionCount || 10,
    timeLimit:     cfg.timeLimit     || 30,
    model:         cfg.model,
  });

  const exam = await Exam.findOneAndUpdate(
    { moduleId: m._id },
    { content, generatedAt: new Date(), unlockedAt: null, courseId: m.courseId },
    { new: true, upsert: true }
  );

  // Re-lock after regeneration
  await Module.findByIdAndUpdate(m._id, { 'examConfig.locked': true });

  res.json(exam);
}));

app.post('/api/modules/:id/exam/unlock', w(async (req, res) => {
  const m = await Module.findById(req.params.id);
  if (!m) return res.status(404).json({ error: 'No encontrado' });

  await Module.findByIdAndUpdate(m._id, { 'examConfig.locked': false });
  const exam = await Exam.findOneAndUpdate(
    { moduleId: m._id },
    { $set: { unlockedAt: new Date(), courseId: m.courseId } },
    { new: true, upsert: true }
  );
  res.json(exam);
}));

app.post('/api/modules/:id/exam/paste', w(async (req, res) => {
  const m = await Module.findById(req.params.id);
  if (!m) return res.status(404).json({ error: 'No encontrado' });
  if (!req.body.content) return res.status(400).json({ error: 'Sin contenido' });

  const exam = await Exam.findOneAndUpdate(
    { moduleId: m._id },
    { content: req.body.content, generatedAt: new Date(), courseId: m.courseId },
    { new: true, upsert: true }
  );
  res.json(exam);
}));

app.post('/api/modules/:id/exam/grade', w(async (req, res) => {
  const m = await Module.findById(req.params.id);
  if (!m) return res.status(404).json({ error: 'No encontrado' });
  const { score, total, notes } = req.body;

  const exam = await Exam.findOneAndUpdate(
    { moduleId: m._id },
    { score, total, userNotes: notes || '', takenAt: new Date() },
    { new: true }
  );

  // Update gradebook: replace existing entry for this module
  await Course.findByIdAndUpdate(m.courseId, { $pull: { grades: { moduleId: m._id } } });
  await Course.findByIdAndUpdate(m.courseId, {
    $push: { grades: { moduleId: m._id, moduleTitle: m.title, score, total, date: new Date(), notes: notes || '' } }
  });
  await Module.findByIdAndUpdate(m._id, { done: true });

  res.json(exam);
}));

// ════════════════════════════════════════════════
// NOTES
// ════════════════════════════════════════════════
app.get('/api/modules/:moduleId/note', w(async (req, res) => {
  const note = await Note.findOne({ moduleId: req.params.moduleId });
  res.json(note || { content: '' });
}));

app.put('/api/modules/:moduleId/note', w(async (req, res) => {
  const m = await Module.findById(req.params.moduleId);
  if (!m) return res.status(404).json({ error: 'Módulo no existe' });
  const note = await Note.findOneAndUpdate(
    { moduleId: req.params.moduleId },
    { content: req.body.content || '', courseId: m.courseId, moduleId: m._id },
    { new: true, upsert: true }
  );

  // Auto-save to Obsidian if configured
  try {
    const settings = await Settings.findById('global').lean();
    if (settings?.obsidianAutoSave && settings?.obsidianVaultPath) {
      const course = await Course.findById(m.courseId).lean();
      const safe = (m.title || 'apuntes').replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 100) || 'apuntes';
      const md = `# ${m.title}\n\n_Tipo: ${m.type} · Semana ${m.week+1} · Día ${m.dayOfWeek+1}_\n\nLink: ${m.url}\n\n---\n\n${note.content || ''}\n`;
      await writeNote({ vaultPath: settings.obsidianVaultPath, subPath: course?.title || '', filename: safe, content: md });
    }
  } catch { /* Obsidian errors are non-fatal */ }

  res.json(note);
}));

// Explicit Obsidian save
app.post('/api/modules/:moduleId/note/obsidian', w(async (req, res) => {
  const m = await Module.findById(req.params.moduleId);
  if (!m) return res.status(404).json({ error: 'No existe' });
  const settings = await Settings.findById('global').lean();
  if (!settings?.obsidianVaultPath) return res.status(400).json({ error: 'Vault no configurado. Ve a ⚙️ Configuración.' });

  const note   = await Note.findOne({ moduleId: req.params.moduleId });
  const course = await Course.findById(m.courseId).lean();
  const safe   = (m.title || 'apuntes').replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 100) || 'apuntes';
  const md     = `# ${m.title}\n\n_Tipo: ${m.type} · Semana ${m.week+1} · Día ${m.dayOfWeek+1}_\n\nLink: ${m.url}\n\n---\n\n${note?.content || ''}\n`;

  const result = await writeNote({
    vaultPath: settings.obsidianVaultPath,
    subPath:   course?.title || '',
    filename:  safe,
    content:   md,
  });
  res.json({ ok: true, path: result.relative });
}));

// Download .md
app.get('/api/modules/:moduleId/note/download', w(async (req, res) => {
  const m = await Module.findById(req.params.moduleId);
  if (!m) return res.status(404).send('No existe');
  const note = await Note.findOne({ moduleId: req.params.moduleId });
  const safe = (m.title || 'apuntes').replace(/[^a-z0-9_\-\sáéíóúñÁÉÍÓÚÑ]/gi,'').trim().replace(/\s+/g,'_');
  const filename = `${safe || 'apuntes'}.md`;
  const content = `# ${m.title}\n\n_Tipo: ${m.type} · Semana ${m.week+1} · Día ${m.dayOfWeek+1}_\n\nLink: ${m.url}\n\n---\n\n${note?.content || ''}\n`;
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
}));

// ════════════════════════════════════════════════
// STICKERS
// ════════════════════════════════════════════════
app.get('/api/courses/:courseId/stickers', w(async (req, res) => {
  res.json(await Sticker.find({ courseId: req.params.courseId }).lean());
}));

app.post('/api/courses/:courseId/stickers', w(async (req, res) => {
  res.json(await Sticker.create({ ...req.body, courseId: req.params.courseId }));
}));

app.patch('/api/stickers/:id', w(async (req, res) => {
  res.json(await Sticker.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

app.delete('/api/stickers/:id', w(async (req, res) => {
  await Sticker.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

app.delete('/api/courses/:courseId/stickers', w(async (req, res) => {
  await Sticker.deleteMany({ courseId: req.params.courseId });
  res.json({ ok: true });
}));

// ════════════════════════════════════════════════
// EXTERNAL COURSES
// ════════════════════════════════════════════════
app.get('/api/externals', w(async (req, res) => {
  res.json(await ExternalCourse.find().sort({ title: 1 }).lean());
}));

app.post('/api/externals', w(async (req, res) => {
  // Fetch favicon + domain if URL provided
  let data = { ...req.body };
  if (data.url && !data.favicon) {
    try {
      const domain = new URL(data.url).hostname;
      data.domain  = domain;
      data.favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch { /* ignore */ }
  }
  res.json(await ExternalCourse.create(data));
}));

app.patch('/api/externals/:id', w(async (req, res) => {
  res.json(await ExternalCourse.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

app.delete('/api/externals/:id', w(async (req, res) => {
  await ExternalCourse.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// ════════════════════════════════════════════════
// GHOST COURSES (planned-but-not-yet-created)
// ════════════════════════════════════════════════
app.get('/api/ghosts', w(async (req, res) => {
  res.json(await GhostCourse.find().sort({ order: 1, plannedStartDate: 1, createdAt: -1 }).lean());
}));

app.post('/api/ghosts', w(async (req, res) => {
  res.json(await GhostCourse.create(req.body));
}));

app.patch('/api/ghosts/:id', w(async (req, res) => {
  res.json(await GhostCourse.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

app.delete('/api/ghosts/:id', w(async (req, res) => {
  await GhostCourse.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// Promote a ghost into a real Course (copies title/emoji/color/startDate,
// marks the ghost as promoted, returns the new course).
app.post('/api/ghosts/:id/promote', w(async (req, res) => {
  const g = await GhostCourse.findById(req.params.id);
  if (!g) return res.status(404).json({ error: 'No encontrado' });
  if (g.status === 'promoted' && g.promotedCourseId) {
    const existing = await Course.findById(g.promotedCourseId).lean();
    if (existing) return res.json({ ghost: g, course: existing });
  }
  const c = await Course.create({
    title:       g.title,
    emoji:       g.emoji || '📚',
    color:       g.color,
    description: g.notes || '',
    startDate:   g.plannedStartDate,
    background:  { type: 'color', value: '#f5f0e8' },
  });
  g.status = 'promoted';
  g.promotedCourseId = c._id;
  await g.save();
  res.json({ ghost: g, course: c });
}));

// ════════════════════════════════════════════════
// GLOBAL CALENDAR
// ════════════════════════════════════════════════
app.get('/api/calendar/global', w(async (req, res) => {
  const [courses, modules, externals] = await Promise.all([
    Course.find().lean(),
    Module.find().lean(),
    ExternalCourse.find().lean(),
  ]);
  res.json({ courses, modules, externals });
}));

// ════════════════════════════════════════════════
// SKILLS (Graph)
// ════════════════════════════════════════════════
app.get('/api/skills', w(async (req, res) => {
  res.json(await Skill.find().sort({ createdAt: 1 }).lean());
}));

app.post('/api/skills', w(async (req, res) => {
  res.json(await Skill.create(req.body));
}));

app.patch('/api/skills/:id', w(async (req, res) => {
  res.json(await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

app.delete('/api/skills/:id', w(async (req, res) => {
  const id = req.params.id;
  // Remove backreferences from peers
  await Skill.updateMany(
    { 'connections.skillId': id },
    { $pull: { connections: { skillId: id } } }
  );
  await Skill.findByIdAndDelete(id);
  res.json({ ok: true });
}));

// Toggle/create a symmetric connection between two skills
app.post('/api/skills/:id/connect', w(async (req, res) => {
  const a = req.params.id;
  const b = req.body.skillId;
  const strength = req.body.strength != null ? Number(req.body.strength) : 0.5;
  if (!b || a === b) return res.status(400).json({ error: 'skillId requerido' });
  const sA = await Skill.findById(a);
  const sB = await Skill.findById(b);
  if (!sA || !sB) return res.status(404).json({ error: 'No encontrado' });

  const upsert = (skill, peerId) => {
    const existing = skill.connections.find(c => String(c.skillId) === String(peerId));
    if (existing) existing.strength = strength;
    else skill.connections.push({ skillId: peerId, strength });
  };
  upsert(sA, b);
  upsert(sB, a);
  await sA.save();
  await sB.save();
  res.json({ ok: true });
}));

app.post('/api/skills/:id/disconnect', w(async (req, res) => {
  const a = req.params.id;
  const b = req.body.skillId;
  if (!b) return res.status(400).json({ error: 'skillId requerido' });
  await Skill.findByIdAndUpdate(a, { $pull: { connections: { skillId: b } } });
  await Skill.findByIdAndUpdate(b, { $pull: { connections: { skillId: a } } });
  res.json({ ok: true });
}));

// Today's scheduled-module completion status (used by card deck lock)
app.get('/api/today-obligations', w(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const courses = await Course.find({ archived: { $ne: true } }).lean();
  let total = 0, done = 0;
  for (const c of courses) {
    if (!c.startDate) continue;
    const modules = await Module.find({ courseId: c._id }).lean();
    for (const m of modules) {
      const sched = moduleScheduledDate(m, c);
      if (sched.getTime() === today.getTime()) {
        total++;
        if (m.done) done++;
      }
    }
  }
  res.json({ met: total === 0 || done === total, total, done });
}));

// Skill card cycle colors (used when cardValue wraps past K)
const SKILL_CYCLE_COLORS = [
  '#7c5ce0','#c8622a','#4a7c59','#5b4a8a','#b84f7a',
  '#d4a017','#2a6e8a','#7a4a2a','#3a6a7a','#2a7a6a',
];

// Add a learning experience to a skill card
app.post('/api/skills/:id/learn', w(async (req, res) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) return res.status(404).json({ error: 'No encontrado' });
  const addValue = Math.max(1, Math.min(10, Number(req.body.value) || 1));
  const note = String(req.body.note || '').slice(0, 500);

  skill.learningExperiences.push({ value: addValue, note, date: new Date() });

  let newCardValue = (skill.cardValue || 1) + addValue;
  if (newCardValue > 13) {
    skill.cardCycle = (skill.cardCycle || 0) + 1;
    newCardValue = ((newCardValue - 1) % 13) + 1;
    skill.color = SKILL_CYCLE_COLORS[skill.cardCycle % SKILL_CYCLE_COLORS.length];
  }
  skill.cardValue = newCardValue;
  await skill.save();
  res.json(skill.toObject());
}));

// ════════════════════════════════════════════════
// NETWORK NODES (Networking map)
// ════════════════════════════════════════════════
// The six "worlds" seeded the first time the map is opened. Stored in the
// DB afterwards so positions and projects persist and can be customized.
const NET_DEFAULT_NODES = [
  { key: 'academic',         name: 'Mundo Académico',          emoji: '🎓', color: '#2a6e8a', order: 0 },
  { key: 'finance',          name: 'Mundo Financiero',         emoji: '💼', color: '#4a7c59', order: 1 },
  { key: 'teaching',         name: 'Mundo de la Enseñanza',    emoji: '📚', color: '#d4a017', order: 2 },
  { key: 'entrepreneurship', name: 'Mundo Emprendedor',        emoji: '🚀', color: '#c8622a', order: 3 },
  { key: 'cultural',         name: 'Mundo Cultural',           emoji: '🎭', color: '#b84f7a', order: 4 },
  { key: 'nonprofit',        name: 'Mundo Sin Fines de Lucro', emoji: '🤲', color: '#5b4a8a', order: 5 },
];

app.get('/api/network-nodes', w(async (req, res) => {
  let nodes = await NetworkNode.find().sort({ order: 1, createdAt: 1 }).lean();
  if (!nodes.length) {
    await NetworkNode.insertMany(NET_DEFAULT_NODES);
    nodes = await NetworkNode.find().sort({ order: 1, createdAt: 1 }).lean();
  }
  res.json(nodes);
}));

app.post('/api/network-nodes', w(async (req, res) => {
  res.json(await NetworkNode.create(req.body));
}));

app.patch('/api/network-nodes/:id', w(async (req, res) => {
  res.json(await NetworkNode.findByIdAndUpdate(req.params.id, req.body, { new: true }));
}));

app.delete('/api/network-nodes/:id', w(async (req, res) => {
  await NetworkNode.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// ════════════════════════════════════════════════
// UPLOADS
// ════════════════════════════════════════════════
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ─── Catch-all → SPA (or login page if auth enabled and not signed in) ─
app.get('*', (req, res) => {
  if (auth.isEnabled() && !auth.isAuthed(req) && req.path !== '/login.html') {
    return res.redirect(`/login.html?next=${encodeURIComponent(req.originalUrl)}`);
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ════════════════════════════════════════════════
// WEBSOCKET + HTTP SERVER
// ════════════════════════════════════════════════
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const wsClients = new Set();

wss.on('connection', (ws, req) => {
  if (!auth.isAuthed(req)) { ws.close(1008, 'unauthorized'); return; }
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
  // Unknown messages are silently dropped
  ws.on('message', () => {});
});

function wsBroadcast(data) {
  const msg = JSON.stringify(data);
  wsClients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
}

// ════════════════════════════════════════════════
// FRIENDS — RATE LIMIT STATE (in-memory, resets on restart)
// ════════════════════════════════════════════════
const PRESENCE_MS = 5 * 60 * 1000;   // 5 min between presence events per friend
const POKE_MS     = 60 * 60 * 1000;  // 1 hr between pokes per friend
const presenceSent = new Map();       // `out:${type}:${friendId}` → timestamp
const presenceRecv = new Map();       // `in:${type}:${friendId}` → timestamp
const pokeSent     = new Map();       // `poke:${friendId}` → timestamp

function throttled(map, key, intervalMs) {
  const last = map.get(key) || 0;
  if (Date.now() - last < intervalMs) return true;
  map.set(key, Date.now());
  return false;
}

// ════════════════════════════════════════════════
// FRIENDS — HELPERS
// ════════════════════════════════════════════════
const VALID_EVENTS = new Set(['friend.studying', 'progress.updated', 'exam.upcoming', 'poke.sent']);

// Returns all non-loopback IPv4 addresses on this machine
function getLanIps() {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(ifaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
    }
  }
  return ips;
}

// Best URL to embed in invite links: publicUrl setting > first LAN IP > localhost
async function resolvePublicBase(req) {
  const s = await Settings.findById('global').lean();
  if (s?.publicUrl) return s.publicUrl.replace(/\/$/, '');
  const ips = getLanIps();
  if (ips.length) return `${req.protocol}://${ips[0]}:${PORT}`;
  return `${req.protocol}://${req.get('host')}`;
}

async function ensureUserId() {
  let s = await Settings.findById('global');
  if (!s) s = await Settings.create({ _id: 'global' });
  if (!s.userId) { s.userId = crypto.randomUUID(); await s.save(); }
  return s;
}

// ════════════════════════════════════════════════
// FRIENDS — ROUTES (gated by courses.json: multiplayer)
// ════════════════════════════════════════════════
app.use('/api/friends', (req, res, next) => {
  if (!coursesConfig.multiplayer) {
    return res.status(403).json({ error: 'Multiplayer disabled in courses.json' });
  }
  next();
});

// Own identity + network info
app.get('/api/friends/me', w(async (req, res) => {
  const s = await ensureUserId();
  const lanIps = getLanIps();
  const activeBase = await resolvePublicBase(req);
  res.json({
    userId: s.userId, displayName: s.displayName, avatarEmoji: s.avatarEmoji,
    publicUrl: s.publicUrl || '',
    lanIps,
    activeBase,
  });
}));

app.patch('/api/friends/me', w(async (req, res) => {
  const allowed = ['displayName', 'avatarEmoji', 'publicUrl'];
  const data = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  const s = await Settings.findByIdAndUpdate('global', data, { new: true, upsert: true });
  const lanIps = getLanIps();
  const activeBase = await resolvePublicBase(req);
  res.json({
    userId: s.userId, displayName: s.displayName, avatarEmoji: s.avatarEmoji,
    publicUrl: s.publicUrl || '',
    lanIps,
    activeBase,
  });
}));

// List accepted friends
app.get('/api/friends', w(async (req, res) => {
  res.json(await Friend.find({ status: { $ne: 'blocked' } }).sort({ createdAt: -1 }).lean());
}));

// Generate invite link — uses publicUrl setting or auto-detected LAN IP
app.post('/api/friends/invite', w(async (req, res) => {
  const s    = await ensureUserId();
  const base = await resolvePublicBase(req);
  const inviteToken = crypto.randomBytes(16).toString('hex');
  const pushToken   = crypto.randomBytes(16).toString('hex');
  await Friend.create({ inviteToken, pushToken, status: 'pending' });
  const link = `${base}/?accept-friend=${inviteToken}` +
               `&from=${encodeURIComponent(s.userId)}` +
               `&name=${encodeURIComponent(s.displayName || 'Amigo')}` +
               `&emoji=${encodeURIComponent(s.avatarEmoji || '🎓')}` +
               `&url=${encodeURIComponent(base)}`;
  res.json({ link, base });
}));

// Accept invite (called by the friend who opens the link)
app.post('/api/friends/accept/:token', w(async (req, res) => {
  const f = await Friend.findOne({ inviteToken: req.params.token, status: 'pending' });
  if (!f) return res.status(404).json({ error: 'Invitación no válida o ya usada' });
  const s = await ensureUserId();
  f.friendId    = req.body.userId   || '';
  f.friendName  = req.body.name     || 'Amigo';
  f.friendEmoji = req.body.emoji    || '👤';
  f.friendUrl   = req.body.url      || '';
  f.status      = 'accepted';
  f.inviteToken = '';  // consume token
  await f.save();
  // Return our identity + pushToken so the initiating instance can be configured
  res.json({
    ok: true,
    pushToken: f.pushToken,
    myUserId:  s.userId,
    myName:    s.displayName,
    myEmoji:   s.avatarEmoji,
    myUrl:     `${req.protocol}://${req.get('host')}`,
  });
}));

// Create a local friend record after accepting a cross-instance invite
// (the accepting side calls this to record the other party on their own server)
app.post('/api/friends/from-accept', w(async (req, res) => {
  const { friendId, friendName, friendEmoji, friendUrl, pushToken } = req.body;
  // Idempotent: don't create duplicates for the same remote userId
  if (friendId) {
    const existing = await Friend.findOne({ friendId });
    if (existing) { existing.status = 'accepted'; await existing.save(); return res.json(existing); }
  }
  const f = await Friend.create({
    friendId:    friendId    || '',
    friendName:  friendName  || 'Amigo',
    friendEmoji: friendEmoji || '👤',
    friendUrl:   friendUrl   || '',
    pushToken:   pushToken   || '',
    status:      'accepted',
  });
  res.json(f);
}));

// Update per-friend settings (sharing toggles, mute, friendUrl)
app.patch('/api/friends/:id', w(async (req, res) => {
  const allowed = ['friendName','friendEmoji','friendUrl','shareStudying','shareProgress','shareExamUpcoming','mutePresence','mutePokes'];
  const data = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  res.json(await Friend.findByIdAndUpdate(req.params.id, data, { new: true }));
}));

// Remove friend
app.delete('/api/friends/:id', w(async (req, res) => {
  await Friend.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// Block friend (silently — no notification sent)
app.post('/api/friends/:id/block', w(async (req, res) => {
  res.json(await Friend.findByIdAndUpdate(req.params.id, { status: 'blocked' }, { new: true }));
}));

// Send a poke to a friend (rate-limited: 1/hr, excess silently dropped)
app.post('/api/friends/:id/poke', w(async (req, res) => {
  const f = await Friend.findById(req.params.id);
  if (!f || f.status !== 'accepted') return res.json({ ok: true });
  if (throttled(pokeSent, String(f._id), POKE_MS)) return res.json({ ok: true });

  const s = await ensureUserId();
  const { kind = 'emoji', content = '👋' } = req.body;

  if (f.friendUrl) {
    fetch(`${f.friendUrl}/api/friends/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken: f.pushToken, type: 'poke.sent', payload: { kind, content, fromName: s.displayName, fromEmoji: s.avatarEmoji } }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  }

  // Local confirmation to sender
  wsBroadcast({ type: 'poke.confirmed', friendId: String(f._id), friendName: f.friendName, friendEmoji: f.friendEmoji });
  res.json({ ok: true });
}));

// Broadcast local presence event to all friends that have sharing enabled
// Called by the frontend when the user takes an action
app.post('/api/friends/broadcast', w(async (req, res) => {
  const { type, payload = {} } = req.body;
  if (!VALID_EVENTS.has(type) || type === 'poke.sent') return res.json({ ok: true });

  const friends = await Friend.find({ status: 'accepted' });
  const s = await ensureUserId();

  for (const f of friends) {
    if (type === 'friend.studying'  && !f.shareStudying)     continue;
    if (type === 'progress.updated' && !f.shareProgress)     continue;
    if (type === 'exam.upcoming'    && !f.shareExamUpcoming) continue;

    const key = `out:${type}:${f._id}`;
    if (throttled(presenceSent, key, PRESENCE_MS)) continue;

    if (f.friendUrl) {
      fetch(`${f.friendUrl}/api/friends/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushToken: f.pushToken, type, payload: { ...payload, fromName: s.displayName, fromEmoji: s.avatarEmoji } }),
        signal: AbortSignal.timeout(3000),
      }).catch(() => {});
    }
  }

  res.json({ ok: true });
}));

// Receive a presence event from a remote friend instance
app.post('/api/friends/presence', w(async (req, res) => {
  const { pushToken, type, payload = {} } = req.body;
  if (!pushToken || !VALID_EVENTS.has(type)) return res.json({ ok: true });

  const f = await Friend.findOne({ pushToken, status: 'accepted' });
  if (!f) return res.json({ ok: true });

  if (type === 'poke.sent' && f.mutePokes)    return res.json({ ok: true });
  if (type !== 'poke.sent' && f.mutePresence) return res.json({ ok: true });

  const mapKey = `in:${type}:${f._id}`;
  const interval = type === 'poke.sent' ? POKE_MS : PRESENCE_MS;
  if (throttled(presenceRecv, mapKey, interval)) return res.json({ ok: true });

  wsBroadcast({ type, friendId: String(f._id), friendName: f.friendName, friendEmoji: f.friendEmoji, payload });
  res.json({ ok: true });
}));

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
