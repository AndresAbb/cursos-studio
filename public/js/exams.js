// ── Exam prompt templates ──────────────────────────────────────────────────
// Loaded asynchronously from /templates/exam_templates.json via Exams.init().
// Placeholders: {courseTitle} {moduleList} {examsheetContent} {questionCount} {timeLimit} {fmtRule}
let _FMT_RULE = '';
let EXAM_TEMPLATES = {};


// ── Label maps ──────────────────────────────────────────────────────────────
const EXAM_TYPE_LABELS = {
  'multiple-choice': '📋 Opción múltiple',
  'essay':           '✍️ Ensayo',
  'project':         '🛠 Proyecto',
  'mixed':           '🔀 Mixto',
  'case-study':      '📂 Caso práctico',
  'oral':            '🎙 Oral / entrevista',
};

const DIFFICULTY_LABELS = {
  introductory: '🌱 Introductorio (Bloom 1-2: Recordar / Comprender)',
  intermediate: '📈 Intermedio (Bloom 3-4: Aplicar / Analizar)',
  advanced:     '🔬 Avanzado (Bloom 5: Evaluar)',
  expert:       '🚀 Experto (Bloom 6: Crear)',
};

// ── Helper: build type + difficulty rows ─────────────────────────────────────
function _examTypeRows(cfg = {}) {
  const typeOpts = Object.entries(EXAM_TYPE_LABELS)
    .map(([v, l]) => `<option value="${v}" ${cfg.examType === v ? 'selected' : ''}>${l}</option>`)
    .join('');
  const diffOpts = Object.entries(DIFFICULTY_LABELS)
    .map(([v, l]) => `<option value="${v}" ${cfg.difficulty === v ? 'selected' : ''}>${l}</option>`)
    .join('');
  return `
    <div class="row-2">
      <div class="fg">
        <label>Tipo de examen</label>
        <select id="ex-type">${typeOpts}</select>
      </div>
      <div class="fg">
        <label>Dificultad</label>
        <select id="ex-diff">${diffOpts}</select>
      </div>
    </div>`;
}

// ── Main Exams object ────────────────────────────────────────────────────────
const Exams = {
  // ── Form HTML for creating a new exam module ──
  newFormHTML() {
    const cap  = State.capabilities?.ai || {};
    const prov = State.settings?.aiProvider || 'manual';
    return `
      <div class="fg">
        <label>Prompt / tema del examen</label>
        <textarea id="ex-prompt" class="code" rows="5" placeholder="Selecciona tipo y dificultad, luego usa los botones para generar el prompt, o escríbelo manualmente."></textarea>
        <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-week">⚡ Semana actual</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-month">📅 Este mes</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-all">📚 Curso completo</button>
        </div>
      </div>
      ${_examTypeRows({ examType: 'mixed', difficulty: 'intermediate' })}
      <div class="row-2">
        <div class="fg"><label># preguntas</label><input type="number" id="ex-qcount" value="10" min="1" max="50"></div>
        <div class="fg"><label>Tiempo (min)</label><input type="number" id="ex-time" value="30" min="5" max="240"></div>
      </div>
      <div class="row-2">
        <div class="fg">
          <label>Proveedor IA</label>
          <select id="ex-prov">
            <option value="manual" ${prov==='manual'?'selected':''}>Manual (yo lo pego)</option>
            <option value="openai" ${prov==='openai'?'selected':''} ${!cap.openai?'disabled':''}>OpenAI ${!cap.openai?'(no configurado)':'✓'}</option>
            <option value="anthropic" ${prov==='anthropic'?'selected':''} ${!cap.anthropic?'disabled':''}>Anthropic Claude ${!cap.anthropic?'(no configurado)':'✓'}</option>
          </select>
        </div>
        <div class="fg"><label>Modelo (opcional)</label><input id="ex-model" placeholder="ej. gpt-4o-mini, claude-haiku-4-5"></div>
      </div>
      <p class="hint">El examen queda <strong>bloqueado</strong> hasta la fecha del módulo.</p>`;
  },

  wirePromptGenButtons(weekNum) {
    const week = weekNum !== undefined ? weekNum : 0;
    const fillPrompt = async (scope) => {
      if (!State.cur) return;
      try {
        toast('⏳ Generando prompt…', 3000);
        const { prompt } = await API.getExamPrompt(State.cur._id, scope, week);
        // For week scope, pass the week number so we inject the right examsheet.
        // For month/all, pass null so all examsheets are concatenated.
        this.applyPromptTemplate(prompt, scope === 'week' ? week : null);
        toast('✅ Prompt generado');
      } catch (err) { toast('❌ ' + err.message); }
    };
    $('ex-gen-week')?.addEventListener('click',  () => fillPrompt('week'));
    $('ex-gen-month')?.addEventListener('click', () => fillPrompt('month'));
    $('ex-gen-all')?.addEventListener('click',   () => fillPrompt('all'));
  },

  // Returns the examsheet text to inject for a given week number.
  // weekNum === null/undefined → concatenate all non-empty examsheets.
  _examsheetForWeek(weekNum) {
    const labels = State.cur?.syllabusLabels || [];
    if (!labels.length) return '';
    let sheets;
    if (weekNum === null || weekNum === undefined) {
      sheets = labels.filter(l => l.examsheetContent?.trim());
    } else {
      const w = Number(weekNum);
      const match = labels.find(l => w >= l.startWeek && w <= l.endWeek);
      sheets = match && match.examsheetContent?.trim() ? [match] : [];
    }
    if (!sheets.length) return '';
    return sheets
      .map(l => {
        const header = l.title ? `Hoja de examen — ${l.title}:\n` : 'Hoja de examen:\n';
        return header + l.examsheetContent.trim();
      })
      .join('\n\n');
  },

  // Combines the fetched course content with the selected type+difficulty template.
  // weekNum: pass a number for week-scope prompts, null/undefined for all-course.
  applyPromptTemplate(moduleList, weekNum) {
    const el = $('ex-prompt');
    if (!el) return;
    const type       = $val('ex-type') || 'mixed';
    const difficulty = $val('ex-diff') || 'intermediate';
    const qcount     = $val('ex-qcount') || '10';
    const time       = $val('ex-time') || '30';
    const title      = State.cur?.title || 'este curso';

    const tmpl = (EXAM_TEMPLATES[type] || {})[difficulty];
    if (!tmpl) { el.value = moduleList; return; }

    const examsheetRaw = this._examsheetForWeek(weekNum);
    const examsheetBlock = examsheetRaw
      ? `Contenido de referencia de la sección:\n${examsheetRaw}\n`
      : '';

    el.value = tmpl
      .replace(/\{courseTitle\}/g, title)
      .replace(/\{moduleList\}/g,  moduleList)
      .replace(/\{examsheetContent\}/g, examsheetBlock)
      .replace(/\{questionCount\}/g, qcount)
      .replace(/\{timeLimit\}/g,    time)
      .replace(/\{fmtRule\}/g,      _FMT_RULE);
    el.dispatchEvent(new Event('input'));
  },

  readNewForm() {
    return {
      prompt:        $val('ex-prompt'),
      examType:      $val('ex-type')   || 'mixed',
      difficulty:    $val('ex-diff')   || 'intermediate',
      questionCount: parseInt($val('ex-qcount')) || 10,
      timeLimit:     parseInt($val('ex-time'))   || 30,
      provider:      $val('ex-prov'),
      model:         $val('ex-model'),
      preGenerated:  false,
      locked:        true,
    };
  },

  // ── Form HTML for editing an existing exam module ──
  editFormHTML(m) {
    const cfg = m.examConfig || {};
    const cap = State.capabilities?.ai || {};
    return `
      <div class="fg">
        <label>Prompt</label>
        <textarea id="ex-prompt" class="code" rows="5">${escapeHTML(cfg.prompt || '')}</textarea>
        <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-week">⚡ Semana actual</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-month">📅 Este mes</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-all">📚 Curso completo</button>
        </div>
      </div>
      ${_examTypeRows(cfg)}
      <div class="row-2">
        <div class="fg"><label># preguntas</label><input type="number" id="ex-qcount" value="${cfg.questionCount||10}" min="1" max="50"></div>
        <div class="fg"><label>Tiempo (min)</label><input type="number" id="ex-time" value="${cfg.timeLimit||30}" min="5" max="240"></div>
      </div>
      <div class="row-2">
        <div class="fg">
          <label>Proveedor IA</label>
          <select id="ex-prov">
            <option value="manual" ${cfg.provider==='manual'?'selected':''}>Manual</option>
            <option value="openai" ${cfg.provider==='openai'?'selected':''} ${!cap.openai?'disabled':''}>OpenAI ${!cap.openai?'(no config)':'✓'}</option>
            <option value="anthropic" ${cfg.provider==='anthropic'?'selected':''} ${!cap.anthropic?'disabled':''}>Anthropic ${!cap.anthropic?'(no config)':'✓'}</option>
          </select>
        </div>
        <div class="fg"><label>Modelo</label><input id="ex-model" value="${cfg.model||''}"></div>
      </div>
      <p class="hint">Si cambias el prompt y guardas, el examen anterior queda inválido. Genera de nuevo.</p>`;
  },

  readEditForm() { return this.readNewForm(); },

  // Lift #modal-root above the player overlay so exam modals
  // (autograding, paste, final-exam) are visible & interactive.
  // Restores prior z-index when the modal is closed.
  _lift() {
    const root = document.getElementById('modal-root');
    if (!root) return;
    const prevZ        = root.style.zIndex;
    const prevPos      = root.style.position;
    const prevPointer  = root.style.pointerEvents;
    root.style.position     = 'fixed';
    root.style.inset        = '0';
    root.style.zIndex       = '999999';
    root.style.pointerEvents = 'auto';

    // Watch for the modal element being removed → restore.
    const observer = new MutationObserver(() => {
      if (!root.firstElementChild) {
        root.style.zIndex       = prevZ;
        root.style.position     = prevPos;
        root.style.pointerEvents = prevPointer;
        root.style.removeProperty('inset');
        observer.disconnect();
      }
    });
    observer.observe(root, { childList: true });
  },

  // ── Final exam synthesis modal ─────────────────
  showFinalExamModal() {
    if (!State.cur) return;
    showModal('🏁 Examen Final', `
      <p class="hint" style="margin-bottom:12px">El prompt se construye automáticamente a partir de todos los módulos, secciones del sílabo y exámenes previos.</p>
      <div class="fg"><label>Prompt generado</label><textarea id="final-prompt" class="code" rows="10" placeholder="Cargando…"></textarea></div>
      <p class="hint">Copia este prompt y pégalo en tu IA favorita, luego importa el resultado como módulo Examen IA.</p>
    `, async () => {
      const prompt = $val('final-prompt');
      if (!prompt.trim()) { toast('El prompt está vacío'); return false; }
      await navigator.clipboard?.writeText(prompt);
      toast('📋 Prompt copiado al portapapeles');
    }, { saveText: '📋 Copiar prompt', wide: true });
    this._lift();

    API.getFinalExamPrompt(State.cur._id).then(({ prompt }) => {
      const el = $('final-prompt');
      if (el) el.value = prompt;
    }).catch(err => toast('❌ ' + err.message));
  },

  // ── Render exam in player ──────────────────────
  async openInPlayer(module, embedEl) {
    const data        = await API.getExam(module._id);
    const exam        = data.exam;
    const reachedDate = data.reachedDate;
    const moduleDate  = new Date(data.moduleDate);

    if (!exam) {
      this._stopExternalTimer();
      embedEl.innerHTML = this.lockedCardHTML(module, moduleDate, reachedDate, false);
      this.wireLockedActions(module);
      return;
    }
    if (!exam.visible) {
      this._stopExternalTimer();
      embedEl.innerHTML = this.lockedCardHTML(module, moduleDate, reachedDate, true);
      this.wireLockedActions(module);
      return;
    }
    this.renderExam(module, exam, embedEl);
  },

  // ── External floating timer ────────────────────
  // Starts counting from the moment the exam was unlocked/saved.
  // Persists across re-renders of the same exam. Auto-removes when
  // the exam container leaves the DOM (player closed / module switched).
  _startExternalTimer(exam, cfg) {
    this._stopExternalTimer();
    const startTime = new Date(exam.unlockedAt || exam.generatedAt || Date.now()).getTime();
    const limitMs   = (cfg.timeLimit || 30) * 60 * 1000;
    const taken     = !!exam.takenAt;

    const el = document.createElement('div');
    el.id = 'exam-external-timer';
    el.style.cssText = [
      'position:fixed','bottom:24px','right:24px','z-index:9998',
      'background:var(--surface,#fffdf7)','border:2px solid var(--gold,#d4a017)',
      'border-radius:14px','padding:10px 18px','min-width:140px',
      'box-shadow:0 8px 32px rgba(42,32,21,.22)',
      'font-family:\'Space Mono\',monospace',
      'display:flex','flex-direction:column','align-items:center','gap:2px',
      'transition:border-color .2s,background .2s',
    ].join(';');
    el.innerHTML = `
      <div style="font-size:10px;color:var(--text2,#6b5c40);text-transform:uppercase;letter-spacing:1.5px">
        ${taken ? 'Tiempo final' : 'Tiempo transcurrido'}
      </div>
      <div id="ext-timer-display" style="font-size:22px;font-weight:bold;color:var(--text,#2a2015);line-height:1">--:--</div>
      <div id="ext-timer-sub" style="font-size:10px;color:var(--text2,#6b5c40)">de ${cfg.timeLimit||30} min</div>
    `;
    document.body.appendChild(el);

    const tick = () => {
      const container = document.querySelector('.pl-exam-container');
      if (!container || !document.getElementById('exam-external-timer')) {
        this._stopExternalTimer();
        return;
      }
      const elapsedMs = Date.now() - startTime;
      const totalSec  = Math.max(0, Math.floor(elapsedMs / 1000));
      const hh = Math.floor(totalSec / 3600);
      const mm = Math.floor((totalSec % 3600) / 60);
      const ss = totalSec % 60;
      const pad = n => String(n).padStart(2, '0');
      const disp = hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;

      const dEl = document.getElementById('ext-timer-display');
      const sEl = document.getElementById('ext-timer-sub');
      if (!dEl || !sEl) { this._stopExternalTimer(); return; }
      dEl.textContent = disp;

      if (taken) {
        sEl.textContent = `de ${cfg.timeLimit||30} min · ✓ entregado`;
        el.style.borderColor = 'var(--acc2,#4a7c59)';
        dEl.style.color      = 'var(--acc2,#4a7c59)';
        return;
      }

      const remaining = limitMs - elapsedMs;
      if (remaining > 0) {
        const remMin = Math.ceil(remaining / 60000);
        sEl.textContent = `quedan ~${remMin} min`;
        const lowFrac = remaining / limitMs;
        if (lowFrac < 0.15) {
          el.style.borderColor = 'var(--danger,#b42828)';
          dEl.style.color      = 'var(--danger,#b42828)';
        } else if (lowFrac < 0.35) {
          el.style.borderColor = 'var(--acc,#c8622a)';
          dEl.style.color      = 'var(--acc,#c8622a)';
        } else {
          el.style.borderColor = 'var(--gold,#d4a017)';
          dEl.style.color      = 'var(--text,#2a2015)';
        }
      } else {
        const overMin = Math.floor(-remaining / 60000);
        sEl.textContent = `+${overMin} min sobre tiempo`;
        el.style.borderColor = 'var(--danger,#b42828)';
        dEl.style.color      = 'var(--danger,#b42828)';
      }
    };
    tick();
    this._timerInterval = setInterval(tick, 1000);
  },

  _stopExternalTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    document.getElementById('exam-external-timer')?.remove();
  },

  lockedCardHTML(m, moduleDate, reachedDate, hasContent) {
    const cfg       = m.examConfig || {};
    const fechaStr  = moduleDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const provLabel = { openai: 'OpenAI', anthropic: 'Anthropic Claude', manual: 'Manual' }[cfg.provider || 'manual'];
    const typeLabel = EXAM_TYPE_LABELS[cfg.examType] || '🔀 Mixto';
    const diffLabel = DIFFICULTY_LABELS[cfg.difficulty] || '📈 Intermedio';
    return `<div class="pl-exam-container">
      <div class="exam-locked-card">
        <div class="lock-icon">${hasContent ? '🔒' : '📝'}</div>
        <h2>${escapeHTML(m.title)}</h2>
        <p>${typeLabel} · ${diffLabel}</p>
        <p>${cfg.questionCount||10} preguntas · ${cfg.timeLimit||30} min · ${provLabel}</p>
        <p style="margin:18px 0;color:#9b8e70">${hasContent
          ? `Examen pre-generado. Bloqueado hasta el <strong style="color:var(--gold)">${fechaStr}</strong>.`
          : `Aún no hay examen generado. ${cfg.provider !== 'manual' ? 'Genera uno o' : 'Pega uno externamente, o'} desbloquea.`}</p>
        <div class="exam-actions">
          ${cfg.provider !== 'manual' ? '<button class="btn btn-primary" id="ex-generate">⚡ Generar ahora</button>' : ''}
          ${cfg.provider === 'manual' ? '<button class="btn btn-primary" id="ex-paste">📋 Pegar examen externo</button>' : ''}
          <button class="btn btn-outline" id="ex-unlock">${reachedDate ? '👁 Ver examen' : '🔓 Desbloquear igualmente'}</button>
          ${cfg.provider !== 'manual' ? '<button class="btn btn-outline" id="ex-copy-prompt">📋 Copiar prompt</button>' : ''}
        </div>
      </div>
    </div>`;
  },

  wireLockedActions(m) {
    const cfg = m.examConfig || {};

    $('ex-generate')?.addEventListener('click', async () => {
      try {
        toast('⏳ Generando con IA…', 8000);
        await API.generateExam(m._id);
        toast('✅ Examen generado');
        Player.buildEmbed(m);
      } catch (err) { toast('❌ ' + err.message); }
    });

    $('ex-unlock')?.addEventListener('click', async () => {
      try {
        await API.unlockExam(m._id);
        m.examConfig.locked = false;
        toast('🔓 Desbloqueado');
        Player.buildEmbed(m);
      } catch (err) { toast('❌ ' + err.message); }
    });

    $('ex-copy-prompt')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(this._buildPromptText(cfg))
        .then(() => toast('📋 Prompt copiado'));
    });

    $('ex-paste')?.addEventListener('click', () => this.showPasteModal(m));
  },

  // Strips markdown italic markers (* and _) from exam content while preserving bold.
  _stripItalics(md) {
    const store = [];
    let i = 0;
    // Protect bold+italic (***x*** / ___x___) → convert to bold, store as placeholder.
    // Protect bold (**x** / __x__) → store as placeholder.
    const shielded = md.replace(/(\*{2,3}|_{2,3})([^\n]+?)\1/g, (match, delim, inner) => {
      const clean = delim.length === 3
        ? `**${inner}**`   // bold+italic → bold only
        : match;           // bold → unchanged
      const key = `\x02${i++}\x03`;
      store.push([key, clean]);
      return key;
    });
    // Strip remaining single * and _ (italic markers).
    const stripped = shielded
      .replace(/\*([^*\n]+?)\*/g, '$1')
      .replace(/(?<![a-zA-Z0-9])_([^_\n]+?)_(?![a-zA-Z0-9])/g, '$1');
    // Restore protected bold sequences.
    return store.reduce((acc, [key, val]) => acc.replace(key, val), stripped);
  },

  // Builds the full templated prompt from an examConfig (type+difficulty+course content).
  // Used for the "copy prompt" buttons on locked cards and the paste modal.
  _buildPromptText(cfg) {
    const type       = cfg.examType || 'mixed';
    const difficulty = cfg.difficulty || 'intermediate';
    const tmpl = (EXAM_TEMPLATES[type] || {})[difficulty];
    if (tmpl) {
      // For saved configs we don't know the week, so include all examsheets.
      const examsheetRaw   = this._examsheetForWeek(null);
      const examsheetBlock = examsheetRaw
        ? `Contenido de referencia de la sección:\n${examsheetRaw}\n`
        : '';
      return tmpl
        .replace(/\{courseTitle\}/g,      State.cur?.title || 'este curso')
        .replace(/\{moduleList\}/g,        cfg.prompt || '')
        .replace(/\{examsheetContent\}/g,  examsheetBlock)
        .replace(/\{questionCount\}/g,     cfg.questionCount || 10)
        .replace(/\{timeLimit\}/g,         cfg.timeLimit || 30)
        .replace(/\{fmtRule\}/g,           _FMT_RULE);
    }
    return `Genera un examen sobre el siguiente tema:\n\n${cfg.prompt || ''}\n\n- ${cfg.questionCount||10} preguntas · ${cfg.timeLimit||30} min`;
  },

  showPasteModal(m) {
    const cfg = m.examConfig || {};
    const hasPrompt = !!(cfg.prompt && cfg.prompt.trim());
    showModal('📋 Pegar examen externo', `
      ${hasPrompt ? `
        <div class="fg" style="background:#f7f3eb;border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
            <label style="margin:0"><strong>Prompt definido para este examen</strong></label>
            <button type="button" class="btn btn-primary btn-sm" id="paste-copy-prompt">📋 Copiar prompt</button>
          </div>
          <textarea readonly class="code" rows="5"
            style="width:100%;font-family:monospace;padding:8px;box-sizing:border-box;background:#fffdf7;border:1px solid var(--border);border-radius:6px"
          >${escapeHTML(this._buildPromptText(cfg))}</textarea>
          <p class="hint" style="margin-top:6px;margin-bottom:0">Cópialo, pégalo en tu IA favorita, y trae el resultado al área de abajo.</p>
        </div>
      ` : ''}
      <div class="fg">
        <label>Resultado del examen (Markdown)</label>
        <textarea id="paste-content" class="code" rows="16"
          style="width:100%;min-height:320px;resize:vertical;font-family:monospace;padding:10px;box-sizing:border-box"
          placeholder="# Examen 1&#10;&#10;## Pregunta 1&#10;…&#10;&#10;---&#10;## Clave de respuestas&#10;1. …"></textarea>
      </div>
      <p class="hint" style="margin-top:8px">Tip: pulsa Ctrl/Cmd+V dentro del área de texto.</p>
    `, async () => {
      const content = $val('paste-content');
      if (!content.trim()) { toast('Vacío'); return false; }
      await API.pasteExam(m._id, content);
      toast('✅ Examen guardado');
      Player.buildEmbed(m);
    }, { wide: true });
    this._lift();
    setTimeout(() => {
      document.getElementById('paste-content')?.focus();
      document.getElementById('paste-copy-prompt')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(this._buildPromptText(cfg))
          .then(() => toast('📋 Prompt copiado'));
      });
    }, 50);
  },

  renderExam(m, exam, embedEl) {
    const cfg = m.examConfig || {};
    embedEl.innerHTML = `<div class="pl-exam-container">
      <div class="exam-meta">
        <span>${EXAM_TYPE_LABELS[cfg.examType] || '🔀 Mixto'}</span>
        <span><strong>${cfg.questionCount||10}</strong> preguntas</span>
        <span><strong>${cfg.timeLimit||30}</strong> min</span>
        ${exam.takenAt ? `<span>📊 <strong>${exam.score}/${exam.total}</strong> (${exam.total ? (exam.score/exam.total*100).toFixed(0) : 0}%)</span>` : ''}
        <span style="margin-left:auto">
          <button class="btn btn-primary btn-sm" id="ex-grade">${exam.takenAt ? 'Re-calificar' : 'Auto-calificar'}</button>
        </span>
      </div>
      <div class="md">${mdParse(this._stripItalics(exam.content))}</div>
    </div>`;

    $('ex-grade').addEventListener('click', () => this.showGradeModal(m, exam));
    this._startExternalTimer(exam, cfg);
  },

  showGradeModal(m, exam) {
    showModal('📊 Calificar examen', `
      <p class="hint">Compara tus respuestas con la clave del examen y registra tu puntaje.</p>
      <div class="row-2">
        <div class="fg"><label>Tu puntaje</label><input type="number" id="g-score" min="0" value="${exam.score ?? ''}" placeholder="ej. 85"></div>
        <div class="fg"><label>Total posible</label><input type="number" id="g-total" min="1" value="${exam.total ?? (m.examConfig?.questionCount||10)*10}"></div>
      </div>
      <div class="fg"><label>Notas / reflexión</label><textarea id="g-notes" rows="3" placeholder="¿Qué se te complicó? ¿Qué repasar?">${escapeHTML(exam.userNotes||'')}</textarea></div>
    `, async () => {
      const score = parseFloat($val('g-score'));
      const total = parseFloat($val('g-total'));
      if (isNaN(score) || isNaN(total) || total <= 0) { toast('Puntajes inválidos'); return false; }
      await API.gradeExam(m._id, score, total, $val('g-notes'));
      const m2 = State.curModules.find(x => x._id === m._id);
      if (m2) m2.done = true;
      State.curGrades = await API.getGrades(State.cur._id);
      toast(`✅ ${score}/${total} (${(score/total*100).toFixed(0)}%) registrado`);
      Player.buildEmbed(m);
    });
    this._lift();
  },

  // Load exam templates from the external JSON file.
  // Called by appBoot before the UI is ready; safe to call multiple times.
  async init() {
    try {
      const res  = await fetch('/templates/exam_templates.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // fmtRule is an array of lines → join into a single string.
      _FMT_RULE = Array.isArray(data.fmtRule) ? data.fmtRule.join('\n') : (data.fmtRule || '');

      // Each template value is an array of lines → join into a string.
      const raw = data.templates || {};
      EXAM_TEMPLATES = {};
      for (const [type, difficulties] of Object.entries(raw)) {
        EXAM_TEMPLATES[type] = {};
        for (const [diff, lines] of Object.entries(difficulties)) {
          EXAM_TEMPLATES[type][diff] = Array.isArray(lines) ? lines.join('\n') : lines;
        }
      }
    } catch (err) {
      console.warn('[Exams] Could not load exam_templates.json:', err.message);
    }
  },
};
