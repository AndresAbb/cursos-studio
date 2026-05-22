const Course = {
  curMtype: 'youtube',
  bulkDayPicker: null,
  recurDayPicker: null,

  async loadList() {
    try {
      State.courses  = await API.listCourses();
      State.externals = await API.listExternals();
      this.renderSidebar();
      this.renderCards();
      Externals.renderCards();
    } catch (err) { toast('❌ ' + err.message); }
  },

  renderSidebar() {
    const sidebarCourses = State.courses.filter(c => this.isActiveCourse(c) || State.cur?._id === c._id);
    $('sb-courses').innerHTML = sidebarCourses.map(c => {
      const lead = c.favicon
        ? `<img class="sb-fav" src="${c.favicon}" alt="">`
        : `<div class="sb-dot" style="background:${c.color}"></div>`;
      const archCls = this.isActiveCourse(c) ? '' : ' archived';
      return `
      <div class="sb-item ${State.cur?._id === c._id ? 'active' : ''}${archCls}" data-id="${c._id}">
        ${lead}
        ${c.favicon ? '' : c.emoji} ${escapeHTML(c.title)}
      </div>`;
    }).join('');
    $('sb-courses').querySelectorAll('.sb-item').forEach(el => {
      el.addEventListener('click', () => this.open(el.dataset.id));
    });

    $('sb-externals').innerHTML = State.externals.map(e => `
      <div class="sb-item" data-eid="${e._id}">
        ${e.favicon ? `<img class="sb-fav" src="${e.favicon}" alt="">` : `<div class="sb-dot" style="background:${e.color}"></div>`}
        ${escapeHTML(e.title)}
      </div>
    `).join('') || '<div class="hint" style="padding:0 16px">Sin externos</div>';
    $('sb-externals').querySelectorAll('.sb-item').forEach(el => {
      el.addEventListener('click', () => Externals.openEditor(el.dataset.eid));
    });
  },

  // status defaults to 'active' for legacy records that never had the field.
  isActiveCourse(c) { return (c.status || 'active') === 'active'; },

  courseCardHTML(c, opts = {}) {
    const tot  = c.totalModules || 0;
    const done = c.doneModules  || 0;
    const pct  = tot ? Math.round(done / tot * 100) : 0;
    const header = c.favicon
      ? `<img class="cc-fav" src="${c.favicon}" alt="">`
      : (c.emoji || '📚');
    const status = c.status || 'active';
    const badge = status === 'finished'  ? '<span class="cc-badge cc-finished">✓ Terminado</span>'
                : status === 'cancelled' ? '<span class="cc-badge cc-cancelled">✕ Cancelado</span>'
                : '';
    const handle = opts.draggable ? '<div class="cc-handle" title="Arrastrar para reordenar">⋮⋮</div>' : '';
    const cls    = `course-card${opts.archived ? ' archived' : ''}`;
    return `<div class="${cls}" data-id="${c._id}" ${opts.draggable ? 'draggable="true"' : ''}>
      ${handle}
      <div class="cc-header" style="background:${c.color}18">${header}${badge}</div>
      <div class="cc-body">
        <div class="cc-title">${escapeHTML(c.title)}</div>
        <div class="cc-meta">${tot} módulos · ${pct}% · ⏱ ${fmtTime(c.totalSeconds || 0)}</div>
        <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${c.color}"></div></div>
      </div>
    </div>`;
  },

  renderCards() {
    const active   = State.courses.filter(c => this.isActiveCourse(c));
    const archived = State.courses.filter(c => !this.isActiveCourse(c));

    // Active grid (drag-and-drop reorderable)
    const el = $('courses-grid');
    if (!active.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon">📚</div>Aún no hay cursos activos.</div>`;
    } else {
      el.innerHTML = active.map(c => this.courseCardHTML(c, { draggable: true })).join('');
    }
    const hint = $('courses-reorder-hint');
    if (hint) hint.style.display = active.length > 1 ? '' : 'none';

    // Archived grid (collapsible)
    const arch = $('archived-grid');
    const det  = $('archived-details');
    const cnt  = $('archived-count');
    if (det) det.style.display = archived.length ? '' : 'none';
    if (cnt) cnt.textContent  = archived.length ? ` (${archived.length})` : '';
    if (arch) arch.innerHTML  = archived.map(c => this.courseCardHTML(c, { archived: true })).join('');

    // Click to open — works for both grids
    [...el.querySelectorAll('.course-card'), ...(arch ? arch.querySelectorAll('.course-card') : [])]
      .forEach(card => {
        card.addEventListener('click', e => {
          // Avoid opening when the user clicked the drag handle
          if (e.target.classList.contains('cc-handle')) return;
          this.open(card.dataset.id);
        });
      });

    this.wireReorder();
  },

  // ── Drag-and-drop reordering of active courses ─
  wireReorder() {
    const grid = $('courses-grid');
    if (!grid) return;
    let dragId = null;

    grid.querySelectorAll('.course-card[draggable="true"]').forEach(card => {
      card.addEventListener('dragstart', e => {
        dragId = card.dataset.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragId); } catch {}
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        dragId = null;
      });
      card.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragId || dragId === card.dataset.id) return;
        card.classList.add('drag-over');
      });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', async e => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const fromId = dragId;
        const toId   = card.dataset.id;
        if (!fromId || fromId === toId) return;

        // Reorder in-place: move active list, persist new order
        const active = State.courses.filter(c => this.isActiveCourse(c));
        const rest   = State.courses.filter(c => !this.isActiveCourse(c));
        const fromI  = active.findIndex(c => c._id === fromId);
        const toI    = active.findIndex(c => c._id === toId);
        if (fromI < 0 || toI < 0) return;
        const [moved] = active.splice(fromI, 1);
        active.splice(toI, 0, moved);
        State.courses = [...active, ...rest];
        this.renderCards();
        try {
          await API.reorderCourses(active.map(c => c._id));
        } catch (err) { toast('❌ ' + err.message); }
      });
    });
  },

  async open(courseId) {
    try {
      const c = await API.getCourse(courseId);
      State.cur = c;
      State.weekOff = 0;
      State.curModules = await API.listModules(courseId);
      State.curGrades  = await API.getGrades(courseId);

      $('home-view').style.display = 'none';
      $('global-cal-view').style.display = 'none';
      const gv2 = $('graph-view'); if (gv2) gv2.style.display = 'none';
      if (window.SkillGraph) SkillGraph.close();
      $('course-view').style.display = '';
      $('sticker-canvas').classList.add('active');
      // Reset the global mood theme — course view drives its own bg/contrast
      // via Stickers.applyCurrentBg + applyDarkModeForBg(courseBg).
      document.body.dataset.theme = 'day';
      $('cv-title').innerHTML = `${c.emoji} ${escapeHTML(c.title)}`;

      Stickers.applyCurrentBg();
      Stickers.loadAndRender();
      this.renderSidebar();
      this.switchView('cal');
      Friends.emitStudying(c.title);
      Friends.checkAndEmitExamUpcoming(State.curModules, c.startDate);
    } catch (err) { toast('❌ ' + err.message); }
  },

  showHome() {
    State.cur = null;
    State.curModules = [];
    State.curStickers = [];
    Stickers.clearCanvas();
    $('home-view').style.display = '';
    $('course-view').style.display = 'none';
    $('global-cal-view').style.display = 'none';
    const gv = $('graph-view'); if (gv) gv.style.display = 'none';
    if (window.SkillGraph) SkillGraph.close();
    $('sticker-canvas').classList.remove('active');
    $('stk-panel').classList.remove('open');
    $('main').style.background = 'var(--bg)';
    applyDarkModeForBg(null);
    this.renderSidebar();
    this.loadList();
    if (typeof Home !== 'undefined') Home.renderHero();
    if (typeof Ghosts !== 'undefined') {
      Ghosts.loadList().then(() => Ghosts.render());
    }
  },

  switchView(v) {
    State.view = v;
    ['cal-view','mod-view','grades-view','syllabus-view'].forEach(id => {
      const el = $(id);
      if (el) el.style.display = 'none';
    });
    const target = $(v + '-view');
    if (target) target.style.display = '';
    document.querySelectorAll('.vbtn').forEach(b => b.classList.toggle('on', b.dataset.view === v));

    if (v === 'cal')      Calendar.render();
    else if (v === 'mod') this.renderModules();
    else if (v === 'grades')   this.renderGrades();
    else if (v === 'syllabus') this.renderSyllabus();
  },

  // ── Module list view ───────────────────────────
  renderModules() {
    const el = $('mod-list');
    if (!State.curModules.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon">📦</div>Sin módulos. Usa <strong>+ Módulo</strong>.</div>`;
      return;
    }
    const labels = State.cur?.syllabusLabels || [];
    const sorted = [...State.curModules].sort((a, b) =>
      (a.week * 7 + a.dayOfWeek) - (b.week * 7 + b.dayOfWeek) || a.order - b.order
    );

    let lastWeek = -1;
    let lastSection = null;
    el.innerHTML = sorted.map(m => {
      let out = '';

      // Show syllabus section header when entering a new section
      const section = labels.find(l => l.startWeek === m.week && m.week !== lastSection?.startWeek);
      if (section && section.startWeek !== lastSection?.startWeek) {
        lastSection = section;
        out += `<div class="syllabus-section-head" style="--sec-color:${State.cur.color}">
          <span class="sec-badge">§</span>
          <div>
            <div class="sec-title">${escapeHTML(section.title)}</div>
            ${section.description ? `<div class="sec-desc">${escapeHTML(section.description)}</div>` : ''}
          </div>
          <span class="sec-range">Sem ${section.startWeek+1}–${section.endWeek+1}</span>
        </div>`;
      }

      if (m.week !== lastWeek) {
        lastWeek = m.week;
        out += `<div class="week-head">Semana ${m.week + 1}</div>`;
      }

      const col  = typeColor(m.type, State.cur.color);
      const time = m.watchedSeconds > 0 ? `<span class="mod-time">⏱ ${fmtTime(m.watchedSeconds)}</span>` : '';
      let icon = typeIcon(m.type);
      if (m.type === 'web-link' && m.favicon) icon = `<img src="${m.favicon}" alt="">`;

      out += `<div class="mod-item ${m.done ? 'done-item' : ''}" data-id="${m._id}">
        <div class="mod-icon" style="color:${col}">${icon}</div>
        <div class="mod-info">
          <div class="mod-title">${escapeHTML(m.title)}</div>
          <div class="mod-meta">${DAYS_FULL[m.dayOfWeek]} ${time}</div>
        </div>
        <div class="mod-actions">
          <button class="mod-action" data-act="dup"  data-id="${m._id}" title="Duplicar">⎘</button>
          <button class="mod-action" data-act="edit" data-id="${m._id}" title="Editar">✎</button>
          <button class="mod-action" data-act="del"  data-id="${m._id}" title="Eliminar">×</button>
        </div>
        <div class="check-btn ${m.done ? 'on' : ''}" data-check="${m._id}" title="${m.done ? 'Desmarcar' : 'Marcar como visto'}"></div>
      </div>`;
      return out;
    }).join('');

    el.querySelectorAll('.mod-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.classList.contains('check-btn') || e.target.classList.contains('mod-action')) return;
        Player.open(item.dataset.id);
      });
    });
    el.querySelectorAll('.mod-action').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const m  = State.curModules.find(x => x._id === id);
        if (!m) return;
        const act = btn.dataset.act;
        if (act === 'dup') this.showDuplicateModal(m);
        else if (act === 'edit') this.showEditModule(m);
        else if (act === 'del') {
          if (!confirm(`¿Eliminar "${m.title}"?`)) return;
          try {
            await API.deleteModule(id);
            State.curModules = State.curModules.filter(x => x._id !== id);
            this.renderModules();
            Calendar.render();
            toast('🗑 Eliminado');
          } catch (err) { toast('❌ ' + err.message); }
        }
      });
    });
    el.querySelectorAll('.check-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const id = btn.dataset.check;
        const m  = State.curModules.find(x => x._id === id);
        if (!m) return;
        try {
          await API.updateModule(id, { done: !m.done });
          m.done = !m.done;
          this.renderModules();
          Calendar.render();
          if (m.done) Friends.emitProgress(m.title, State.cur?.title);
        } catch (err) { toast('❌ ' + err.message); }
      });
    });
  },

  // ── Grades view ────────────────────────────────
  renderGrades() {
    const el      = $('grades-table');
    const summary = $('grades-summary');
    const grades  = State.curGrades || [];

    // Completion stats
    const totalMods = State.curModules.length;
    const doneMods  = State.curModules.filter(m => m.done).length;
    const completionPct = totalMods ? Math.round(doneMods / totalMods * 100) : 0;

    if (!grades.length) {
      summary.innerHTML = `
        <div class="grade-stat"><div class="grade-stat-label">Completado</div><div class="grade-stat-val">${completionPct}%</div></div>
        <div class="grade-stat"><div class="grade-stat-label">Módulos</div><div class="grade-stat-val">${doneMods}/${totalMods}</div></div>
      `;
      el.innerHTML = `<tr><td><div class="empty-state"><div class="icon">📊</div>Sin calificaciones aún.</div></td></tr>`;
      return;
    }
    const totalScore = grades.reduce((s, g) => s + (g.score || 0), 0);
    const totalMax   = grades.reduce((s, g) => s + (g.total || 0), 0);
    const avg        = totalMax ? (totalScore / totalMax * 100).toFixed(1) : 0;

    summary.innerHTML = `
      <div class="grade-stat"><div class="grade-stat-label">Exámenes</div><div class="grade-stat-val">${grades.length}</div></div>
      <div class="grade-stat"><div class="grade-stat-label">Promedio</div><div class="grade-stat-val">${avg}%</div></div>
      <div class="grade-stat"><div class="grade-stat-label">Puntos</div><div class="grade-stat-val">${totalScore}/${totalMax}</div></div>
      <div class="grade-stat"><div class="grade-stat-label">Completado</div><div class="grade-stat-val">${completionPct}%</div></div>
    `;
    el.innerHTML = `
      <thead><tr><th>Examen</th><th>Fecha</th><th>Score</th><th>Notas</th></tr></thead>
      <tbody>
        ${grades.map(g => {
          const pct = g.total ? (g.score / g.total * 100) : 0;
          return `<tr>
            <td>${escapeHTML(g.moduleTitle || '—')}</td>
            <td>${new Date(g.date).toLocaleDateString('es-ES')}</td>
            <td>
              <span class="grade-bar"><span class="grade-bar-fill" style="width:${pct}%"></span></span>
              ${g.score}/${g.total} <span style="color:var(--text2);font-size:11px">(${pct.toFixed(0)}%)</span>
            </td>
            <td>${escapeHTML(g.notes || '')}</td>
          </tr>`;
        }).join('')}
      </tbody>`;
  },

  // ── Syllabus view ──────────────────────────────
  renderSyllabus() {
    const el = $('syllabus-view');
    if (!el) return;
    const labels = State.cur?.syllabusLabels || [];
    const mods   = [...State.curModules].sort((a,b) => a.week - b.week || a.dayOfWeek - b.dayOfWeek);
    const maxWeek = mods.length ? Math.max(...mods.map(m => m.week)) : 0;

    // Build week → section map
    const weekSection = {};
    labels.forEach(l => {
      for (let w = l.startWeek; w <= l.endWeek; w++) weekSection[w] = l;
    });

    // Render timeline
    const weeks = [];
    for (let w = 0; w <= maxWeek; w++) weeks.push(w);

    if (!weeks.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon">📋</div>Sin módulos para mostrar. Agrega módulos y define secciones en ⚙️ Configuración del curso.</div>`;
      return;
    }

    // Group weeks by section
    const groups = [];
    let cur = null;
    weeks.forEach(w => {
      const sec = weekSection[w];
      const key = sec ? sec.title : '__unlabeled__';
      if (!cur || cur.key !== key) {
        cur = { key, label: sec || null, weeks: [] };
        groups.push(cur);
      }
      cur.weeks.push(w);
    });

    el.innerHTML = `
      <div class="syllabus-header">
        <h3 class="grades-title">📋 Sílabo — ${escapeHTML(State.cur?.title || '')}</h3>
        <button class="btn btn-outline btn-sm" id="syl-manage-labels">✎ Editar secciones</button>
      </div>
      <div class="syllabus-timeline">
        ${groups.map(g => {
          const color = g.label ? State.cur.color : 'var(--border)';
          const weekMods = mods.filter(m => g.weeks.includes(m.week));
          const done  = weekMods.filter(m => m.done).length;
          const pct   = weekMods.length ? Math.round(done / weekMods.length * 100) : 0;
          return `
            <div class="syl-group">
              <div class="syl-group-head" style="border-left-color:${color}">
                ${g.label
                  ? `<div class="syl-sec-title" style="color:${color}">${escapeHTML(g.label.title)}</div>
                     ${g.label.description ? `<div class="syl-sec-desc">${escapeHTML(g.label.description)}</div>` : ''}`
                  : `<div class="syl-sec-title" style="color:var(--text2)">Sin sección</div>`}
                <div class="syl-prog">
                  <span>${done}/${weekMods.length} módulos · ${pct}%</span>
                  <div class="prog-bar" style="width:120px"><div class="prog-fill" style="width:${pct}%;background:${color}"></div></div>
                </div>
              </div>
              <div class="syl-weeks">
                ${g.weeks.map(w => {
                  const wMods = mods.filter(m => m.week === w);
                  const wDone = wMods.filter(m => m.done).length;
                  const wStat = wMods.length === 0 ? 'empty'
                              : wDone === wMods.length ? 'complete'
                              : wDone > 0 ? 'partial' : 'pending';
                  const statColor = { complete: 'var(--acc2)', partial: 'var(--gold)', pending: 'var(--border)', empty: 'var(--border)' }[wStat];
                  return `<div class="syl-week">
                    <div class="syl-week-num" style="border-color:${statColor}">
                      <span>${w+1}</span>
                      ${wStat === 'complete' ? '✓' : wStat === 'partial' ? '◑' : ''}
                    </div>
                    <div class="syl-week-mods">
                      ${wMods.slice(0,4).map(m => `<div class="syl-mod-dot ${m.done ? 'done' : ''}" style="background:${typeColor(m.type, State.cur.color)}" title="${escapeHTML(m.title)}"></div>`).join('')}
                      ${wMods.length > 4 ? `<div class="syl-mod-more">+${wMods.length-4}</div>` : ''}
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;

    $('syl-manage-labels')?.addEventListener('click', () => this.showSyllabusModal());
  },

  // ── Syllabus label editor ──────────────────────
  showSyllabusModal() {
    // Deep-clone labels so edits don't mutate State until saved.
    const labels = (State.cur?.syllabusLabels || []).map(l => ({ ...l }));

    const renderRows = () => labels.map((l, i) => `
      <div class="syl-row" data-i="${i}">
        <div class="syl-row-fields">
          <input class="syl-inp syl-title" placeholder="Título de la sección" value="${escapeHTML(l.title || '')}">
          <input class="syl-inp syl-desc"  placeholder="Descripción (opcional)" value="${escapeHTML(l.description || '')}">
          <input type="number" class="syl-inp syl-sw" value="${(l.startWeek||0)+1}" min="1" style="width:70px" title="Semana inicio">
          <input type="number" class="syl-inp syl-ew" value="${(l.endWeek||0)+1}"   min="1" style="width:70px" title="Semana fin">
          <button type="button" class="btn btn-outline btn-sm syl-sheet-toggle" data-i="${i}" title="Abrir hoja de examen de esta sección">
            ${l.examsheetContent?.trim() ? '✏️ Editar Examsheet' : '📄 Open Examsheet'}
          </button>
          <button type="button" class="mod-action syl-del" data-i="${i}">×</button>
        </div>
        <div class="syl-sheet-panel" id="syl-sheet-${i}" style="display:none">
          <textarea class="syl-inp syl-sheet-content code" rows="8"
            placeholder="Pega aquí el contenido de referencia para el examen de esta sección (Markdown)…"
            style="width:100%;resize:vertical;font-family:monospace;font-size:12px;box-sizing:border-box"
          >${escapeHTML(l.examsheetContent || '')}</textarea>
          <p class="hint" style="margin:4px 0 0">Este contenido se inyecta automáticamente en los prompts de examen que cubran esta sección.</p>
        </div>
      </div>`).join('');

    showModal('📋 Secciones del sílabo', `
      <p class="hint" style="margin-bottom:12px">Agrupa semanas en secciones con título. Se muestran en la lista de módulos y en el sílabo.</p>
      <div id="syl-rows">${renderRows()}</div>
      <button type="button" class="btn btn-outline btn-sm" id="syl-add" style="margin-top:10px">＋ Añadir sección</button>
    `, async () => {
      const rows = document.querySelectorAll('.syl-row');
      const updated = [];
      rows.forEach(row => {
        const title = row.querySelector('.syl-title').value.trim();
        if (!title) return;
        updated.push({
          title,
          description:      row.querySelector('.syl-desc').value.trim(),
          startWeek:        parseInt(row.querySelector('.syl-sw').value) - 1 || 0,
          endWeek:          parseInt(row.querySelector('.syl-ew').value) - 1 || 0,
          examsheetContent: row.querySelector('.syl-sheet-content')?.value || '',
        });
      });
      await API.updateCourse(State.cur._id, { syllabusLabels: updated });
      State.cur.syllabusLabels = updated;
      toast('✅ Secciones guardadas');
      this.renderSyllabus();
      if (State.view === 'mod') this.renderModules();
    }, { wide: true });

    const wireAll = () => {
      // Delete buttons
      document.querySelectorAll('.syl-del').forEach(btn => {
        btn.addEventListener('click', () => {
          // Snapshot current textarea values before re-render.
          document.querySelectorAll('.syl-row').forEach(row => {
            const i = parseInt(row.dataset.i);
            if (!isNaN(i) && labels[i]) {
              const ta = row.querySelector('.syl-sheet-content');
              if (ta) labels[i].examsheetContent = ta.value;
              labels[i].title       = row.querySelector('.syl-title').value;
              labels[i].description = row.querySelector('.syl-desc').value;
              labels[i].startWeek   = parseInt(row.querySelector('.syl-sw').value) - 1 || 0;
              labels[i].endWeek     = parseInt(row.querySelector('.syl-ew').value) - 1 || 0;
            }
          });
          labels.splice(parseInt(btn.dataset.i), 1);
          document.getElementById('syl-rows').innerHTML = renderRows();
          wireAll();
        });
      });

      // Examsheet toggle buttons
      document.querySelectorAll('.syl-sheet-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const i     = parseInt(btn.dataset.i);
          const panel = document.getElementById(`syl-sheet-${i}`);
          if (!panel) return;
          const open = panel.style.display !== 'none';
          panel.style.display = open ? 'none' : 'block';
          btn.textContent = open
            ? (labels[i]?.examsheetContent?.trim() ? '✏️ Editar Examsheet' : '📄 Open Examsheet')
            : '🔼 Cerrar Examsheet';
          if (!open) panel.querySelector('textarea')?.focus();
        });
      });
    };

    document.getElementById('syl-add').addEventListener('click', () => {
      // Snapshot current values before pushing new row.
      document.querySelectorAll('.syl-row').forEach(row => {
        const i = parseInt(row.dataset.i);
        if (!isNaN(i) && labels[i]) {
          const ta = row.querySelector('.syl-sheet-content');
          if (ta) labels[i].examsheetContent = ta.value;
          labels[i].title       = row.querySelector('.syl-title').value;
          labels[i].description = row.querySelector('.syl-desc').value;
          labels[i].startWeek   = parseInt(row.querySelector('.syl-sw').value) - 1 || 0;
          labels[i].endWeek     = parseInt(row.querySelector('.syl-ew').value) - 1 || 0;
        }
      });
      labels.push({ title: '', description: '', startWeek: 0, endWeek: 0, examsheetContent: '' });
      document.getElementById('syl-rows').innerHTML = renderRows();
      wireAll();
    });

    wireAll();
  },

  // ── Create course ──────────────────────────────
  showCreate() {
    let selColor = COLORS[0];
    showModal('✨ Nuevo Curso', `
      <div class="fg"><label>Título</label><input id="nc-t" placeholder="ej. Marketing Digital"></div>
      <div class="fg"><label>Emoji</label><input id="nc-e" placeholder="🎯" style="width:90px"></div>
      <div class="fg"><label>Descripción</label><textarea id="nc-d" rows="2"></textarea></div>
      <div class="fg"><label>Color</label><div class="swatch-row" id="nc-cr"></div></div>
      <div class="fg">
        <label>Página oficial (opcional, para favicon)</label>
        <input id="nc-url" placeholder="https://platform.example.com">
      </div>
      <div class="fg"><label>Fecha de inicio</label><input type="date" id="nc-dt" value="${new Date().toISOString().split('T')[0]}"></div>
    `, async () => {
      const title = $val('nc-t').trim();
      if (!title) { toast('Ingresa un título'); return false; }
      const c = await API.createCourse({
        title, emoji: $val('nc-e') || '📚', description: $val('nc-d'),
        color: selColor, startDate: $val('nc-dt') || new Date(),
        homepageUrl: $val('nc-url').trim(),
        background: { type: 'color', value: '#f5f0e8' },
      });
      toast('✅ Creado');
      await this.loadList();
      this.open(c._id);
    });
    buildSwatches('nc-cr', COLORS, selColor, c => selColor = c);
  },

  // ── Course settings ────────────────────────────
  showSettings() {
    if (!State.cur) return;
    let selColor = State.cur.color;
    showModal('⚙️ Curso', `
      <div class="fg"><label>Título</label><input id="st-t" value="${escapeHTML(State.cur.title)}"></div>
      <div class="fg"><label>Emoji</label><input id="st-e" value="${State.cur.emoji}" style="width:90px"></div>
      <div class="fg"><label>Color</label><div class="swatch-row" id="st-cr"></div></div>
      <div class="fg"><label>Descripción</label><textarea id="st-d" rows="2">${escapeHTML(State.cur.description || '')}</textarea></div>
      <div class="fg">
        <label>Página oficial (opcional, para favicon)</label>
        <input id="st-url" value="${escapeHTML(State.cur.homepageUrl || '')}" placeholder="https://platform.example.com">
      </div>
      <div class="row-2">
        <div class="fg"><label>Fecha de inicio</label><input type="date" id="st-dt" value="${new Date(State.cur.startDate).toISOString().split('T')[0]}"></div>
        <div class="fg"><label>Fecha de fin (opcional)</label><input type="date" id="st-end" value="${State.cur.endDate ? new Date(State.cur.endDate).toISOString().split('T')[0] : ''}"></div>
      </div>
      <div style="margin-top:12px">
        <button type="button" class="btn btn-outline btn-sm" id="st-edit-syllabus">📋 Editar secciones del sílabo (${(State.cur.syllabusLabels||[]).length})</button>
      </div>
    `, async () => {
      const updated = await API.updateCourse(State.cur._id, {
        title:       $val('st-t') || State.cur.title,
        emoji:       $val('st-e') || State.cur.emoji,
        color:       selColor,
        description: $val('st-d'),
        homepageUrl: $val('st-url').trim(),
        startDate:   $val('st-dt'),
        endDate:     $val('st-end') || null,
      });
      State.cur = updated;
      $('cv-title').innerHTML = `${updated.emoji} ${escapeHTML(updated.title)}`;
      this.renderSidebar();
      Calendar.render();
      toast('✅ Guardado');
    }, {
      extraButtons: `
        <div class="course-status-row">
          ${this.isActiveCourse(State.cur)
            ? `<button class="btn btn-outline btn-sm" id="btn-finish-course"  title="Marca el curso como terminado">✓ Terminar</button>
               <button class="btn btn-outline btn-sm" id="btn-cancel-course"  title="Marca el curso como cancelado">✕ Cancelar</button>`
            : `<button class="btn btn-outline btn-sm" id="btn-reactivate-course" title="Devuelve el curso a activos">↻ Reactivar</button>`
          }
          <button class="btn btn-danger btn-sm" id="btn-del-course" title="Eliminar permanentemente">🗑 Eliminar</button>
        </div>`,
    });
    buildSwatches('st-cr', COLORS, selColor, c => selColor = c);

    const setStatus = async (status, label) => {
      try {
        const c = await API.setCourseStatus(State.cur._id, status);
        State.cur = c;
        toast(label);
        closeModal();
        await this.loadList();
        if (status === 'active') this.open(c._id);
        else                     this.showHome();
      } catch (err) { toast('❌ ' + err.message); }
    };
    document.getElementById('btn-finish-course')?.addEventListener('click', () => setStatus('finished',  '✓ Curso terminado'));
    document.getElementById('btn-cancel-course')?.addEventListener('click', () => setStatus('cancelled', '✕ Curso cancelado'));
    document.getElementById('btn-reactivate-course')?.addEventListener('click', () => setStatus('active', '↻ Reactivado'));
    document.getElementById('btn-del-course')?.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${State.cur.title}"? Esta acción no se puede deshacer.`)) return;
      try { await API.deleteCourse(State.cur._id); toast('Eliminado'); closeModal(); this.showHome(); }
      catch (err) { toast('❌ ' + err.message); }
    });
    document.getElementById('st-edit-syllabus')?.addEventListener('click', () => {
      closeModal();
      this.showSyllabusModal();
    });
  },

  // ── Duplicate modal ────────────────────────────
  showDuplicateModal(m) {
    const dayOpts = DAYS_FULL.map((d, i) =>
      `<option value="${i}" ${i === m.dayOfWeek ? 'selected' : ''}>${d}</option>`
    ).join('');
    showModal('⎘ Duplicar módulo', `
      <p class="hint" style="margin-bottom:12px">"${escapeHTML(m.title)}" se copiará a otra fecha.</p>
      <div class="row-2">
        <div class="fg"><label>Día</label><select id="dup-day">${dayOpts}</select></div>
        <div class="fg"><label>Semana</label><input type="number" id="dup-week" value="${m.week + 1}" min="1" max="52"></div>
      </div>
    `, async () => {
      const week      = parseInt($val('dup-week')) - 1;
      const dayOfWeek = parseInt($val('dup-day'));
      const dup = await API.duplicateModule(m._id, { week, dayOfWeek });
      State.curModules.push(dup);
      toast('⎘ Duplicado');
      Calendar.render();
      if (State.view === 'mod') this.renderModules();
    });
  },

  // ── Edit module modal ──────────────────────────
  showEditModule(m) {
    const dayOpts = DAYS_FULL.map((d, i) =>
      `<option value="${i}" ${i === m.dayOfWeek ? 'selected' : ''}>${d}</option>`
    ).join('');
    let extra = '';
    if (m.type === 'text') {
      extra = `<div class="fg"><label>Contenido (Markdown)</label><textarea id="ed-text" class="code" rows="6">${escapeHTML(m.textContent || '')}</textarea></div>`;
    } else if (m.type === 'ai-exam') {
      extra = Exams.editFormHTML(m);
    } else if (m.url) {
      extra = `<div class="fg"><label>URL</label><input id="ed-url" value="${escapeHTML(m.url)}"></div>`;
    }
    showModal('✎ Editar módulo', `
      <div class="fg"><label>Título</label><input id="ed-title" value="${escapeHTML(m.title)}"></div>
      ${extra}
      <div class="row-2">
        <div class="fg"><label>Día</label><select id="ed-day">${dayOpts}</select></div>
        <div class="fg"><label>Semana</label><input type="number" id="ed-week" value="${m.week + 1}" min="1" max="52"></div>
      </div>
    `, async () => {
      const data = {
        title:     $val('ed-title') || m.title,
        dayOfWeek: parseInt($val('ed-day')),
        week:      parseInt($val('ed-week')) - 1,
      };
      if (m.type === 'text')    data.textContent = $val('ed-text');
      if (m.type === 'ai-exam') data.examConfig  = Exams.readEditForm();
      if (!['text','ai-exam'].includes(m.type) && $val('ed-url') !== undefined) data.url = $val('ed-url');
      await API.updateModule(m._id, data);
      Object.assign(m, data);
      toast('✅ Guardado');
      Calendar.render();
      if (State.view === 'mod') this.renderModules();
    });
  },

  // ── Add module modal ───────────────────────────
  showAddModule(preDay = 0, preWeek = 0) {
    this.curMtype = 'youtube';
    showModal('📦 Agregar Módulo', `
      <div class="mtype-tabs row6">
        <button class="mtype-btn on" data-mtype="youtube"><span class="mtype-icon">▶️</span>YouTube</button>
        <button class="mtype-btn"    data-mtype="spotify"><span class="mtype-icon">🎵</span>Spotify</button>
        <button class="mtype-btn"    data-mtype="web"><span class="mtype-icon">🌐</span>Web</button>
        <button class="mtype-btn"    data-mtype="text"><span class="mtype-icon">📄</span>Texto</button>
        <button class="mtype-btn"    data-mtype="ai-exam"><span class="mtype-icon">🧠</span>Examen IA</button>
        <button class="mtype-btn"    data-mtype="bulk"><span class="mtype-icon">📋</span>Importar</button>
      </div>
      <div id="mtype-form"></div>
    `, () => this.saveModule(), { wide: true });

    document.querySelectorAll('.mtype-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.curMtype = btn.dataset.mtype;
        document.querySelectorAll('.mtype-btn').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        this.renderMtypeForm(preDay, preWeek);
      });
    });
    this.renderMtypeForm(preDay, preWeek);
  },

  recurrenceBlockHTML() {
    return `
      <div class="recur-block">
        <label class="recur-toggle">
          <input type="checkbox" id="mod-recur"> Repetir en varios días / semanas
        </label>
        <div id="mod-recur-fields" style="display:none;margin-top:8px">
          <label>Días recurrentes</label>
          <div class="day-picker" id="mod-recur-days"></div>
          <div class="row-2" style="margin-top:8px">
            <div class="fg">
              <label>Durante (semanas)</label>
              <input type="number" id="mod-recur-weeks" value="4" min="1" max="52">
            </div>
            <div class="fg" style="display:flex;align-items:end">
              <span class="hint" id="mod-recur-summary"></span>
            </div>
          </div>
        </div>
      </div>`;
  },

  wireRecurrence(preDay) {
    const cb     = $('mod-recur');
    const fields = $('mod-recur-fields');
    if (!cb || !fields) return;
    cb.addEventListener('change', () => {
      fields.style.display = cb.checked ? 'block' : 'none';
      if (cb.checked && !this.recurDayPicker) {
        this.recurDayPicker = buildDayPicker('mod-recur-days', [preDay]);
        // Update summary whenever a day pill toggles
        $('mod-recur-days')?.addEventListener('click', e => {
          if (e.target.classList?.contains('day-pill')) {
            // The pill's click handler in buildDayPicker runs first; let it
            // update internal state before we read it.
            setTimeout(() => this.updateRecurSummary(), 0);
          }
        });
      }
      this.updateRecurSummary();
    });
    $('mod-recur-weeks')?.addEventListener('input', () => this.updateRecurSummary());
  },

  updateRecurSummary() {
    const el = $('mod-recur-summary');
    if (!el || !this.recurDayPicker) return;
    const days = this.recurDayPicker();
    const wks  = Math.max(1, parseInt($val('mod-recur-weeks')) || 0);
    const tot  = days.length * wks;
    el.textContent = `${tot} módulo${tot === 1 ? '' : 's'} (${days.length} día/s × ${wks} sem)`;
  },

  renderMtypeForm(preDay, preWeek) {
    const dayOpts = DAYS_FULL.map((d, i) => `<option value="${i}" ${i === preDay ? 'selected' : ''}>${d}</option>`).join('');
    const weekUI  = preWeek + 1;
    let html = '';
    this.recurDayPicker = null;

    if (['youtube','spotify','web'].includes(this.curMtype)) {
      const ph = {
        youtube: 'https://www.youtube.com/watch?v=…',
        spotify: 'https://open.spotify.com/episode/… o /track/… o /show/…',
        web:     'https://…',
      }[this.curMtype];
      html = `
        <div class="fg"><label>Título</label><input id="mod-title" placeholder="ej. Clase 1"></div>
        <div class="fg"><label>URL</label><input id="mod-url" placeholder="${ph}"></div>
        <div class="row-2">
          <div class="fg"><label>Día</label><select id="mod-day">${dayOpts}</select></div>
          <div class="fg"><label>Semana</label><input type="number" id="mod-week" value="${weekUI}" min="1" max="52"></div>
        </div>
        ${this.recurrenceBlockHTML()}
        ${this.curMtype === 'web' ? '<p class="hint">Si el sitio no permite embed, se guarda automáticamente como link con favicon.</p>' : ''}`;
    } else if (this.curMtype === 'text') {
      html = `
        <div class="fg"><label>Título</label><input id="mod-title" placeholder="ej. Instrucciones de la semana"></div>
        <div class="fg"><label>Contenido (Markdown)</label><textarea id="mod-text" class="code" rows="8" placeholder="# Título\n\nEscribe aquí las instrucciones…"></textarea></div>
        <div class="row-2">
          <div class="fg"><label>Día</label><select id="mod-day">${dayOpts}</select></div>
          <div class="fg"><label>Semana</label><input type="number" id="mod-week" value="${weekUI}" min="1" max="52"></div>
        </div>
        ${this.recurrenceBlockHTML()}`;
    } else if (this.curMtype === 'ai-exam') {
      html = `
        <div class="fg"><label>Título del examen</label><input id="mod-title" placeholder="Examen 1: Fundamentos"></div>
        ${Exams.newFormHTML()}
        <div class="row-2">
          <div class="fg"><label>Día</label><select id="mod-day">${dayOpts}</select></div>
          <div class="fg"><label>Semana</label><input type="number" id="mod-week" value="${weekUI}" min="1" max="52"></div>
        </div>
        ${this.recurrenceBlockHTML()}`;
    } else if (this.curMtype === 'bulk') {
      const cap    = State.capabilities;
      const ytSt   = cap.ytdlp   ? '<span class="status-pill ok">yt-dlp ✓</span>'   : '<span class="status-pill no">yt-dlp ✗</span>';
      const spSt   = cap.spotify ? '<span class="status-pill ok">Spotify ✓</span>'  : '<span class="status-pill no">Spotify ✗</span>';
      html = `
        <div class="row-2">
          <div class="fg">
            <label>Tipo</label>
            <select id="bulk-type">
              <option value="youtube">YouTube — playlist</option>
              <option value="spotify">Spotify — show/playlist</option>
            </select>
            <p class="hint" style="margin-top:6px">${ytSt} ${spSt}</p>
          </div>
          <div class="fg"><label>URL</label><input id="bulk-url" placeholder="https://…"></div>
        </div>
        <div class="fg">
          <label>Días de la semana (uno o varios)</label>
          <div class="day-picker" id="bulk-days"></div>
          <p class="hint" style="margin-top:6px">Con Lun y Jue: items 1,2 → semana 1; items 3,4 → semana 2, etc.</p>
        </div>
        <div class="row-2">
          <div class="fg">
            <label>Orden</label>
            <select id="bulk-ord">
              <option value="oldest">Más antiguos primero</option>
              <option value="newest">Más nuevos primero</option>
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
            </select>
          </div>
          <div class="fg"><label>Máximo de items</label><input type="number" id="bulk-limit" value="20" min="1" max="50"></div>
        </div>
        <div class="row-2">
          <div class="fg"><label><input type="checkbox" id="bulk-incremental" checked> Incrementar semanas automáticamente</label></div>
          <div class="fg"><label>Semana inicial</label><input type="number" id="bulk-startweek" value="${weekUI}" min="1"></div>
        </div>`;
    }

    $('mtype-form').innerHTML = html;
    if (this.curMtype === 'bulk') {
      this.bulkDayPicker = buildDayPicker('bulk-days', [preDay]);
    } else {
      this.wireRecurrence(preDay);
    }
  },

  async saveModule() {
    if (this.curMtype === 'bulk') return this.saveBulk();
    const title = $val('mod-title').trim();
    if (!title) { toast('Falta título'); return false; }

    const base = {
      title,
      type: this.curMtype,
    };

    if (this.curMtype === 'text') {
      base.textContent = $val('mod-text');
    } else if (this.curMtype === 'ai-exam') {
      base.examConfig = Exams.readNewForm();
      base.url = '';
      if (!base.examConfig.prompt) { toast('Falta el prompt del examen'); return false; }
    } else {
      const url = $val('mod-url').trim();
      if (!url) { toast('Falta URL'); return false; }
      base.url = url;
    }

    // Build the list of (week, dayOfWeek) slots: either single or recurring.
    const recurOn = $checked('mod-recur') && this.recurDayPicker;
    let slots;
    if (recurOn) {
      const days = this.recurDayPicker();
      if (!days.length) { toast('Elige al menos un día para repetir'); return false; }
      const weeks    = Math.max(1, parseInt($val('mod-recur-weeks')) || 1);
      const startWk  = parseInt($val('mod-week') || '1') - 1;
      slots = [];
      for (let w = 0; w < weeks; w++) for (const d of days) {
        slots.push({ week: startWk + w, dayOfWeek: d });
      }
    } else {
      slots = [{
        week:      parseInt($val('mod-week') || '1') - 1,
        dayOfWeek: parseInt($val('mod-day')  || '0'),
      }];
    }

    try {
      if (slots.length > 1) toast(`⏳ Creando ${slots.length} módulos…`, 4000);
      const created = await Promise.all(
        slots.map(slot => API.createModule(State.cur._id, { ...base, ...slot }))
      );
      State.curModules.push(...created);
      const anyLink = created.some(m => m.type === 'web-link');
      toast(
        slots.length === 1
          ? (anyLink ? '🔗 Sitio no embebible — guardado como link' : '✅ Agregado')
          : `✅ ${created.length} módulos creados`
      );
      Calendar.render();
      if (State.view === 'mod') this.renderModules();
      this.loadList();
    } catch (err) { toast('❌ ' + err.message); return false; }
  },

  async saveBulk() {
    const url = $val('bulk-url').trim();
    if (!url) { toast('Falta URL'); return false; }
    const type       = $val('bulk-type');
    const daysOfWeek = this.bulkDayPicker ? this.bulkDayPicker() : [0];
    if (!daysOfWeek.length) { toast('Elige al menos un día'); return false; }

    try {
      toast('⏳ Resolviendo items reales…', 8000);
      const created = await API.bulkModules(State.cur._id, {
        type, url,
        daysOfWeek,
        order:            $val('bulk-ord'),
        limit:            parseInt($val('bulk-limit')) || 20,
        startWeek:        parseInt($val('bulk-startweek')) - 1,
        incrementalWeeks: $checked('bulk-incremental'),
        fetchReal:        true,
      });
      State.curModules.push(...created);
      toast(`✅ ${created.length} módulos creados`);
      Calendar.render();
      if (State.view === 'mod') this.renderModules();
      this.loadList();
    } catch (err) { toast('❌ ' + err.message); return false; }
  },

  init() {
    $('btn-new-course').addEventListener('click', () => this.showCreate());
    $('hero-cta').addEventListener('click', () => this.showCreate());
    $('hero-cta-external').addEventListener('click', () => Externals.showCreate());
    $('hero-cta-ghost')?.addEventListener('click', () => Ghosts.showCreate());
    $('nav-new').addEventListener('click', () => this.showCreate());
    $('nav-new-external').addEventListener('click', () => Externals.showCreate());
    $('nav-home').addEventListener('click', () => this.showHome());
    $('cv-back').addEventListener('click', () => this.showHome());
    $('cv-add-module').addEventListener('click', () => this.showAddModule());
    $('cv-settings').addEventListener('click', () => this.showSettings());
    document.querySelectorAll('.vbtn').forEach(b => {
      b.addEventListener('click', () => this.switchView(b.dataset.view));
    });
  },
};
