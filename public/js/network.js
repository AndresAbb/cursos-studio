// ── Red de Contactos (Networking map) ─────────────
// 2D canvas map of "worlds" radiating from you (the center hub). Each world
// holds potential growth projects, surfaced as expanding hover tooltips, with
// a status per project. Mirrors the Skills Graph but specialized for networking.

// Project lifecycle statuses — key, label (with emoji) and a dot color.
const NET_STATUSES = [
  { key: 'idea',       label: '💡 Idea',        color: '#8a8a8a' },
  { key: 'explorando', label: '🔭 Explorando',  color: '#2a6e8a' },
  { key: 'contacto',   label: '🤝 En contacto', color: '#d4a017' },
  { key: 'progreso',   label: '🚧 En progreso', color: '#c8622a' },
  { key: 'activo',     label: '✅ Activo',       color: '#4a7c59' },
  { key: 'pausado',    label: '⏸ Pausado',      color: '#5b4a8a' },
  { key: 'descartado', label: '✖ Descartado',   color: '#b84f7a' },
];
const NET_STATUS_BY = Object.fromEntries(NET_STATUSES.map(s => [s.key, s]));
function netStatus(key) { return NET_STATUS_BY[key] || NET_STATUSES[0]; }

const NetworkGraph = {
  nodes: [],
  hub: { x: 0, y: 0, r: 34 },   // the central "you" node (visual only)
  drag: null,                   // { id, dx, dy, startX, startY, moved }
  hover: null,                  // hovered node id
  tipFor: null,                 // node id currently shown in the tooltip
  animT: 0,
  raf: null,

  // ── Lifecycle ────────────────────────────────────
  async open() {
    State.cur = null;
    Stickers?.clearCanvas?.();
    $('home-view').style.display = 'none';
    $('course-view').style.display = 'none';
    $('global-cal-view').style.display = 'none';
    const gv = $('graph-view'); if (gv) gv.style.display = 'none';
    const cv = $('cards-view'); if (cv) cv.style.display = 'none';
    if (window.SkillGraph) SkillGraph.close();
    $('network-view').style.display = '';
    $('main').style.background = 'var(--bg)';
    applyDarkModeForBg(null);

    await new Promise(r => requestAnimationFrame(r));
    this.resize();
    await this.load();
    this.renderLegend();
    if (!this.raf) this.loop();
  },

  close() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.hideTooltip();
  },

  async load() {
    try {
      const raw = await API.listNetworkNodes();
      if (!Array.isArray(raw)) {
        this.nodes = [];
        toast('⚠ /api/network-nodes no responde JSON. ¿Reiniciaste el servidor?', 5000);
      } else {
        this.nodes = raw;
      }
      const canvas = $('network-canvas');
      const W = canvas?.width  || 800;
      const H = canvas?.height || 600;
      this.hub.x = W / 2;
      this.hub.y = H / 2;
      const ringR = Math.min(W, H) * 0.32;
      this.nodes.forEach((n, i) => {
        if (!Array.isArray(n.projects)) n.projects = [];
        if (!n.x && !n.y) {
          const angle = (i / Math.max(1, this.nodes.length)) * Math.PI * 2 - Math.PI / 2;
          n.x = W / 2 + Math.cos(angle) * ringR;
          n.y = H / 2 + Math.sin(angle) * ringR;
        }
      });
      this.renderLegend();
    } catch (err) {
      this.nodes = [];
      toast('❌ ' + err.message);
      this.renderLegend();
    }
  },

  // ── Helpers ──────────────────────────────────────
  nodeById(id) { return this.nodes.find(n => String(n._id) === String(id)); },

  // A world glows when it has at least one project that's active or in progress.
  isActive(node) {
    return (node.projects || []).some(p => p.status === 'activo' || p.status === 'progreso');
  },

  radius(node) {
    const n = (node.projects || []).length;
    return Math.min(56, 26 + n * 3.5);
  },

  hitTest(x, y) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dx = x - n.x, dy = y - n.y;
      const r = this.radius(n);
      if (dx * dx + dy * dy <= r * r) return n;
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
    const canvas = $('network-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const grd = ctx.createRadialGradient(W/2, H/2, 50, W/2, H/2, Math.max(W, H));
    grd.addColorStop(0, '#16213a');
    grd.addColorStop(1, '#0a0a18');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    const hub = this.hub;

    // Edges — each world tethered to the central hub
    this.nodes.forEach(n => {
      ctx.strokeStyle = this.hexA(n.color || '#7c5ce0', 0.28);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hub.x, hub.y);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
    });

    // Central hub (you)
    {
      const pulse = 0.6 + 0.4 * Math.sin(this.animT * 1.2);
      const glowR = hub.r + 16 + pulse * 6;
      const g = ctx.createRadialGradient(hub.x, hub.y, hub.r * 0.4, hub.x, hub.y, glowR);
      g.addColorStop(0, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(hub.x, hub.y, glowR, 0, Math.PI * 2); ctx.fill();

      const bg = ctx.createRadialGradient(hub.x - hub.r*0.4, hub.y - hub.r*0.4, hub.r*0.1, hub.x, hub.y, hub.r);
      bg.addColorStop(0, '#fefefe');
      bg.addColorStop(1, '#c9c9d6');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(hub.x, hub.y, hub.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(hub.r * 0.7)}px serif`;
      ctx.fillText('🧭', hub.x, hub.y);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '13px DM Sans, sans-serif';
      ctx.fillText('Tú', hub.x, hub.y + hub.r + 16);
    }

    // World nodes
    this.nodes.forEach(n => {
      const r = this.radius(n);
      const color = n.color || '#7c5ce0';
      const active = this.isActive(n);
      const isHovered = this.hover === String(n._id);

      if (active) {
        const pulse = 0.6 + 0.4 * Math.sin(this.animT * 1.5 + (n.x * 0.01));
        const glowR = r + 20 + pulse * 8;
        const g = ctx.createRadialGradient(n.x, n.y, r * 0.5, n.x, n.y, glowR);
        g.addColorStop(0, this.hexA(color, 0.5 * pulse));
        g.addColorStop(1, this.hexA(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2); ctx.fill();
      }

      if (isHovered) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2); ctx.stroke();
      }

      const bodyGrad = ctx.createRadialGradient(n.x - r*0.4, n.y - r*0.4, r*0.1, n.x, n.y, r);
      bodyGrad.addColorStop(0, this.lighten(color, 0.35));
      bodyGrad.addColorStop(1, color);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5; ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.max(16, r * 0.7)}px serif`;
      ctx.fillText(n.emoji || '🌐', n.x, n.y);

      // Project-count badge
      const count = (n.projects || []).length;
      if (count) {
        const bx = n.x + r * 0.72, by = n.y - r * 0.72;
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px DM Sans, sans-serif';
        ctx.fillText(String(count), bx, by + 0.5);
      }

      // Label
      ctx.fillStyle = isHovered ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.85)';
      ctx.font = '13px DM Sans, sans-serif';
      ctx.fillText(n.name, n.x, n.y + r + 16);
    });
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

  // ── Tooltip (expanding) ──────────────────────────
  showTooltip(node) {
    const tip = $('network-tooltip');
    if (!tip) return;
    const projects = node.projects || [];
    const rows = projects.length
      ? projects.map(p => {
          const st = netStatus(p.status);
          const note = p.note ? `<div class="np-note">${escapeHTML(p.note)}</div>` : '';
          const link = p.link ? ` <a href="${escapeHTML(p.link)}" target="_blank" rel="noopener" class="np-link">↗</a>` : '';
          return `
            <div class="np-row">
              <span class="np-dot" style="background:${st.color}"></span>
              <div class="np-main">
                <div class="np-name">${escapeHTML(p.name)}${link}</div>
                <div class="np-status" style="color:${st.color}">${st.label}</div>
                ${note}
              </div>
            </div>`;
        }).join('')
      : '<div class="np-empty">Sin proyectos aún. Clic para añadir.</div>';

    tip.innerHTML = `
      <div class="np-head"><span>${node.emoji || '🌐'}</span> ${escapeHTML(node.name)}</div>
      <div class="np-list">${rows}</div>
      <div class="np-foot">Clic para gestionar proyectos</div>`;

    // Position near the node, clamped within the stage
    const stage = $('network-stage');
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const r = this.radius(node);
    tip.classList.add('open');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = node.x + r + 14;
    if (left + tw > sw - 8) left = node.x - r - 14 - tw;
    left = Math.max(8, Math.min(left, sw - tw - 8));
    let top = node.y - th / 2;
    top = Math.max(8, Math.min(top, sh - th - 8));
    tip.style.left = left + 'px';
    tip.style.top  = top + 'px';
    this.tipFor = String(node._id);
  },

  hideTooltip() {
    const tip = $('network-tooltip');
    if (tip) tip.classList.remove('open');
    this.tipFor = null;
  },

  // ── Resize ───────────────────────────────────────
  resize() {
    const canvas = $('network-canvas');
    const stage  = $('network-stage');
    if (!canvas || !stage) return;
    const w = stage.clientWidth  || 800;
    const h = stage.clientHeight || 600;
    canvas.width  = Math.max(200, w);
    canvas.height = Math.max(200, h);
    this.hub.x = canvas.width / 2;
    this.hub.y = canvas.height / 2;
  },

  // ── Mouse / interaction ─────────────────────────
  bindCanvasEvents() {
    const canvas = $('network-canvas');
    if (!canvas || canvas._netBound) return;
    canvas._netBound = true;

    const localXY = e => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    canvas.addEventListener('mousedown', e => {
      const { x, y } = localXY(e);
      const hit = this.hitTest(x, y);
      if (hit) {
        this.drag = { id: String(hit._id), dx: x - hit.x, dy: y - hit.y, moved: false, startX: x, startY: y };
        this.hideTooltip();
      }
    });

    canvas.addEventListener('mousemove', e => {
      const { x, y } = localXY(e);
      if (this.drag) {
        const n = this.nodeById(this.drag.id);
        if (!n) return;
        if (Math.abs(x - this.drag.startX) + Math.abs(y - this.drag.startY) > 4) this.drag.moved = true;
        n.x = x - this.drag.dx;
        n.y = y - this.drag.dy;
        canvas.style.cursor = 'grabbing';
      } else {
        const hit = this.hitTest(x, y);
        this.hover = hit ? String(hit._id) : null;
        canvas.style.cursor = hit ? 'pointer' : 'default';
        if (hit) {
          if (this.tipFor !== String(hit._id)) this.showTooltip(hit);
        } else if (this.tipFor) {
          this.hideTooltip();
        }
      }
    });

    canvas.addEventListener('mouseleave', () => { this.hover = null; this.hideTooltip(); });

    const finish = async () => {
      if (!this.drag) return;
      const n = this.nodeById(this.drag.id);
      const moved = this.drag.moved;
      this.drag = null;
      canvas.style.cursor = 'default';
      if (n && moved) {
        try { await API.updateNetworkNode(n._id, { x: n.x, y: n.y }); } catch {}
      } else if (n && !moved) {
        this.openEditor(n._id);
      }
    };
    canvas.addEventListener('mouseup', finish);

    window.addEventListener('resize', () => {
      if ($('network-view').style.display === 'none') return;
      this.resize();
    });
  },

  // ── Legend ───────────────────────────────────────
  renderLegend() {
    const el = $('network-legend');
    if (!el) return;
    const totalNodes = this.nodes.length;
    const totalProjects = this.nodes.reduce((s, n) => s + (n.projects || []).length, 0);
    const active = this.nodes.reduce((s, n) =>
      s + (n.projects || []).filter(p => p.status === 'activo' || p.status === 'progreso').length, 0);
    el.innerHTML = `
      <div><b>${totalNodes}</b> mundos · <b>${totalProjects}</b> proyectos · <b>${active}</b> en marcha</div>
      <div class="hint">Pasa el cursor para ver proyectos · clic para gestionarlos · arrastra para mover.</div>`;
    const empty = $('network-empty');
    if (empty) empty.style.display = totalNodes === 0 ? 'flex' : 'none';
  },

  // ── Editor modal ────────────────────────────────
  projectRowHTML(p, i) {
    const opts = NET_STATUSES.map(s =>
      `<option value="${s.key}" ${p.status === s.key ? 'selected' : ''}>${s.label}</option>`).join('');
    return `
      <div class="np-edit-row" data-pi="${i}">
        <input type="text" class="np-name-in" placeholder="Proyecto de crecimiento…" value="${escapeHTML(p.name || '')}">
        <select class="np-status-in select-sm">${opts}</select>
        <input type="text" class="np-note-in" placeholder="Nota (opcional)" value="${escapeHTML(p.note || '')}">
        <input type="text" class="np-link-in" placeholder="Enlace (opcional)" value="${escapeHTML(p.link || '')}">
        <button type="button" class="btn btn-danger btn-sm np-del-row" title="Quitar">×</button>
      </div>`;
  },

  openEditor(id) {
    const n = id ? this.nodeById(id) : null;
    const isNew = !n;
    const title = isNew ? 'Nuevo mundo' : `Editar · ${n.name}`;
    const data = n || { name: '', emoji: '🌐', color: COLORS[0], projects: [] };

    const swatchRow = COLORS.map(c =>
      `<div class="swatch ${c === data.color ? 'on' : ''}" data-col="${c}" style="background:${c}"></div>`).join('');

    const projectRows = (data.projects || []).map((p, i) => this.projectRowHTML(p, i)).join('');

    const body = `
      <div class="form-row" style="display:flex;gap:12px;align-items:flex-end">
        <div style="flex:0 0 90px">
          <label>Emoji</label>
          <input type="text" id="ntw-emoji" value="${escapeHTML(data.emoji || '🌐')}" maxlength="4">
        </div>
        <div style="flex:1">
          <label>Nombre del mundo</label>
          <input type="text" id="ntw-name" value="${escapeHTML(data.name)}" placeholder="Mundo Académico, Cultural…">
        </div>
      </div>
      <div class="form-row">
        <label>Color</label>
        <div class="swatch-row" id="ntw-colors">${swatchRow}</div>
      </div>
      <h3 style="margin-top:14px">Proyectos de crecimiento</h3>
      <p class="hint">Cada proyecto potencial con su estado. Aparecen como tooltip al pasar el cursor sobre el mundo.</p>
      <div id="ntw-projects">${projectRows}</div>
      <button type="button" class="btn btn-outline btn-sm" id="ntw-add-project" style="margin-top:8px">＋ Añadir proyecto</button>
    `;

    const extra = isNew ? '' : `<button class="btn btn-danger btn-sm" id="ntw-delete">🗑 Eliminar mundo</button>`;
    let pickedColor = data.color;

    showModal(title, body, async () => {
      const name = $val('ntw-name').trim();
      if (!name) { toast('Pon un nombre'); return false; }

      const projects = [...document.querySelectorAll('#ntw-projects .np-edit-row')].map(row => ({
        name:   row.querySelector('.np-name-in').value.trim(),
        status: row.querySelector('.np-status-in').value,
        note:   row.querySelector('.np-note-in').value.trim(),
        link:   row.querySelector('.np-link-in').value.trim(),
      })).filter(p => p.name);

      const payload = { name, emoji: $val('ntw-emoji') || '🌐', color: pickedColor, projects };
      if (isNew) await API.createNetworkNode(payload);
      else       await API.updateNetworkNode(n._id, payload);

      await this.load();
      toast(isNew ? '✨ Mundo creado' : 'Guardado');
    }, { extraButtons: extra, wide: true });

    // Wire swatches
    document.querySelectorAll('#ntw-colors .swatch').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('#ntw-colors .swatch').forEach(x => x.classList.remove('on'));
        el.classList.add('on');
        pickedColor = el.dataset.col;
      });
    });
    // Add project row
    $('ntw-add-project')?.addEventListener('click', () => {
      const wrap = $('ntw-projects');
      const i = wrap.querySelectorAll('.np-edit-row').length;
      wrap.insertAdjacentHTML('beforeend', this.projectRowHTML({ status: 'idea' }, i));
    });
    // Remove project row (delegated)
    $('ntw-projects')?.addEventListener('click', e => {
      const btn = e.target.closest('.np-del-row');
      if (btn) btn.closest('.np-edit-row')?.remove();
    });
    // Delete node
    if (!isNew) {
      $('ntw-delete')?.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este mundo y todos sus proyectos?')) return;
        try {
          await API.deleteNetworkNode(n._id);
          closeModal();
          await this.load();
          toast('Eliminado');
        } catch (err) { toast('❌ ' + err.message); }
      });
    }
  },

  // ── Init ─────────────────────────────────────────
  init() {
    $('nav-network')?.addEventListener('click', () => this.open());
    $('ntw-back')?.addEventListener('click', () => Course.showHome());
    $('ntw-new-node')?.addEventListener('click', () => this.openEditor(null));
    this.bindCanvasEvents();
  },
};
