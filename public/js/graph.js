// ── Graph of Skills ──────────────────────────────
// 2D canvas view of skill nodes + user-defined connections.
const SkillGraph = {
  skills: [],
  externals: [],           // Loaded from /api/externals when graph.json enables it
  layout: 'free',          // 'free' | 'axes' | 'force'
  axisX: 'careerValue',
  axisY: 'personalPull',
  sizeAxis: 'uniform',     // axis mapped to node radius
  nodeScale: 'auto',       // 'auto' | number — loaded from localStorage in init()
  view: { scale: 1, panX: 0, panY: 0 },
  drag: null,              // { id, dx, dy, startX, startY, moved }
  pan:  null,              // { x, y, panX, panY }
  hover: null,             // hovered skill id
  selected: null,          // selected skill id (for connecting)
  connectMode: false,
  animT: 0,
  raf: null,

  // ── Lifecycle ────────────────────────────────────
  async open() {
    State.cur = null;
    Stickers?.clearCanvas?.();
    $('home-view').style.display = 'none';
    $('course-view').style.display = 'none';
    $('global-cal-view').style.display = 'none';
    $('graph-view').style.display = '';
    const cv4 = $('cards-view'); if (cv4) cv4.style.display = 'none';
    const nv4 = $('network-view'); if (nv4) nv4.style.display = 'none';
    if (window.NetworkGraph) NetworkGraph.close();
    $('main').style.background = 'var(--bg)';
    applyDarkModeForBg(null);

    // Wait one frame so layout flushes before measuring canvas size.
    await new Promise(r => requestAnimationFrame(r));
    this.resize();
    await this.load();
    if (this.layout !== 'free') this.applyLayoutPositions();
    this.renderLegend();
    if (!this.raf) this.loop();
  },

  close() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  },

  async load() {
    try {
      const raw = await API.listSkills();
      // Server returns the SPA HTML when /api/skills isn't registered yet
      // (e.g., dev server still on the old build). Coerce & warn.
      if (!Array.isArray(raw)) {
        this.skills = [];
        toast('⚠ /api/skills no responde JSON. ¿Reiniciaste el servidor?', 5000);
      } else {
        this.skills = raw;
      }
      if (!Array.isArray(State.courses) || !State.courses.length) {
        try {
          const c = await API.listCourses();
          State.courses = Array.isArray(c) ? c : [];
        } catch { State.courses = []; }
      }
      // External courses — only when graph.json says so
      if (State.features?.graphIncludeExternalCourses) {
        try {
          const ext = State.externals?.length ? State.externals : await API.listExternals();
          this.externals = Array.isArray(ext) ? ext : [];
          State.externals = this.externals;
        } catch { this.externals = []; }
      } else {
        this.externals = [];
      }
      // Assign initial positions to skills that still sit at (0,0)
      const canvas = $('graph-canvas');
      const W = canvas?.width  || 800;
      const H = canvas?.height || 600;
      this.skills.forEach((s, i) => {
        if (!s.x && !s.y) {
          const angle = (i / Math.max(1, this.skills.length)) * Math.PI * 2;
          const r = Math.min(W, H) * 0.3;
          s.x = W / 2 + Math.cos(angle) * r;
          s.y = H / 2 + Math.sin(angle) * r;
        }
        // Defensive: ensure required nested fields exist for draw()
        if (!s.axes) s.axes = { careerValue: 0.5, personalPull: 0.5, technical: 0.5, difficulty: 0.5 };
        if (!Array.isArray(s.connections))       s.connections = [];
        if (!Array.isArray(s.courseIds))         s.courseIds = [];
        if (!Array.isArray(s.externalCourseIds)) s.externalCourseIds = [];
      });
      this.applyLayoutPositions();
      this.renderLegend();
    } catch (err) {
      this.skills = [];
      toast('❌ ' + err.message);
      this.renderLegend();
    }
  },

  // ── Layout ───────────────────────────────────────
  applyLayoutPositions() {
    const canvas = $('graph-canvas');
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const pad = 80;

    if (this.layout === 'axes') {
      this.skills.forEach(s => {
        const xv = s.axes?.[this.axisX] ?? 0.5;
        const yv = s.axes?.[this.axisY] ?? 0.5;
        s.x = pad + xv * (W - pad * 2);
        s.y = pad + (1 - yv) * (H - pad * 2);
      });
    } else if (this.layout === 'force') {
      this.runForce();
    }
    // 'free' → leave stored x/y
  },

  // Simple force-directed step: links pull, all nodes repel.
  runForce() {
    const canvas = $('graph-canvas');
    const W = canvas.width, H = canvas.height;
    const byId = Object.fromEntries(this.skills.map(s => [String(s._id), s]));
    const cx = W / 2, cy = H / 2;
    for (let iter = 0; iter < 200; iter++) {
      // Repulsion
      for (let i = 0; i < this.skills.length; i++) {
        for (let j = i + 1; j < this.skills.length; j++) {
          const a = this.skills[i], b = this.skills[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx * dx + dy * dy + 0.01;
          const f = 8000 / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.x -= fx; a.y -= fy;
          b.x += fx; b.y += fy;
        }
      }
      // Spring attraction along connections
      this.skills.forEach(s => {
        (s.connections || []).forEach(c => {
          const peer = byId[String(c.skillId)];
          if (!peer) return;
          const dx = peer.x - s.x, dy = peer.y - s.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
          const target = 200 - 100 * (c.strength || 0.5);
          const f = (d - target) * 0.01;
          s.x += (dx / d) * f;
          s.y += (dy / d) * f;
        });
        // Mild centering
        s.x += (cx - s.x) * 0.002;
        s.y += (cy - s.y) * 0.002;
      });
    }
  },

  // ── Helpers ──────────────────────────────────────
  skillById(id) { return this.skills.find(s => String(s._id) === String(id)); },

  // A skill glows when any linked course has unfinished modules, OR
  // any linked external course is currently active (start passed, not ended).
  isActive(skill) {
    const cIds = new Set((skill.courseIds || []).map(String));
    const internal = (State.courses || []).some(c => {
      if (!cIds.has(String(c._id))) return false;
      const tot = c.totalModules || 0;
      const done = c.doneModules || 0;
      return tot > 0 && done < tot;
    });
    if (internal) return true;

    const eIds = new Set((skill.externalCourseIds || []).map(String));
    if (!eIds.size && !(skill.learningExperiences || []).length) return false;
    const now = Date.now();
    const externalActive = (this.externals || []).some(e => {
      if (!eIds.has(String(e._id))) return false;
      const start = e.startDate ? new Date(e.startDate).getTime() : 0;
      const end   = e.endDate   ? new Date(e.endDate).getTime()   : Infinity;
      return start <= now && now <= end;
    });
    if (externalActive) return true;

    // Glow when a learning experience was logged within the last 7 weeks
    const sevenWeeksAgo = now - 7 * 7 * 24 * 60 * 60 * 1000;
    return (skill.learningExperiences || []).some(e => new Date(e.date).getTime() >= sevenWeeksAgo);
  },

  radius(skill) {
    const scale = this.nodeScale === 'auto'
      ? Math.min(1, Math.sqrt(12 / Math.max(1, this.skills.length)))
      : this.nodeScale;
    if (this.sizeAxis === 'uniform') return 20 * scale;
    const v = this.sizeAxis === 'knownLevel'
      ? (skill.knownLevel ?? 0.5)
      : (skill.axes?.[this.sizeAxis] ?? 0.5);
    return (14 + v * 36) * scale;
  },

  hitTest(x, y) {
    for (let i = this.skills.length - 1; i >= 0; i--) {
      const s = this.skills[i];
      const dx = x - s.x, dy = y - s.y;
      const r = this.radius(s);
      if (dx * dx + dy * dy <= r * r) return s;
    }
    return null;
  },

  // ── Render loop ──────────────────────────────────
  loop() {
    this.animT += 0.04;
    this.draw();
    this.raf = requestAnimationFrame(() => this.loop());
  },

  draw() {
    const canvas = $('graph-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const grd = ctx.createRadialGradient(W/2, H/2, 50, W/2, H/2, Math.max(W, H));
    grd.addColorStop(0, '#1a1a2e');
    grd.addColorStop(1, '#0a0a18');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Axis grid (only in axes mode)
    if (this.layout === 'axes') {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const x = 80 + (W - 160) * (i / 10);
        ctx.moveTo(x, 80); ctx.lineTo(x, H - 80);
        const y = 80 + (H - 160) * (i / 10);
        ctx.moveTo(80, y); ctx.lineTo(W - 80, y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '12px DM Sans, sans-serif';
      ctx.fillText(this.axisLabel(this.axisX) + ' →', W - 200, H - 60);
      ctx.save();
      ctx.translate(40, 200);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(this.axisLabel(this.axisY) + ' →', 0, 0);
      ctx.restore();
    }

    // Edges
    const byId = Object.fromEntries(this.skills.map(s => [String(s._id), s]));
    const drawn = new Set();
    this.skills.forEach(s => {
      (s.connections || []).forEach(c => {
        const peer = byId[String(c.skillId)];
        if (!peer) return;
        const key = [String(s._id), String(peer._id)].sort().join('|');
        if (drawn.has(key)) return;
        drawn.add(key);
        const strength = c.strength ?? 0.5;
        ctx.strokeStyle = `rgba(180, 180, 220, ${0.06 + strength * 0.22})`;
        ctx.lineWidth = 0.75 + strength * 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(peer.x, peer.y);
        ctx.stroke();
      });
    });

    // Nodes (bodies only — labels drawn separately to avoid clutter)
    const labelQueue = []; // { s, r, priority } — priority: 2=selected, 1=hovered, 0=normal
    this.skills.forEach(s => {
      const r = this.radius(s);
      const active = this.isActive(s);
      const isSelected = this.selected === String(s._id);
      const isHovered  = this.hover   === String(s._id);
      const isBg = s.background && !isSelected && !isHovered;
      const color = s.color || '#7c5ce0';

      if (isBg) ctx.globalAlpha = 0.1;

      // Glow halo for active skills
      if (active) {
        const pulse = 0.6 + 0.4 * Math.sin(this.animT * 1.5 + (s.x * 0.01));
        const glowR = r + 22 + pulse * 8;
        const grad = ctx.createRadialGradient(s.x, s.y, r * 0.5, s.x, s.y, glowR);
        grad.addColorStop(0, this.hexA(color, 0.55 * pulse));
        grad.addColorStop(1, this.hexA(color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Body
      const bodyGrad = ctx.createRadialGradient(
        s.x - r * 0.4, s.y - r * 0.4, r * 0.1,
        s.x, s.y, r
      );
      bodyGrad.addColorStop(0, this.lighten(color, 0.35));
      bodyGrad.addColorStop(1, color);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Emoji
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.max(14, r * 0.7)}px serif`;
      ctx.fillText(s.emoji || '✦', s.x, s.y);

      if (isBg) ctx.globalAlpha = 1;

      labelQueue.push({ s, r, priority: isSelected ? 2 : isHovered ? 1 : isBg ? -1 : 0, isBg: !!isBg });
    });

    // Labels — two-pass anti-clutter: high-priority nodes claim space first,
    // then remaining labels are drawn only if they don't overlap a claimed box.
    ctx.font = '13px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    labelQueue.sort((a, b) => b.priority - a.priority);
    const occupied = [];
    labelQueue.forEach(({ s, r, priority, isBg }) => {
      const ly = s.y + r + 16;
      const tw = ctx.measureText(s.name).width;
      const box = { x1: s.x - tw / 2 - 6, x2: s.x + tw / 2 + 6, y1: ly - 9, y2: ly + 9 };
      // Normal-priority labels are skipped if they overlap any already-drawn label
      const overlaps = priority <= 0 && occupied.some(o =>
        box.x1 < o.x2 && box.x2 > o.x1 && box.y1 < o.y2 && box.y2 > o.y1
      );
      if (overlaps) return;
      ctx.globalAlpha = isBg ? 0.1 : 1;
      ctx.fillStyle = priority > 0 ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.85)';
      ctx.fillText(s.name, s.x, ly);
      ctx.globalAlpha = 1;
      if (!isBg) occupied.push(box);
    });

    // Connection-mode hint
    if (this.connectMode && this.selected) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '13px DM Sans, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Modo conexión: clic en otra habilidad para enlazar (Esc para salir)', 16, 24);
    }
  },

  axisLabel(k) {
    return {
      careerValue:  'Valor profesional',
      personalPull: 'Atracción personal',
      technical:    'Técnico',
      difficulty:   'Dificultad',
    }[k] || k;
  },

  hexA(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  },
  lighten(hex, amt) {
    const h = hex.replace('#', '');
    const r = Math.min(255, parseInt(h.slice(0, 2), 16) + Math.round(255 * amt));
    const g = Math.min(255, parseInt(h.slice(2, 4), 16) + Math.round(255 * amt));
    const b = Math.min(255, parseInt(h.slice(4, 6), 16) + Math.round(255 * amt));
    return `rgb(${r},${g},${b})`;
  },

  // ── Resize ───────────────────────────────────────
  resize() {
    const canvas = $('graph-canvas');
    const stage  = $('graph-stage');
    if (!canvas || !stage) return;
    const w = stage.clientWidth  || 800;
    const h = stage.clientHeight || 600;
    // Avoid resetting drawing surface to 0 (would blank the canvas).
    canvas.width  = Math.max(200, w);
    canvas.height = Math.max(200, h);
    if (this.layout !== 'free') this.applyLayoutPositions();
  },

  // ── Mouse / interaction ─────────────────────────
  bindCanvasEvents() {
    const canvas = $('graph-canvas');
    if (!canvas || canvas._graphBound) return;
    canvas._graphBound = true;

    const localXY = e => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    canvas.addEventListener('mousedown', e => {
      const { x, y } = localXY(e);
      const hit = this.hitTest(x, y);
      if (hit) {
        if (this.connectMode && this.selected && this.selected !== String(hit._id)) {
          this.toggleConnection(this.selected, String(hit._id));
          return;
        }
        this.drag = { id: String(hit._id), dx: x - hit.x, dy: y - hit.y, moved: false, startX: x, startY: y };
      } else {
        // Empty click — clear selection / connect mode
        this.selected = null;
        this.connectMode = false;
      }
    });

    canvas.addEventListener('mousemove', e => {
      const { x, y } = localXY(e);
      if (this.drag) {
        const s = this.skillById(this.drag.id);
        if (!s) return;
        if (Math.abs(x - this.drag.startX) + Math.abs(y - this.drag.startY) > 4) this.drag.moved = true;
        s.x = x - this.drag.dx;
        s.y = y - this.drag.dy;
        // Drag implicitly switches layout to free so positions stick
        if (this.layout !== 'free') {
          this.layout = 'free';
          $('graph-layout').value = 'free';
          $('graph-axis-x-wrap').style.display = 'none';
          $('graph-axis-y-wrap').style.display = 'none';
        }
        canvas.style.cursor = 'grabbing';
      } else {
        const hit = this.hitTest(x, y);
        this.hover = hit ? String(hit._id) : null;
        canvas.style.cursor = hit ? 'pointer' : 'default';
      }
    });

    canvas.addEventListener('mouseleave', () => { this.hover = null; });

    const finish = async () => {
      if (this.drag) {
        const s = this.skillById(this.drag.id);
        const moved = this.drag.moved;
        const dragged = this.drag;
        this.drag = null;
        canvas.style.cursor = 'default';
        if (s && moved) {
          try { await API.updateSkill(s._id, { x: s.x, y: s.y }); } catch {}
        } else if (s && !moved) {
          // Click → open editor
          this.openEditor(s._id);
        }
      }
    };
    canvas.addEventListener('mouseup', finish);
    canvas.addEventListener('mouseleave', finish);

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && $('graph-view').style.display !== 'none') {
        this.connectMode = false;
        this.selected = null;
      }
    });
  },

  // ── Legend ───────────────────────────────────────
  renderLegend() {
    const el = $('graph-legend');
    if (!el) return;
    const total = this.skills.length;
    const active = this.skills.filter(s => this.isActive(s)).length;
    el.innerHTML = `
      <div><b>${total}</b> habilidades · <b>${active}</b> activas</div>
      <div class="hint">Clic en una habilidad para editarla. Arrastra para mover.</div>
    `;
    const empty = $('graph-empty');
    if (empty) empty.style.display = total === 0 ? 'flex' : 'none';
  },

  // ── Editor modal ────────────────────────────────
  openEditor(id) {
    const s = id ? this.skillById(id) : null;
    const isNew = !s;
    const title = isNew ? 'Nueva habilidad' : 'Editar habilidad';
    const data = s || { name: '', emoji: '✦', color: COLORS[0], knownLevel: 0.5,
      axes: { careerValue: 0.5, personalPull: 0.5, technical: 0.5, difficulty: 0.5 },
      courseIds: [], externalCourseIds: [], connections: [], background: false };

    const sliderRow = (label, key, val) => `
      <div class="form-row">
        <label>${label} <span id="lab-${key}" class="hint">${Math.round(val*100)}%</span></label>
        <input type="range" id="sk-${key}" min="0" max="100" value="${Math.round(val*100)}">
      </div>`;

    const courseChecks = (State.courses || []).map(c => {
      const fav = c.favicon ? `<img class="sk-fav" src="${c.favicon}" alt="">` : (c.emoji || '📚');
      return `
      <label class="check-pill">
        <input type="checkbox" data-cid="${c._id}" class="sk-course"
          ${ (data.courseIds || []).map(String).includes(String(c._id)) ? 'checked' : '' }>
        ${fav} ${escapeHTML(c.title)}
      </label>`;
    }).join('') || '<span class="hint">No hay cursos creados.</span>';

    const showExternals = !!State.features?.graphIncludeExternalCourses;
    const externalsHTML = showExternals
      ? (this.externals.length
          ? this.externals.map(e => {
              const fav = e.favicon ? `<img class="sk-fav" src="${e.favicon}" alt="">` : (e.emoji || '🌐');
              return `
              <label class="check-pill">
                <input type="checkbox" data-eid="${e._id}" class="sk-external"
                  ${ (data.externalCourseIds || []).map(String).includes(String(e._id)) ? 'checked' : '' }>
                ${fav} ${escapeHTML(e.title)}
              </label>`;
            }).join('')
          : '<span class="hint">No hay cursos externos.</span>')
      : '';

    const otherSkills = this.skills.filter(x => !s || String(x._id) !== String(s._id));
    const connected = new Set((data.connections || []).map(c => String(c.skillId)));
    const connRows = otherSkills.map(o => {
      const c = (data.connections || []).find(cc => String(cc.skillId) === String(o._id));
      const checked = connected.has(String(o._id));
      return `
        <label class="check-pill">
          <input type="checkbox" data-sid="${o._id}" class="sk-conn" ${checked ? 'checked' : ''}>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${o.color};margin-right:4px"></span>
          ${escapeHTML(o.name)}
          <input type="range" min="0" max="100" value="${Math.round((c?.strength ?? 0.5) * 100)}"
                 data-sid-str="${o._id}" style="width:80px;margin-left:6px;${checked ? '' : 'opacity:.3'}">
        </label>`;
    }).join('') || '<span class="hint">Agrega más habilidades para conectarlas.</span>';

    const swatchRow = COLORS.map(c =>
      `<div class="swatch ${c === data.color ? 'on' : ''}" data-col="${c}" style="background:${c}"></div>`
    ).join('');

    const body = `
      <div class="form-row">
        <label>Nombre</label>
        <input type="text" id="sk-name" value="${escapeHTML(data.name)}" placeholder="React, Liderazgo, Cálculo…">
      </div>
      <div class="form-row" style="display:flex;gap:12px;align-items:center">
        <div style="flex:0 0 100px">
          <label>Emoji</label>
          <input type="text" id="sk-emoji" value="${escapeHTML(data.emoji || '✦')}" maxlength="4">
        </div>
        <div style="flex:1">
          <label>Color</label>
          <div class="swatches" id="sk-colors">${swatchRow}</div>
        </div>
      </div>
      <div class="form-row" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="sk-background" ${data.background ? 'checked' : ''}>
        <label for="sk-background" style="margin:0">Segundo plano <span class="hint">(opacidad reducida en el grafo)</span></label>
      </div>
      ${sliderRow('Conocimiento previo (tamaño)', 'knownLevel', data.knownLevel)}
      <h3 style="margin-top:14px">Ejes de valor</h3>
      ${sliderRow('💼 Valor profesional', 'careerValue', data.axes.careerValue)}
      ${sliderRow('❤️ Atracción personal', 'personalPull', data.axes.personalPull)}
      ${sliderRow('⚙️ Técnico', 'technical', data.axes.technical)}
      ${sliderRow('🔥 Dificultad', 'difficulty', data.axes.difficulty)}
      <h3 style="margin-top:14px">Cursos vinculados</h3>
      <div class="check-pills">${courseChecks}</div>
      ${showExternals ? `<h3 style="margin-top:14px">Cursos externos</h3><div class="check-pills">${externalsHTML}</div>` : ''}
      <h3 style="margin-top:14px">Conexiones con otras habilidades</h3>
      <div class="check-pills">${connRows}</div>
    `;

    const extra = isNew ? '' : `<button class="btn btn-danger btn-sm" id="sk-delete">🗑 Eliminar</button>`;

    let pickedColor = data.color;

    showModal(title, body, async () => {
      const name = $val('sk-name').trim();
      if (!name) { toast('Pon un nombre'); return false; }

      const payload = {
        name,
        emoji: $val('sk-emoji') || '✦',
        color: pickedColor,
        knownLevel: (+$val('sk-knownLevel') || 0) / 100,
        background: !!document.getElementById('sk-background')?.checked,
        axes: {
          careerValue:  (+$val('sk-careerValue')  || 0) / 100,
          personalPull: (+$val('sk-personalPull') || 0) / 100,
          technical:    (+$val('sk-technical')    || 0) / 100,
          difficulty:   (+$val('sk-difficulty')   || 0) / 100,
        },
        courseIds:         [...document.querySelectorAll('.sk-course:checked')].map(el => el.dataset.cid),
        externalCourseIds: [...document.querySelectorAll('.sk-external:checked')].map(el => el.dataset.eid),
      };

      // Save skill itself first
      let saved;
      if (isNew) saved = await API.createSkill(payload);
      else       saved = await API.updateSkill(s._id, payload);

      // Sync connections symmetrically
      const desired = new Map();
      document.querySelectorAll('.sk-conn').forEach(cb => {
        if (cb.checked) {
          const peerId = cb.dataset.sid;
          const strEl = document.querySelector(`[data-sid-str="${peerId}"]`);
          const strength = (+(strEl?.value) || 50) / 100;
          desired.set(peerId, strength);
        }
      });
      const before = new Map((s?.connections || []).map(c => [String(c.skillId), c.strength ?? 0.5]));
      // Add or update
      for (const [peerId, strength] of desired.entries()) {
        if (!before.has(peerId) || Math.abs(before.get(peerId) - strength) > 0.001) {
          await API.connectSkill(saved._id, peerId, strength);
        }
      }
      // Remove
      for (const peerId of before.keys()) {
        if (!desired.has(peerId)) {
          await API.disconnectSkill(saved._id, peerId);
        }
      }

      await this.load();
      toast(isNew ? '✨ Habilidad creada' : 'Guardado');
    }, { extraButtons: extra });

    // Wire up sliders & swatches after modal renders
    ['knownLevel','careerValue','personalPull','technical','difficulty'].forEach(k => {
      const el = $('sk-' + k);
      el?.addEventListener('input', () => {
        $('lab-' + k).textContent = el.value + '%';
      });
    });
    document.querySelectorAll('#sk-colors .swatch').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('#sk-colors .swatch').forEach(x => x.classList.remove('on'));
        el.classList.add('on');
        pickedColor = el.dataset.col;
      });
    });
    document.querySelectorAll('.sk-conn').forEach(cb => {
      cb.addEventListener('change', () => {
        const strEl = document.querySelector(`[data-sid-str="${cb.dataset.sid}"]`);
        if (strEl) strEl.style.opacity = cb.checked ? 1 : 0.3;
      });
    });
    if (!isNew) {
      $('sk-delete')?.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta habilidad? Se quitarán todas sus conexiones.')) return;
        try {
          await API.deleteSkill(s._id);
          closeModal();
          await this.load();
          toast('Eliminada');
        } catch (err) { toast('❌ ' + err.message); }
      });
    }
  },

  async toggleConnection(aId, bId) {
    const a = this.skillById(aId);
    if (!a) return;
    const existing = (a.connections || []).find(c => String(c.skillId) === String(bId));
    try {
      if (existing) await API.disconnectSkill(aId, bId);
      else          await API.connectSkill(aId, bId, 0.5);
      await this.load();
    } catch (err) { toast('❌ ' + err.message); }
  },

  // ── Init ─────────────────────────────────────────
  init() {
    $('nav-graph')?.addEventListener('click', () => this.open());
    $('grv-back')?.addEventListener('click', () => Course.showHome());
    $('graph-new-skill')?.addEventListener('click', () => this.openEditor(null));

    $('graph-layout')?.addEventListener('change', e => {
      this.layout = e.target.value;
      const showAxes = this.layout === 'axes';
      $('graph-axis-x-wrap').style.display = showAxes ? 'inline-flex' : 'none';
      $('graph-axis-y-wrap').style.display = showAxes ? 'inline-flex' : 'none';
      this.applyLayoutPositions();
    });
    $('graph-axis-x')?.addEventListener('change', e => { this.axisX = e.target.value; this.applyLayoutPositions(); });
    $('graph-axis-y')?.addEventListener('change', e => { this.axisY = e.target.value; this.applyLayoutPositions(); });
    $('graph-size-axis')?.addEventListener('change', e => { this.sizeAxis = e.target.value; });

    // Restore saved node scale (persisted in localStorage)
    const savedScale = localStorage.getItem('graphNodeScale') || 'auto';
    this.nodeScale = savedScale === 'auto' ? 'auto' : parseFloat(savedScale);
    const scaleSel = $('graph-node-scale');
    if (scaleSel) scaleSel.value = savedScale;
    scaleSel?.addEventListener('change', e => {
      const v = e.target.value;
      this.nodeScale = v === 'auto' ? 'auto' : parseFloat(v);
      localStorage.setItem('graphNodeScale', v);
    });

    this.bindCanvasEvents();
  },
};
