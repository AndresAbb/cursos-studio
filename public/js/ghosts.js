// Ghost courses + home cronograma (week/month timeline of real & planned courses).
const Ghosts = {
  // ── Data load ──────────────────────────────────
  async loadList() {
    try {
      State.ghosts = await API.listGhosts();
    } catch (err) {
      State.ghosts = [];
      console.warn('Ghosts load failed:', err.message);
    }
  },

  // ── Cronograma scale / pan ─────────────────────
  setScale(scale) {
    if (scale !== 'weeks' && scale !== 'months') return;
    State.cronoScale = scale;
    State.cronoOff   = 0;
    this.render();
  },
  pan(delta) { State.cronoOff += delta; this.render(); },
  goToday()  { State.cronoOff = 0;     this.render(); },

  // ── Time-axis units ────────────────────────────
  // Build a horizontal axis of N "buckets" starting from a base date.
  // weeks: 8 weeks visible, starting at Monday of (today + cronoOff weeks)
  // months: 6 months visible, starting at month of (today + cronoOff months)
  buildAxis() {
    const today = new Date(); today.setHours(0,0,0,0);
    if (State.cronoScale === 'weeks') {
      const COUNT = 10;
      // Anchor: 2 weeks before today so historical bars peek in, plus user pan offset.
      const start = getWeekStart(State.cronoOff - 2);
      const buckets = [];
      for (let i = 0; i < COUNT; i++) {
        const a = new Date(start); a.setDate(start.getDate() + i * 7);
        const b = new Date(a);     b.setDate(a.getDate() + 6); b.setHours(23,59,59,999);
        buckets.push({
          start: a, end: b,
          label: `${a.toLocaleDateString('es-ES',{day:'numeric',month:'short'})}`,
          sub:   b.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          isCurrent: today >= a && today <= b,
        });
      }
      return buckets;
    }
    // months — show 1 month back + current + 4 ahead = 6 total
    const COUNT = 6;
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + State.cronoOff - 1);
    base.setHours(0,0,0,0);
    const buckets = [];
    for (let i = 0; i < COUNT; i++) {
      const a = new Date(base.getFullYear(), base.getMonth() + i,     1);
      const b = new Date(base.getFullYear(), base.getMonth() + i + 1, 0, 23,59,59,999);
      buckets.push({
        start: a, end: b,
        label: a.toLocaleDateString('es-ES', { month: 'long' }),
        sub:   String(a.getFullYear()),
        isCurrent: today >= a && today <= b,
      });
    }
    return buckets;
  },

  isoWeek(d) {
    const date = new Date(d.valueOf());
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day + 3);
    const firstThursday = new Date(date.getFullYear(), 0, 4);
    const diff = (date - firstThursday) / 86400000;
    return 1 + Math.round(diff / 7);
  },

  // Estimate end date of a course bar on the cronograma. For active courses
  // we always extend at least 4 weeks past today so they show as "in progress"
  // even when their nominal duration would have ended already.
  courseEndDate(c) {
    const cs = new Date(c.startDate); cs.setHours(0,0,0,0);
    const dow = cs.getDay();
    const diff = (dow === 0 ? -6 : 1) - dow;
    const mon = new Date(cs); mon.setDate(cs.getDate() + diff);

    const nominalWeeks = Math.max(4, Math.ceil((c.totalModules || 12) / 3));
    const nominalEnd = new Date(mon); nominalEnd.setDate(mon.getDate() + nominalWeeks * 7);

    const today = new Date(); today.setHours(0,0,0,0);
    const status = c.status || 'active';
    if (status !== 'active') return nominalEnd;

    // Active: ensure the bar reaches at least 4 weeks into the future.
    const minEnd = new Date(today); minEnd.setDate(today.getDate() + 28);
    return nominalEnd > minEnd ? nominalEnd : minEnd;
  },

  ghostEndDate(g) {
    const s = new Date(g.plannedStartDate); s.setHours(0,0,0,0);
    const e = new Date(s); e.setDate(s.getDate() + (g.durationWeeks || 4) * 7);
    return e;
  },

  // ── Render ─────────────────────────────────────
  render() {
    const el = $('crono-body');
    if (!el) return;
    const buckets = this.buildAxis();

    // Range of the whole axis (for bar positioning)
    const axisStart = buckets[0].start;
    const axisEnd   = buckets[buckets.length - 1].end;
    const axisMs    = Math.max(1, axisEnd - axisStart);

    // Header row (date scale)
    const headerCols = buckets.map(b => `
      <div class="crono-col ${b.isCurrent ? 'cur' : ''}">
        <div class="crono-col-lbl">${escapeHTML(b.label)}</div>
        <div class="crono-col-sub">${escapeHTML(b.sub)}</div>
      </div>`).join('');

    // "Today" indicator vertical line position (% across axis)
    const today = new Date();
    let todayPct = -1;
    if (today >= axisStart && today <= axisEnd) {
      todayPct = ((today - axisStart) / axisMs) * 100;
    }

    // Real courses (active only — keep noise low)
    const realRows = (State.courses || [])
      .filter(c => (c.status || 'active') === 'active')
      .map(c => this.barRow({
        title: c.title, emoji: c.emoji, color: c.color, favicon: c.favicon,
        start: new Date(c.startDate),
        end:   this.courseEndDate(c),
        kind: 'course', id: c._id,
        meta: `${c.totalModules || 0} módulos`,
      }, axisStart, axisEnd, axisMs, todayPct));

    // Ghost courses
    const ghostRows = (State.ghosts || [])
      .filter(g => g.status === 'planned')
      .map(g => this.barRow({
        title: g.title, emoji: g.emoji, color: g.color,
        start: new Date(g.plannedStartDate),
        end:   this.ghostEndDate(g),
        kind: 'ghost', id: g._id,
        meta: `${g.durationWeeks} sem · planificado`,
      }, axisStart, axisEnd, axisMs, todayPct));

    const totalRows = realRows.filter(Boolean).length + ghostRows.filter(Boolean).length;

    el.innerHTML = `
      <div class="crono-axis">
        <div class="crono-axis-spacer"></div>
        <div class="crono-axis-buckets">
          ${buckets.map(b => `
            <div class="crono-bucket ${b.isCurrent ? 'cur' : ''}">
              <div class="crono-bucket-lbl">${escapeHTML(b.label)}</div>
              <div class="crono-bucket-sub">${escapeHTML(b.sub)}</div>
              ${b.isCurrent ? '<div class="crono-bucket-now">hoy</div>' : ''}
            </div>`).join('')}
        </div>
      </div>

      <div class="crono-rows">
        ${totalRows === 0
          ? `<div class="crono-empty">
               <div class="crono-empty-icon">📅</div>
               <div class="crono-empty-title">Sin cursos en este rango</div>
               <div class="crono-empty-sub">Crea un curso real o un fantasma para verlo aquí.</div>
             </div>`
          : (realRows.join('') + ghostRows.join(''))}
      </div>

      <div class="crono-foot">
        <button class="btn btn-outline btn-sm" id="crono-add-ghost">＋ Curso fantasma</button>
        <span class="hint">Los fantasmas son cursos planificados — promuévelos a reales cuando empieces.</span>
      </div>`;

    // Wire row interactions
    el.querySelectorAll('.crono-bar[data-kind="course"]').forEach(b => {
      b.addEventListener('click', () => Course.open(b.dataset.id));
    });
    el.querySelectorAll('.crono-bar[data-kind="ghost"]').forEach(b => {
      b.addEventListener('click', () => this.showEdit(b.dataset.id));
    });
    $('crono-add-ghost')?.addEventListener('click', () => this.showCreate());
  },

  barRow(item, axisStart, axisEnd, axisMs, todayPct) {
    // Clip the bar to the visible range
    const s  = Math.max(item.start.getTime(), axisStart.getTime());
    const e  = Math.min(item.end.getTime(),   axisEnd.getTime());
    if (e < axisStart.getTime() || s > axisEnd.getTime()) return ''; // off-screen
    const left  = ((s - axisStart.getTime()) / axisMs) * 100;
    const width = Math.max(2, ((e - s) / axisMs) * 100);
    const isGhost = item.kind === 'ghost';
    const lead = item.favicon
      ? `<img class="crono-fav" src="${item.favicon}" alt="">`
      : (item.emoji || (isGhost ? '🌱' : '📚'));
    const todayMark = todayPct >= 0
      ? `<div class="crono-row-today" style="left:${todayPct}%"></div>`
      : '';
    return `
      <div class="crono-row">
        <div class="crono-rowhead">
          <span class="crono-rowhead-lead">${lead}</span>
          <span class="crono-rowhead-title">${escapeHTML(item.title)}</span>
          ${isGhost ? '<span class="crono-pill ghost-pill">Planificado</span>' : ''}
        </div>
        <div class="crono-rowtrack">
          ${todayMark}
          <div class="crono-bar ${isGhost ? 'ghost' : ''}"
               data-kind="${item.kind}" data-id="${item.id}"
               style="left:${left}%;width:${width}%;--bar-color:${item.color}"
               title="${escapeHTML(item.title)} · ${escapeHTML(item.meta || '')}">
            <span class="crono-bar-label">${escapeHTML(item.title)}</span>
          </div>
        </div>
      </div>`;
  },

  // ── Create / Edit ghost ────────────────────────
  showCreate(preset = {}) {
    let selColor = preset.color || COLORS[6];
    const today = new Date(); today.setDate(today.getDate() + 14);
    const iso = today.toISOString().split('T')[0];
    showModal('🌱 Curso fantasma', `
      <p class="hint" style="margin-bottom:12px">Un esbozo de un curso futuro — sin módulos. Lo promueves cuando estés listo.</p>
      <div class="fg"><label>Título</label><input id="gh-t" placeholder="ej. Fundamentos de UX"></div>
      <div class="fg"><label>Emoji</label><input id="gh-e" value="🌱" style="width:90px"></div>
      <div class="fg"><label>Color</label><div class="swatch-row" id="gh-cr"></div></div>
      <div class="row-2">
        <div class="fg"><label>Inicio planificado</label><input type="date" id="gh-dt" value="${iso}"></div>
        <div class="fg"><label>Duración (semanas)</label><input type="number" id="gh-dur" value="6" min="1" max="52"></div>
      </div>
      <div class="fg"><label>Notas</label><textarea id="gh-notes" rows="3" placeholder="Por qué quiero hacerlo, qué espero aprender…"></textarea></div>
    `, async () => {
      const title = $val('gh-t').trim();
      if (!title) { toast('Falta título'); return false; }
      await API.createGhost({
        title,
        emoji:            $val('gh-e') || '🌱',
        color:            selColor,
        plannedStartDate: $val('gh-dt'),
        durationWeeks:    Math.max(1, parseInt($val('gh-dur')) || 4),
        notes:            $val('gh-notes'),
      });
      await this.loadList();
      this.render();
      toast('🌱 Plan creado');
    });
    buildSwatches('gh-cr', COLORS, selColor, c => selColor = c);
  },

  showEdit(id) {
    const g = State.ghosts.find(x => x._id === id);
    if (!g) return;
    let selColor = g.color;
    const iso = new Date(g.plannedStartDate).toISOString().split('T')[0];
    showModal('🌱 Editar plan', `
      <div class="fg"><label>Título</label><input id="gh-t" value="${escapeHTML(g.title)}"></div>
      <div class="fg"><label>Emoji</label><input id="gh-e" value="${escapeHTML(g.emoji || '🌱')}" style="width:90px"></div>
      <div class="fg"><label>Color</label><div class="swatch-row" id="gh-cr"></div></div>
      <div class="row-2">
        <div class="fg"><label>Inicio planificado</label><input type="date" id="gh-dt" value="${iso}"></div>
        <div class="fg"><label>Duración (semanas)</label><input type="number" id="gh-dur" value="${g.durationWeeks}" min="1" max="52"></div>
      </div>
      <div class="fg"><label>Notas</label><textarea id="gh-notes" rows="3">${escapeHTML(g.notes || '')}</textarea></div>
    `, async () => {
      const title = $val('gh-t').trim();
      if (!title) { toast('Falta título'); return false; }
      await API.updateGhost(g._id, {
        title,
        emoji:            $val('gh-e') || '🌱',
        color:            selColor,
        plannedStartDate: $val('gh-dt'),
        durationWeeks:    Math.max(1, parseInt($val('gh-dur')) || 4),
        notes:            $val('gh-notes'),
      });
      await this.loadList();
      this.render();
      toast('✅ Plan actualizado');
    }, {
      extraButtons: `
        <button class="btn btn-outline btn-sm" id="gh-promote" title="Crea el curso real ahora">✨ Promover a curso</button>
        <button class="btn btn-danger  btn-sm" id="gh-del"     title="Eliminar plan">🗑 Eliminar</button>`,
    });
    buildSwatches('gh-cr', COLORS, selColor, c => selColor = c);

    document.getElementById('gh-promote')?.addEventListener('click', async () => {
      if (!confirm(`Crear el curso "${g.title}" ahora?`)) return;
      try {
        const { course } = await API.promoteGhost(g._id);
        toast('✨ Promovido a curso real');
        closeModal();
        await this.loadList();
        await Course.loadList();
        this.render();
        if (course?._id) Course.open(course._id);
      } catch (err) { toast('❌ ' + err.message); }
    });
    document.getElementById('gh-del')?.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar el plan "${g.title}"?`)) return;
      try {
        await API.deleteGhost(g._id);
        toast('🗑 Eliminado');
        closeModal();
        await this.loadList();
        this.render();
      } catch (err) { toast('❌ ' + err.message); }
    });
  },

  // ── Init / wiring ──────────────────────────────
  init() {
    // Scale toggle (delegated since header is rendered by React on first mount)
    document.addEventListener('click', e => {
      const btn = e.target.closest('.crono-scale-btn');
      if (!btn) return;
      document.querySelectorAll('.crono-scale-btn').forEach(b => b.classList.toggle('on', b === btn));
      this.setScale(btn.dataset.scale);
    });
    $('crono-prev')?.addEventListener('click', () => this.pan(-1));
    $('crono-next')?.addEventListener('click', () => this.pan(1));
    $('crono-today')?.addEventListener('click', () => this.goToday());
  },
};
