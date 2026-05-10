const Externals = {
  dayPicker: null,

  renderCards() {
    const el = $('externals-grid');
    if (!State.externals.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon">🌐</div>Sin cursos externos.<br><span class="hint">Útil para clases en plataformas como Coursera, Udemy, Zoom o Google Classroom.</span></div>`;
      return;
    }
    el.innerHTML = State.externals.map(e => `
      <div class="course-card" data-eid="${e._id}">
        <div class="cc-header" style="background:${e.color}18">
          ${e.favicon ? `<img src="${e.favicon}" style="width:40px;height:40px;border-radius:6px">` : (e.emoji || '🌐')}
        </div>
        <div class="cc-body">
          <div class="cc-title">${escapeHTML(e.title)}</div>
          <div class="cc-meta">${e.daysOfWeek.length ? e.daysOfWeek.map(d => DAYS_SHORT[d]).join(' · ') : 'sin día fijo'}${e.timeOfDay ? ' · ' + e.timeOfDay : ''}</div>
          <div class="cc-meta" style="font-size:11px;margin-top:2px;color:var(--text2)">${escapeHTML(e.domain || '')}</div>
        </div>
      </div>
    `).join('');
    el.querySelectorAll('.course-card').forEach(card => {
      card.addEventListener('click', () => this.openEditor(card.dataset.eid));
    });
  },

  showCreate() {
    let selColor = '#5b4a8a';
    showModal('🌐 Nuevo Curso Externo', `
      <p class="hint">Para clases que viven en otra plataforma (Zoom, Classroom, Coursera, etc.) y solo necesitas un enlace recurrente.</p>
      <div class="row-2">
        <div class="fg" style="flex:2"><label>Título</label><input id="ext-t" placeholder="ej. Cálculo II"></div>
        <div class="fg" style="flex:0 0 90px"><label>Emoji</label><input id="ext-e" placeholder="🌐" value="🌐" style="width:80px"></div>
      </div>
      <div class="fg"><label>Color</label><div class="swatch-row" id="ext-cr"></div></div>
      <div class="fg"><label>URL</label><input id="ext-u" placeholder="https://meet.google.com/… o https://classroom.…"></div>
      <div class="fg">
        <label>Días recurrentes</label>
        <div class="day-picker" id="ext-days"></div>
      </div>
      <div class="row-2">
        <div class="fg"><label>Hora (opcional)</label><input type="time" id="ext-time"></div>
        <div class="fg"><label>Inicio</label><input type="date" id="ext-start" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="fg"><label>Fin (opcional)</label><input type="date" id="ext-end"></div>
      </div>
      <div class="fg"><label>Notas</label><textarea id="ext-n" rows="2" placeholder="opcional"></textarea></div>
    `, async () => {
      const title = $val('ext-t').trim();
      const url = $val('ext-u').trim();
      if (!title || !url) { toast('Faltan título o URL'); return false; }
      const days = this.dayPicker();
      const data = {
        title, url,
        emoji: $val('ext-e') || '🌐',
        color: selColor,
        daysOfWeek: days,
        timeOfDay: $val('ext-time'),
        startDate: $val('ext-start') || new Date(),
        endDate: $val('ext-end') || null,
        notes: $val('ext-n'),
      };
      await API.createExternal(data);
      toast('✅ Externo creado');
      State.externals = await API.listExternals();
      this.renderCards();
      Course.renderSidebar();
    });
    buildSwatches('ext-cr', COLORS, selColor, c => selColor = c);
    this.dayPicker = buildDayPicker('ext-days', []);
  },

  openEditor(id) {
    const e = State.externals.find(x => x._id === id);
    if (!e) return;
    let selColor = e.color;
    showModal('✏️ Editar curso externo', `
      <div class="row-2">
        <div class="fg" style="flex:2"><label>Título</label><input id="ext-t" value="${escapeHTML(e.title)}"></div>
        <div class="fg" style="flex:0 0 90px"><label>Emoji</label><input id="ext-e" value="${e.emoji || '🌐'}" style="width:80px"></div>
      </div>
      <div class="fg"><label>Color</label><div class="swatch-row" id="ext-cr"></div></div>
      <div class="fg"><label>URL</label><input id="ext-u" value="${escapeHTML(e.url)}"></div>
      <div class="fg"><label>Días recurrentes</label><div class="day-picker" id="ext-days"></div></div>
      <div class="row-2">
        <div class="fg"><label>Hora</label><input type="time" id="ext-time" value="${e.timeOfDay || ''}"></div>
        <div class="fg"><label>Inicio</label><input type="date" id="ext-start" value="${new Date(e.startDate).toISOString().split('T')[0]}"></div>
        <div class="fg"><label>Fin</label><input type="date" id="ext-end" value="${e.endDate ? new Date(e.endDate).toISOString().split('T')[0] : ''}"></div>
      </div>
      <div class="fg"><label>Notas</label><textarea id="ext-n" rows="2">${escapeHTML(e.notes || '')}</textarea></div>
      <p class="hint">Abrir: <a href="${escapeHTML(e.url)}" target="_blank">${escapeHTML(e.url)}</a></p>
    `, async () => {
      const data = {
        title: $val('ext-t') || e.title,
        url: $val('ext-u') || e.url,
        emoji: $val('ext-e') || e.emoji,
        color: selColor,
        daysOfWeek: this.dayPicker(),
        timeOfDay: $val('ext-time'),
        startDate: $val('ext-start'),
        endDate: $val('ext-end') || null,
        notes: $val('ext-n'),
      };
      await API.updateExternal(id, data);
      toast('✅ Guardado');
      State.externals = await API.listExternals();
      this.renderCards();
      Course.renderSidebar();
    }, {
      extraButtons: '<button class="btn btn-danger" id="btn-del-ext" style="width:auto;margin-right:auto">🗑 Eliminar</button>',
    });
    buildSwatches('ext-cr', COLORS, selColor, c => selColor = c);
    this.dayPicker = buildDayPicker('ext-days', e.daysOfWeek || []);
    $('btn-del-ext').addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${e.title}"?`)) return;
      await API.deleteExternal(id);
      toast('Eliminado');
      closeModal();
      State.externals = await API.listExternals();
      this.renderCards();
      Course.renderSidebar();
    });
  },

  init() { /* nothing static */ },
};
