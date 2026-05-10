// ── Estado global ────────────────────────────────
const State = {
  courses:      [],
  externals:    [],
  cur:          null,   // curso actual
  curModules:   [],
  curStickers:  [],
  curGrades:    [],
  view:         'cal',  // 'cal' | 'mod' | 'grades' | 'syllabus'
  weekOff:      0,
  globalWeekOff: 0,
  settings:     {},
  capabilities: {},
};

// ── Constantes ───────────────────────────────────
const COLORS = ['#c8622a','#4a7c59','#5b4a8a','#b84f7a','#d4a017','#2a6e8a','#7a4a2a','#3a6a7a','#2a7a6a'];
const TXTCOLS = ['#c8622a','#4a7c59','#5b4a8a','#b84f7a','#2a6e8a','#d4a017','#1a1a1a','#7a4a2a'];
const BG_PRESETS = [
  { l: 'Papel',     v: '#f5f0e8' },
  { l: 'Pergamino', v: '#f2e8d0' },
  { l: 'Menta',     v: '#e5f5ef' },
  { l: 'Lavanda',   v: '#ede5f5' },
  { l: 'Melocotón', v: '#f5ebe5' },
  { l: 'Cielo',     v: '#e5eef5' },
  { l: 'Crema',     v: '#faf6ed' },
  { l: 'Salvia',    v: '#dfe7d8' },
  { l: 'Noche',     v: '#1a1a2e' },
  { l: 'Pizarra',   v: '#2d3748' },
  { l: 'Bosque',    v: '#1a2e1a' },
  { l: 'Tinta',     v: '#0d1117' },
];
const EMOJIS = ['🌟','🎯','🔥','💡','📚','🎨','🧠','🚀','🌈','⭐','🎵','🎸','🌺','🦋','🌙','⚡','🍀','🎭','🦄','🐉','🌊','🏔','🎪','🎩','🧩','🎲','🌸','🍕','🎮','💫','🎀','🌻','🐱','🦊','🐧','🦜','🌴','☕','🍰','🎻','✨','💖','🔔','🍎','🌹','🎂','🪄','🦉'];
const DAYS_SHORT = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DAYS_FULL  = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

// ── Toast ────────────────────────────────────────
let toastT;
function toast(msg, dur = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), dur);
}

// ── Modal helper ─────────────────────────────────
function showModal(title, bodyHTML, onSave, opts = {}) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="overlay fade-in" id="active-overlay">
      <div class="modal${opts.wide ? ' wide' : ''}">
        <h2>${escapeHTML(title)}</h2>
        <div id="modal-body">${bodyHTML}</div>
        <div class="form-foot">
          ${opts.extraButtons || ''}
          <button class="btn btn-outline" id="modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="modal-save">${opts.saveText || 'Guardar'}</button>
        </div>
      </div>
    </div>`;

  const overlay = document.getElementById('active-overlay');
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', async () => {
    try {
      const r = await onSave();
      if (r !== false) closeModal();
    } catch (err) {
      toast('❌ ' + err.message);
    }
  });
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

// ── DOM helpers ──────────────────────────────────
function $(id)        { return document.getElementById(id); }
function $val(id)     { const el = $(id); return el ? el.value : ''; }
function $checked(id) { const el = $(id); return el ? el.checked : false; }

function escapeHTML(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtTime(s) {
  s = Math.floor(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = n => n < 10 ? '0' + n : '' + n;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function typeIcon(t) {
  return { youtube: '▶️', spotify: '🎵', web: '🌐', 'web-link': '🔗', text: '📄', 'ai-exam': '🧠' }[t] || '📄';
}
function typeColor(t, courseColor) {
  return {
    youtube: courseColor || '#c8622a',
    spotify: '#1DB954',
    web:     '#4a7c59',
    'web-link': '#2a6e8a',
    text:    '#5b4a8a',
    'ai-exam': '#b84f7a',
  }[t] || '#888';
}

// ── Markdown parser ──────────────────────────────
function mdParse(t) {
  if (!t) return '';
  let html = escapeHTML(t);
  html = html.replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c}</code></pre>`);
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
  html = html.replace(/^(?!<[hupbocl])(.+)$/gm, '<p>$1</p>');
  html = html.replace(/<p>\s*<\/p>/g, '');
  return html;
}

// ── Swatches ─────────────────────────────────────
function buildSwatches(containerId, colors, initial, onChange) {
  let sel = initial;
  const el = $(containerId);
  if (!el) return () => sel;
  el.innerHTML = '';
  colors.forEach(c => {
    const s = document.createElement('div');
    s.className = 'swatch' + (c === sel ? ' on' : '');
    s.style.background = c;
    s.addEventListener('click', () => {
      sel = c;
      el.querySelectorAll('.swatch').forEach(x => x.classList.remove('on'));
      s.classList.add('on');
      onChange?.(c);
    });
    el.appendChild(s);
  });
  return () => sel;
}

// ── Day picker (multi-select pills) ─────────────
function buildDayPicker(containerId, selectedDays = []) {
  const el = $(containerId);
  if (!el) return () => [];
  const selected = new Set(selectedDays.map(Number));
  el.innerHTML = DAYS_SHORT.map((d, i) =>
    `<button type="button" class="day-pill${selected.has(i) ? ' on' : ''}" data-day="${i}">${d}</button>`
  ).join('');
  el.querySelectorAll('.day-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = parseInt(btn.dataset.day);
      if (selected.has(day)) selected.delete(day);
      else selected.add(day);
      btn.classList.toggle('on', selected.has(day));
    });
  });
  return () => [...selected].sort((a, b) => a - b);
}

// ── Week / date helpers ──────────────────────────
function getWeekStart(off = 0) {
  const now = new Date();
  const dow = now.getDay();
  const diff = (dow === 0 ? -6 : 1) - dow;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff + off * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function dayDate(weekStart, dayIndex) {
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + dayIndex);
  return d;
}

function calcCourseWeek(courseStartDate, weekStartDate) {
  const cs = new Date(courseStartDate);
  cs.setHours(0, 0, 0, 0);
  const csDow = cs.getDay();
  const csDiff = (csDow === 0 ? -6 : 1) - csDow;
  const csMon = new Date(cs);
  csMon.setDate(cs.getDate() + csDiff);
  const diffMs = weekStartDate - csMon;
  return Math.round(diffMs / (7 * 86400000));
}

// ── Day status (computed from module done states) ─
function dayStatus(day, mods, today) {
  if (!mods.length) return 'empty';
  if (day.getTime() > today.getTime()) return 'future';
  const done = mods.filter(m => m.done).length;
  if (done === mods.length) return 'complete';
  if (done > 0) return 'partial';
  return 'missed';
}

function statusEmoji(s) {
  return { complete: '✓', partial: '◑', missed: '✗', future: '', empty: '' }[s] || '';
}

// ── Dark-mode auto-toggle ─────────────────────────
function applyDarkModeForBg(colorHex) {
  const main = document.getElementById('main');
  if (!main) return;
  if (!colorHex) { main.classList.remove('dark-bg'); return; }
  const hex = colorHex.replace('#', '');
  if (hex.length < 6) { main.classList.remove('dark-bg'); return; }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  main.classList.toggle('dark-bg', lum < 0.5);
}
