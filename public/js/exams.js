const Exams = {
  // ── Form HTML for creating a new exam module ──
  newFormHTML() {
    const cap  = State.capabilities?.ai || {};
    const prov = State.settings?.aiProvider || 'manual';
    return `
      <div class="fg">
        <label>Prompt / tema del examen</label>
        <textarea id="ex-prompt" class="code" rows="4" placeholder="Describe el tema. ej: Cinco preguntas sobre las dos primeras leyes de Newton, mezclando opción múltiple y respuesta corta."></textarea>
        <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-week">⚡ Prompt de semana actual</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-month">📅 Prompt del mes</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-all">📚 Prompt del curso completo</button>
        </div>
      </div>
      <div class="row-2">
        <div class="fg"><label># preguntas</label><input type="number" id="ex-qcount" value="10" min="1" max="50"></div>
        <div class="fg"><label>Tiempo (min)</label><input type="number" id="ex-time" value="30" min="5" max="240"></div>
      </div>
      <div class="row-2">
        <div class="fg">
          <label>Proveedor</label>
          <select id="ex-prov">
            <option value="manual" ${prov==='manual'?'selected':''}>Manual (yo lo pego)</option>
            <option value="openai" ${prov==='openai'?'selected':''} ${!cap.openai?'disabled':''}>OpenAI ${!cap.openai?'(no configurado)':'✓'}</option>
            <option value="anthropic" ${prov==='anthropic'?'selected':''} ${!cap.anthropic?'disabled':''}>Anthropic Claude ${!cap.anthropic?'(no configurado)':'✓'}</option>
          </select>
        </div>
        <div class="fg"><label>Modelo (opcional)</label><input id="ex-model" placeholder="ej. gpt-4o-mini, claude-haiku-4-5"></div>
      </div>
      <p class="hint">El examen queda <strong>bloqueado</strong> hasta la fecha del módulo. Si lo regeneras, se vuelve a bloquear.</p>`;
  },

  wirePromptGenButtons(weekNum) {
    const week = weekNum !== undefined ? weekNum : 0;
    const fillPrompt = async (scope) => {
      if (!State.cur) return;
      try {
        toast('⏳ Generando prompt…', 3000);
        const { prompt } = await API.getExamPrompt(State.cur._id, scope, week);
        const el = $('ex-prompt');
        if (el) { el.value = prompt; el.dispatchEvent(new Event('input')); }
        toast('✅ Prompt generado');
      } catch (err) { toast('❌ ' + err.message); }
    };
    $('ex-gen-week')?.addEventListener('click',  () => fillPrompt('week'));
    $('ex-gen-month')?.addEventListener('click', () => fillPrompt('month'));
    $('ex-gen-all')?.addEventListener('click',   () => fillPrompt('all'));
  },

  readNewForm() {
    return {
      prompt:        $val('ex-prompt'),
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
        <textarea id="ex-prompt" class="code" rows="4">${escapeHTML(cfg.prompt || '')}</textarea>
        <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-week">⚡ Prompt semana</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-month">📅 Prompt mes</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-all">📚 Prompt curso</button>
        </div>
      </div>
      <div class="row-2">
        <div class="fg"><label># preguntas</label><input type="number" id="ex-qcount" value="${cfg.questionCount||10}" min="1" max="50"></div>
        <div class="fg"><label>Tiempo (min)</label><input type="number" id="ex-time" value="${cfg.timeLimit||30}" min="5" max="240"></div>
      </div>
      <div class="row-2">
        <div class="fg">
          <label>Proveedor</label>
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

    // Load prompt
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
      embedEl.innerHTML = this.lockedCardHTML(module, moduleDate, reachedDate, false);
      this.wireLockedActions(module);
      return;
    }
    if (!exam.visible) {
      embedEl.innerHTML = this.lockedCardHTML(module, moduleDate, reachedDate, true);
      this.wireLockedActions(module);
      return;
    }
    this.renderExam(module, exam, embedEl);
  },

  lockedCardHTML(m, moduleDate, reachedDate, hasContent) {
    const cfg      = m.examConfig || {};
    const fechaStr = moduleDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const provLabel = { openai: 'OpenAI', anthropic: 'Anthropic Claude', manual: 'Manual' }[cfg.provider || 'manual'];
    return `<div class="pl-exam-container">
      <div class="exam-locked-card">
        <div class="lock-icon">${hasContent ? '🔒' : '📝'}</div>
        <h2>${escapeHTML(m.title)}</h2>
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
      const full = `Genera un examen sobre el siguiente tema:\n\n${cfg.prompt}\n\nEspecificaciones:\n- ${cfg.questionCount||10} preguntas\n- Tiempo: ${cfg.timeLimit||30} min\n- Mezcla opción múltiple (60%) con respuesta corta (40%)\n- Formato: Markdown, con clave de respuestas tras un separador "---"`;
      navigator.clipboard?.writeText(full).then(() => toast('📋 Prompt copiado'));
    });

    $('ex-paste')?.addEventListener('click', () => this.showPasteModal(m));
  },

  showPasteModal(m) {
    showModal('📋 Pegar examen externo', `
      <p class="hint">Pega aquí el examen completo generado con una IA externa (ChatGPT, Gemini, Claude, etc.).</p>
      <div class="fg"><label>Contenido (Markdown)</label><textarea id="paste-content" class="code" rows="14" placeholder="# Examen 1\n\n## Pregunta 1 …"></textarea></div>
    `, async () => {
      const content = $val('paste-content');
      if (!content.trim()) { toast('Vacío'); return false; }
      await API.pasteExam(m._id, content);
      toast('✅ Examen guardado');
      Player.buildEmbed(m);
    });
  },

  renderExam(m, exam, embedEl) {
    const cfg = m.examConfig || {};
    embedEl.innerHTML = `<div class="pl-exam-container">
      <div class="exam-meta">
        <span><strong>${cfg.questionCount||10}</strong> preguntas</span>
        <span><strong>${cfg.timeLimit||30}</strong> min</span>
        ${exam.takenAt ? `<span>📊 <strong>${exam.score}/${exam.total}</strong> (${exam.total ? (exam.score/exam.total*100).toFixed(0) : 0}%)</span>` : ''}
        <span style="margin-left:auto">
          <button class="btn btn-primary btn-sm" id="ex-grade">${exam.takenAt ? 'Re-calificar' : 'Auto-calificar'}</button>
        </span>
      </div>
      <div class="md">${mdParse(exam.content)}</div>
    </div>`;

    $('ex-grade').addEventListener('click', () => this.showGradeModal(m, exam));
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
  },

  init() { /* nothing static */ },
};
