// Test funcional: arranca el server con mocks de Mongo + servicios externos,
// y verifica que todos los endpoints nuevos respondan correctamente.

process.env.PORT = '3456';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cursos_studio_test';
process.env.OPENAI_API_KEY = 'sk-test-fake';
process.env.ANTHROPIC_API_KEY = 'sk-ant-fake';
process.env.SPOTIFY_CLIENT_ID = 'fake-id';
process.env.SPOTIFY_CLIENT_SECRET = 'fake-secret';

const Module = require('module');
const origResolve = Module._resolveFilename;
const origRequire = Module.prototype.require;

// In-memory store
const store = {
  Course: new Map(), Module: new Map(), Note: new Map(), Sticker: new Map(),
  Exam: new Map(), ExternalCourse: new Map(), Settings: new Map(),
};
let nextId = 1;
const newId = () => 'id_' + (nextId++);

function makeQuery(filter, list) {
  let arr = [...list];
  if (filter && filter._id?.$in) arr = arr.filter(d => filter._id.$in.includes(d._id));
  if (filter && filter.courseId?.$in) arr = arr.filter(d => filter.courseId.$in.includes(d.courseId));
  if (filter) {
    for (const k of Object.keys(filter)) {
      if (k === '_id' || k === 'courseId') continue;
      arr = arr.filter(d => d[k] === filter[k]);
    }
    if (filter.courseId && !filter.courseId.$in) arr = arr.filter(d => String(d.courseId) === String(filter.courseId));
    if (filter._id && !filter._id.$in) arr = arr.filter(d => String(d._id) === String(filter._id));
  }
  const q = { _arr: arr };
  q.sort = (s) => q;
  q.lean = () => Promise.resolve(arr);
  q.then = (cb) => cb(arr);
  return q;
}

function model(name) {
  const list = store[name];
  if (!list) throw new Error('Unknown model ' + name);
  return {
    find(filter = {}) { return makeQuery(filter, [...list.values()]); },
    findOne(filter = {}) {
      const q = makeQuery(filter, [...list.values()]);
      const result = q._arr[0] || null;
      return Object.assign(Promise.resolve(result), {
        lean: () => Promise.resolve(result),
        then: (cb) => Promise.resolve(result).then(cb),
      });
    },
    findById(id) {
      const result = list.get(String(id)) || null;
      const enriched = result && {
        ...result,
        save: async () => { list.set(String(result._id), result); return result; },
      };
      return Object.assign(Promise.resolve(enriched), {
        lean: () => Promise.resolve(enriched),
        then: (cb) => Promise.resolve(enriched).then(cb),
      });
    },
    async create(data) {
      const id = data._id || newId();
      const doc = { ...data, _id: id, createdAt: new Date(), updatedAt: new Date() };
      doc.save = async () => { list.set(String(id), doc); return doc; };
      list.set(String(id), doc);
      return doc;
    },
    async insertMany(docs) {
      const out = [];
      for (const d of docs) out.push(await this.create(d));
      return out;
    },
    async findByIdAndUpdate(id, update, opts = {}) {
      let doc = list.get(String(id));
      if (!doc && opts.upsert) doc = { _id: id, createdAt: new Date() };
      if (!doc) return null;
      const u = update.$inc ? null : update;
      if (update.$inc) {
        for (const k of Object.keys(update.$inc)) doc[k] = (doc[k] || 0) + update.$inc[k];
      } else if (u) {
        Object.assign(doc, u);
      }
      doc.updatedAt = new Date();
      doc.save = async () => doc;
      list.set(String(id), doc);
      return doc;
    },
    async findOneAndUpdate(filter, update, opts = {}) {
      let doc = [...list.values()].find(d => Object.keys(filter).every(k => String(d[k]) === String(filter[k])));
      if (!doc && opts.upsert) {
        const id = newId();
        doc = { _id: id, ...filter, createdAt: new Date() };
      }
      if (!doc) return null;
      Object.assign(doc, update);
      doc.save = async () => doc;
      list.set(String(doc._id), doc);
      return doc;
    },
    async findByIdAndDelete(id) { return list.delete(String(id)); },
    async deleteMany(filter = {}) {
      let removed = 0;
      const keep = new Map();
      for (const [k, d] of list.entries()) {
        const match = Object.keys(filter).every(key => {
          if (key === 'courseId') return String(d.courseId) === String(filter.courseId);
          return d[key] === filter[key];
        });
        if (match) removed++;
        else keep.set(k, d);
      }
      list.clear();
      for (const [k, v] of keep.entries()) list.set(k, v);
      return { deletedCount: removed };
    },
    async aggregate(pipeline) {
      // Mock simple para módulos por curso
      const docs = [...list.values()];
      const matchStage = pipeline.find(s => s.$match);
      let arr = docs;
      if (matchStage?.$match?.courseId?.$in) {
        arr = arr.filter(d => matchStage.$match.courseId.$in.some(id => String(id) === String(d.courseId)));
      }
      const grpStage = pipeline.find(s => s.$group);
      if (!grpStage) return arr;
      const groups = new Map();
      for (const d of arr) {
        const key = String(d.courseId);
        if (!groups.has(key)) groups.set(key, { _id: d.courseId, total: 0, done: 0 });
        const g = groups.get(key);
        g.total += 1;
        if (d.done) g.done += 1;
      }
      return [...groups.values()];
    },
  };
}

// Mockear mongoose
require.cache[require.resolve('mongoose')] = {
  exports: {
    connect: async () => true,
    Schema: class { constructor() {} },
    Types: { ObjectId: String },
    model: (name) => model(name),
    models: {},
  },
  loaded: true,
  id: 'mongoose-mock',
};
// Pero antes inyectamos schemas en el model() para que models.js exporte algo
// Cargamos models con un mongoose mock más completo
const fakeMongoose = {
  connect: async () => true,
  Schema: function(def, opts) { this._def = def; this._opts = opts; },
  model: (name) => model(name),
  models: {},
  Types: { ObjectId: String },
};
fakeMongoose.Schema.Types = { ObjectId: String, Mixed: 'Mixed' };
require.cache[require.resolve('mongoose')] = { exports: fakeMongoose, loaded: true, id: 'mg' };

// Mock de yt-dlp y Spotify y AI: evitamos llamadas reales
const fakeYtdlp = {
  isAvailable: async () => true,
  fetchPlaylist: async () => [
    { id: 'a1', title: 'Video 1', url: 'https://yt/a1', duration: 600 },
    { id: 'a2', title: 'Video 2', url: 'https://yt/a2', duration: 700 },
    { id: 'a3', title: 'Video 3', url: 'https://yt/a3', duration: 800 },
    { id: 'a4', title: 'Video 4', url: 'https://yt/a4', duration: 900 },
  ],
};
const fakeSpotify = {
  isConfigured: () => true,
  parseSpotifyUrl: () => ({ kind: 'show', id: 'sho1' }),
  fetchItems: async () => [
    { id: 's1', title: 'Episodio 1', url: 'https://spo/s1', duration: 1800 },
    { id: 's2', title: 'Episodio 2', url: 'https://spo/s2', duration: 1900 },
  ],
};
const fakeEmbed = {
  checkEmbed: async (url) => ({
    canEmbed: !url.includes('blocked'),
    domain: new URL(url).hostname,
    favicon: 'https://favicon/' + new URL(url).hostname,
    title: 'Sitio mock',
  }),
};
const fakeObsidian = {
  writeNote: async ({ filename }) => ({ path: '/fake/' + filename + '.md', relative: filename + '.md' }),
  isAbsoluteSafe: () => true,
};
const fakeAI = {
  generateExam: async () => '# Examen mock\n\n## Pregunta 1\n¿Qué es UX?\n\n[A] diseño\n[B] usuarios\n\n---\n\n## Clave\n1. B',
  isConfigured: () => true,
  maskedKey: () => '•••test',
};

// Inyectar mocks
const path = require('path');
require.cache[path.resolve('server/services/ytdlp.js')] = { exports: fakeYtdlp, loaded: true, id: 'yt' };
require.cache[path.resolve('server/services/spotify.js')] = { exports: fakeSpotify, loaded: true, id: 'sp' };
require.cache[path.resolve('server/services/embedCheck.js')] = { exports: fakeEmbed, loaded: true, id: 'emb' };
require.cache[path.resolve('server/services/obsidian.js')] = { exports: fakeObsidian, loaded: true, id: 'obs' };
require.cache[path.resolve('server/services/ai.js')] = { exports: fakeAI, loaded: true, id: 'ai' };

// Arrancar servidor
require('./server/index.js');

// Esperar al servidor
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

const BASE = 'http://localhost:3456';
async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

let pass = 0, fail = 0;
function ok(label, cond, info) {
  if (cond) { pass++; console.log('  ✓', label); }
  else { fail++; console.log('  ✗', label, info ? '— ' + JSON.stringify(info).slice(0, 200) : ''); }
}

(async () => {
  await wait(500);
  console.log('\n══ TEST FUNCIONAL CURSOS STUDIO V2 ══\n');

  // 1. Health
  let r = await req('GET', '/api/health');
  ok('GET /api/health', r.status === 200 && r.body.ytdlp === true && r.body.spotify === true);
  ok('  ai.openai detectado', r.body.ai.openai === true);
  ok('  ai.anthropic detectado', r.body.ai.anthropic === true);

  // 2. Settings
  r = await req('GET', '/api/settings');
  ok('GET /api/settings', r.status === 200);

  r = await req('PUT', '/api/settings', { obsidianVaultPath: '/home/me/Obsidian', obsidianAutoSave: true, aiProvider: 'anthropic' });
  ok('PUT /api/settings', r.status === 200 && r.body.obsidianVaultPath === '/home/me/Obsidian');

  // 3. Crear curso
  r = await req('POST', '/api/courses', { title: 'Test Course', emoji: '🎯', color: '#c8622a' });
  const courseId = r.body._id;
  ok('POST /api/courses', r.status === 200 && courseId);

  // 4. Listar cursos
  r = await req('GET', '/api/courses');
  ok('GET /api/courses', r.status === 200 && Array.isArray(r.body) && r.body.length >= 1);

  // 5. Crear módulo de texto
  r = await req('POST', `/api/courses/${courseId}/modules`, {
    title: 'Bienvenida', type: 'text', textContent: '# Hola', week: 0, dayOfWeek: 0,
  });
  ok('POST module type=text', r.status === 200 && r.body.type === 'text');

  // 6. Crear módulo web (que pasa el check)
  r = await req('POST', `/api/courses/${courseId}/modules`, {
    title: 'Sitio OK', type: 'web', url: 'https://example.com', week: 0, dayOfWeek: 1,
  });
  ok('POST module type=web (embebible)', r.status === 200 && r.body.type === 'web');

  // 7. Crear módulo web bloqueado → debe convertirse en web-link
  r = await req('POST', `/api/courses/${courseId}/modules`, {
    title: 'Sitio Bloqueado', type: 'web', url: 'https://blocked.example.com', week: 0, dayOfWeek: 2,
  });
  ok('POST web → fallback a web-link', r.status === 200 && r.body.type === 'web-link', r.body);
  ok('  web-link tiene favicon', !!r.body.favicon);
  ok('  web-link tiene domain', !!r.body.domain);

  // 8. Embed check directo
  r = await req('POST', '/api/embed-check', { url: 'https://example.com' });
  ok('POST /api/embed-check OK', r.status === 200 && r.body.canEmbed === true);
  r = await req('POST', '/api/embed-check', { url: 'https://blocked.example.com' });
  ok('POST /api/embed-check bloqueado', r.status === 200 && r.body.canEmbed === false);

  // 9. Crear módulo ai-exam
  r = await req('POST', `/api/courses/${courseId}/modules`, {
    title: 'Examen 1', type: 'ai-exam', week: 1, dayOfWeek: 4,
    examConfig: { prompt: 'Conceptos de UX', questionCount: 5, timeLimit: 20, provider: 'anthropic', locked: true },
  });
  const examModId = r.body._id;
  ok('POST module type=ai-exam', r.status === 200 && r.body.type === 'ai-exam');

  // 10. Generar examen
  r = await req('POST', `/api/modules/${examModId}/exam/generate`);
  ok('POST exam/generate (Anthropic mock)', r.status === 200 && r.body.examId);

  // 11. Get exam — debe estar locked porque la fecha es futura
  r = await req('GET', `/api/modules/${examModId}/exam`);
  ok('GET exam (locked)', r.status === 200 && r.body.exam.visible === false);

  // 12. Force = ver
  r = await req('GET', `/api/modules/${examModId}/exam?force=1`);
  ok('GET exam force=1 (visible)', r.status === 200 && r.body.exam.visible === true && r.body.exam.content.includes('Examen mock'));

  // 13. Unlock + grade
  r = await req('POST', `/api/modules/${examModId}/exam/unlock`);
  ok('POST exam/unlock', r.status === 200);

  r = await req('POST', `/api/modules/${examModId}/exam/grade`, { score: 85, total: 100, notes: 'OK' });
  ok('POST exam/grade', r.status === 200 && r.body.exam.score === 85);

  // 14. Verificar gradebook
  r = await req('GET', `/api/courses/${courseId}/grades`);
  ok('GET grades', r.status === 200 && r.body.length === 1 && r.body[0].score === 85);

  // 15. Bulk multi-day
  r = await req('POST', `/api/courses/${courseId}/modules/bulk`, {
    type: 'youtube', url: 'https://youtube.com/playlist?list=PLfake',
    daysOfWeek: [0, 3], incrementalWeeks: true, startWeek: 2, fetchReal: true, limit: 4,
  });
  ok('POST bulk multi-day', r.status === 200 && r.body.length === 4);
  // Verificar distribución: items 0,1 → wk2; items 2,3 → wk3
  ok('  bulk distribución correcta',
    r.body[0].week === 2 && r.body[0].dayOfWeek === 0 &&
    r.body[1].week === 2 && r.body[1].dayOfWeek === 3 &&
    r.body[2].week === 3 && r.body[2].dayOfWeek === 0 &&
    r.body[3].week === 3 && r.body[3].dayOfWeek === 3,
    r.body.map(m => `wk${m.week}d${m.dayOfWeek}`));

  // 16. Bulk Spotify
  r = await req('POST', `/api/courses/${courseId}/modules/bulk`, {
    type: 'spotify', url: 'https://open.spotify.com/show/sho1',
    daysOfWeek: [1, 4], incrementalWeeks: true, startWeek: 5, fetchReal: true,
  });
  ok('POST bulk Spotify show', r.status === 200 && r.body.length === 2);

  // 17. Listar módulos
  r = await req('GET', `/api/courses/${courseId}/modules`);
  ok('GET modules listado', r.status === 200 && r.body.length >= 9);

  // 18. Duplicar módulo
  const firstMod = r.body[0];
  r = await req('POST', `/api/modules/${firstMod._id}/duplicate`, { week: 5, dayOfWeek: 6 });
  ok('POST duplicate', r.status === 200 && r.body.week === 5 && r.body.dayOfWeek === 6);

  // 19. Notes con auto-save a Obsidian
  r = await req('PUT', `/api/modules/${firstMod._id}/note`, { content: '# Test note' });
  ok('PUT note + obsidian auto-save', r.status === 200 && r.body.obsidianPath);

  // 20. Forzar guardado obsidian
  r = await req('POST', `/api/modules/${firstMod._id}/note/save-obsidian`);
  ok('POST note/save-obsidian', r.status === 200 && r.body.relative);

  // 21. External course
  r = await req('POST', '/api/external-courses', {
    title: 'Cálculo I', url: 'https://classroom.google.com', emoji: '📐',
    daysOfWeek: [0, 2, 4], timeOfDay: '09:00',
  });
  const extId = r.body._id;
  ok('POST external-course', r.status === 200 && extId);

  r = await req('GET', '/api/external-courses');
  ok('GET externals', r.status === 200 && r.body.length === 1);

  // 22. Calendario global
  r = await req('GET', '/api/calendar/global');
  ok('GET calendar/global', r.status === 200 && r.body.courses && r.body.modules && r.body.externals);

  // 23. Update course
  r = await req('PATCH', `/api/courses/${courseId}`, { description: 'Updated' });
  ok('PATCH course', r.status === 200 && r.body.description === 'Updated');

  // 24. Delete external
  r = await req('DELETE', `/api/external-courses/${extId}`);
  ok('DELETE external', r.status === 200);

  // 25. Stickers
  r = await req('POST', `/api/courses/${courseId}/stickers`, { kind: 'emoji', content: '⭐', x: 10, y: 20, category: 'candelabro' });
  ok('POST sticker candelabro', r.status === 200 && r.body.category === 'candelabro');

  // Resumen
  console.log(`\n══ Resultado: ${pass} ✓  ${fail} ✗ ══`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(err => { console.error('💥', err); process.exit(2); });
