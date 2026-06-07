// ── Mazo de Cartas ────────────────────────────────
// Skill-as-playing-card view. Cards are interactable only after today's
// course obligations are fully completed.
const CardDeck = {
  skills: [],
  obligationsMet: false,

  // ── Lifecycle ────────────────────────────────────
  async open() {
    State.cur = null;
    Stickers?.clearCanvas?.();
    $('home-view').style.display        = 'none';
    $('course-view').style.display      = 'none';
    $('global-cal-view').style.display  = 'none';
    const gv = $('graph-view'); if (gv) gv.style.display = 'none';
    const nv = $('network-view'); if (nv) nv.style.display = 'none';
    if (window.SkillGraph) SkillGraph.close();
    if (window.NetworkGraph) NetworkGraph.close();
    $('cards-view').style.display = '';
    $('main').style.background = 'var(--bg)';
    applyDarkModeForBg(null);
    await this.load();
    this.render();
  },

  // ── Data ─────────────────────────────────────────
  async load() {
    const [rawSkills, obs] = await Promise.all([
      API.listSkills().catch(() => []),
      API.todayObligations().catch(() => ({ met: true, total: 0, done: 0 })),
    ]);
    this.skills = Array.isArray(rawSkills) ? rawSkills : [];
    this.obligationsMet = obs.met;

    const banner = $('cards-lock-banner');
    const prog   = $('cards-progress');
    if (banner) banner.style.display = obs.met ? 'none' : 'flex';
    if (prog) {
      prog.textContent = obs.met
        ? obs.total > 0
          ? `✅ ${obs.done}/${obs.total} módulos completados — ¡mazo desbloqueado!`
          : '✅ Sin obligaciones programadas hoy — mazo desbloqueado'
        : `⏳ ${obs.done}/${obs.total} módulos de hoy completados`;
    }
  },

  // ── Render ────────────────────────────────────────
  render() {
    const grid  = $('cards-grid');
    const empty = $('cards-empty');
    if (!grid) return;
    if (!this.skills.length) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      return;
    }
    if (empty) empty.style.display = 'none';
    grid.innerHTML = this.skills.map(s => this.cardHTML(s)).join('');
    grid.querySelectorAll('.skill-card').forEach(el => {
      el.addEventListener('click', () => this.openCard(el.dataset.id));
    });
  },

  // ── Card value helpers ────────────────────────────
  cardLabel(v) {
    const n = Number(v) || 1;
    if (n === 11) return 'J';
    if (n === 12) return 'Q';
    if (n === 13) return 'K';
    return String(n);
  },

  hasRecentExperience(skill) {
    const cutoff = Date.now() - 7 * 7 * 24 * 60 * 60 * 1000; // 7 weeks
    return (skill.learningExperiences || []).some(e => new Date(e.date).getTime() >= cutoff);
  },

  // ── Card HTML ─────────────────────────────────────
  cardHTML(s) {
    const val   = this.cardLabel(s.cardValue);
    const emoji = escapeHTML(s.emoji || '✦');
    const color = s.color || '#7c5ce0';
    const glow  = this.hasRecentExperience(s);
    const locked = !this.obligationsMet;
    return `
      <div class="skill-card${glow ? ' skill-card--glow' : ''}${locked ? ' skill-card--locked' : ''}"
           data-id="${s._id}"
           style="--card-color:${color}"
           title="${locked ? 'Completa tus módulos del día para interactuar' : escapeHTML(s.name)}">
        <div class="skill-card__corner skill-card__corner--tl">
          <span class="skill-card__val">${val}</span>
          <span class="skill-card__suit">${emoji}</span>
        </div>
        <div class="skill-card__center">${emoji}</div>
        <div class="skill-card__name">${escapeHTML(s.name)}</div>
        <div class="skill-card__corner skill-card__corner--br">
          <span class="skill-card__val">${val}</span>
          <span class="skill-card__suit">${emoji}</span>
        </div>
        ${locked ? '<div class="skill-card__lock">🔒</div>' : ''}
      </div>`;
  },

  // ── Card interaction ──────────────────────────────
  openCard(id) {
    const s = this.skills.find(x => String(x._id) === String(id));
    if (!s) return;
    if (!this.obligationsMet) {
      toast('🔒 Completa tus módulos del día primero');
      return;
    }
    const val  = this.cardLabel(s.cardValue);
    const color = s.color || '#7c5ce0';
    const exps = (s.learningExperiences || [])
      .slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    const logRows = exps.length
      ? exps.map(e => `
          <div class="exp-row">
            <span class="exp-date">${new Date(e.date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span class="exp-val">+${e.value}</span>
            ${e.note ? `<span class="exp-note">${escapeHTML(e.note)}</span>` : ''}
          </div>`).join('')
      : '<p class="hint" style="margin:0">Sin experiencias registradas aún.</p>';

    const body = `
      <div class="card-modal-layout">
        <div class="card-preview" style="--card-color:${color}">
          <div class="card-preview__corner">${val} ${escapeHTML(s.emoji || '✦')}</div>
          <div class="card-preview__center">${escapeHTML(s.emoji || '✦')}</div>
          <div class="card-preview__name">${escapeHTML(s.name)}</div>
          <div class="card-preview__corner card-preview__corner--br">${val} ${escapeHTML(s.emoji || '✦')}</div>
        </div>
        <div class="card-modal-side">
          <div style="display:flex;gap:8px;margin-bottom:14px">
            <button class="btn btn-primary btn-sm" id="card-add-exp">✨ Añadir experiencia</button>
            <button class="btn btn-outline btn-sm" id="card-toggle-log">📋 Ver detalles</button>
          </div>
          <div id="card-log" style="display:none">
            <h4 style="margin:0 0 10px;font-size:13px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px">Historial</h4>
            <div class="exp-list">${logRows}</div>
          </div>
        </div>
      </div>`;

    showModal(`🃏 ${escapeHTML(s.name)}`, body, null, { saveText: 'Cerrar' });

    $('card-add-exp')?.addEventListener('click', () => {
      closeModal();
      this.addExperience(s._id);
    });
    $('card-toggle-log')?.addEventListener('click', () => {
      const log = $('card-log');
      if (!log) return;
      const showing = log.style.display !== 'none';
      log.style.display = showing ? 'none' : '';
      $('card-toggle-log').textContent = showing ? '📋 Ver detalles' : '📋 Ocultar detalles';
    });
  },

  addExperience(skillId) {
    const body = `
      <p class="hint">Describe qué aprendiste y cuánto valor tuvo esta experiencia.</p>
      <div class="form-row">
        <label>Descripción (opcional)</label>
        <textarea id="exp-note" rows="3"
          placeholder="Ej: Practiqué con un cliente real, resolví un problema difícil…"
          style="width:100%;resize:vertical;box-sizing:border-box"></textarea>
      </div>
      <div class="form-row">
        <label>Valor de la experiencia
          <span class="hint" id="exp-val-label" style="margin-left:6px">3 puntos</span>
        </label>
        <input type="range" id="exp-value" min="1" max="5" value="3" style="width:100%">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-top:2px">
          <span>Menor</span><span>Mayor</span>
        </div>
      </div>`;

    showModal('✨ Nueva experiencia de aprendizaje', body, async () => {
      const note     = $val('exp-note').trim();
      const value    = +($val('exp-value')) || 3;
      const s        = this.skills.find(x => String(x._id) === String(skillId));
      const oldCycle = s ? (s.cardCycle || 0) : 0;
      try {
        const updated = await API.addLearning(skillId, { note, value });
        const idx = this.skills.findIndex(x => String(x._id) === String(skillId));
        if (idx >= 0) this.skills[idx] = updated;
        this.render();
        const cycled = (updated.cardCycle || 0) > oldCycle;
        toast(cycled
          ? `🌈 ¡Nuevo ciclo! La habilidad evoluciona → ${this.cardLabel(updated.cardValue)}`
          : `✨ +${value} → carta ${this.cardLabel(updated.cardValue)}`);
      } catch (err) { toast('❌ ' + err.message); return false; }
    }, { saveText: 'Registrar' });

    $('exp-value')?.addEventListener('input', e => {
      const lbl = $('exp-val-label');
      if (lbl) lbl.textContent = `${e.target.value} punto${e.target.value > 1 ? 's' : ''}`;
    });
  },

  // ── Init ─────────────────────────────────────────
  init() {
    $('nav-cards')?.addEventListener('click', () => this.open());
    $('cards-back')?.addEventListener('click', () => Course.showHome());
  },
};
