const Stickers = {
  selectedEmoji: EMOJIS[0],
  selectedTextColor: TXTCOLS[0],

  async loadAndRender() {
    if (!State.cur) { this.clearCanvas(); return; }
    try {
      State.curStickers = await API.listStickers(State.cur._id);
      this.renderAll();
    } catch (err) { console.error('Stickers load error:', err); }
  },

  clearCanvas() { $('sticker-canvas').innerHTML = ''; },

  renderAll() {
    const canvas = $('sticker-canvas');
    canvas.innerHTML = '';
    State.curStickers.forEach(s => {
      const el = this.buildElement(s);
      canvas.appendChild(el);
      this.makeDraggable(el, s);
    });
  },

  buildElement(s) {
    const el = document.createElement('div');
    el.className = 'stk cat-' + (s.category || 'fixed');
    el.dataset.sid = s._id;
    el.style.left = s.x + 'px';
    el.style.top = s.y + 'px';

    let inner = '';
    if (s.kind === 'emoji') {
      inner = `<span class="stk-emoji" style="font-size:${s.fontSize || 44}px">${s.content}</span>`;
    } else if (s.kind === 'text') {
      const styleClass = s.textStyle === 'postit' ? 'postit'
                       : s.textStyle === 'border' ? 'border' : '';
      const f = s.font || 'Caveat';
      const styleAttr = `font-family:'${f}', cursive; font-size:${s.fontSize || 28}px; color:${s.color}; font-weight:600`;
      inner = `<span class="stk-text ${styleClass}" style="${styleAttr}">${escapeHTML(s.content)}</span>`;
    } else if (s.kind === 'image') {
      inner = `<img class="stk-img-content" src="${s.content}" alt="">`;
    }

    if (s.category === 'candelabro') {
      // Lámpara colgante: cuerda + anclaje + emoji/texto/imagen
      el.innerHTML = `<div class="stk-chandelier">
        <div class="stk-rope"></div>
        <div class="stk-anchor"></div>
        ${inner}
      </div>`;
    } else {
      el.innerHTML = inner;
    }
    return el;
  },

  dragState: null,

  makeDraggable(el, sticker) {
    const startDrag = (clientX, clientY) => {
      const rect = el.getBoundingClientRect();
      const canvasRect = $('sticker-canvas').getBoundingClientRect();
      this.dragState = {
        el, sticker,
        offX: clientX - rect.left,
        offY: clientY - rect.top,
        canvasLeft: canvasRect.left,
        canvasTop: canvasRect.top,
        moved: false,
      };
      $('del-zone').classList.add('active');
    };
    el.addEventListener('mousedown', e => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
    el.addEventListener('touchstart', e => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive: true });
  },

  setupGlobalDragHandlers() {
    const move = (clientX, clientY) => {
      if (!this.dragState) return;
      const ds = this.dragState;
      const x = clientX - ds.canvasLeft - ds.offX;
      const y = clientY - ds.canvasTop - ds.offY;
      ds.el.style.left = x + 'px';
      ds.el.style.top = y + 'px';
      ds.sticker.x = x;
      ds.sticker.y = y;
      ds.moved = true;
      const dz = $('del-zone');
      const dzRect = dz.getBoundingClientRect();
      if (clientY > dzRect.top - 10) dz.classList.add('over');
      else dz.classList.remove('over');
    };
    const end = async (clientY) => {
      if (!this.dragState) return;
      const ds = this.dragState;
      const dz = $('del-zone');
      const dzRect = dz.getBoundingClientRect();
      const overDelete = clientY > dzRect.top - 10;
      dz.classList.remove('active', 'over');
      if (overDelete) {
        try {
          await API.deleteSticker(ds.sticker._id);
          State.curStickers = State.curStickers.filter(s => s._id !== ds.sticker._id);
          this.renderAll();
          toast('🗑 Eliminado');
        } catch (err) { toast('❌ ' + err.message); }
      } else if (ds.moved) {
        try { await API.updateSticker(ds.sticker._id, { x: ds.sticker.x, y: ds.sticker.y }); } catch (err) { console.error(err); }
      }
      this.dragState = null;
    };
    document.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    document.addEventListener('mouseup', e => end(e.clientY));
    document.addEventListener('touchmove', e => {
      if (this.dragState) { const t = e.touches[0]; move(t.clientX, t.clientY); }
    }, { passive: true });
    document.addEventListener('touchend', e => { const t = e.changedTouches[0]; end(t?.clientY || 0); });
  },

  async addEmoji() {
    if (!State.cur) return toast('Abre un curso primero');
    const category = $val('e-category');
    const fontSize = parseInt($val('e-size')) || 44;
    try {
      const s = await API.createSticker(State.cur._id, {
        kind: 'emoji', content: this.selectedEmoji, category, fontSize,
        x: 100 + Math.random() * 300, y: 80 + Math.random() * 200,
      });
      State.curStickers.push(s);
      this.renderAll();
      toast('🎨 Agregado');
    } catch (err) { toast('❌ ' + err.message); }
  },

  async addText() {
    if (!State.cur) return toast('Abre un curso primero');
    const text = $val('t-val').trim();
    if (!text) return toast('Escribe algo primero');
    try {
      const s = await API.createSticker(State.cur._id, {
        kind: 'text', content: text,
        textStyle: $val('t-style'), font: $val('t-font'),
        color: this.selectedTextColor, fontSize: parseInt($val('t-size')) || 32,
        category: $val('t-category'),
        x: 100 + Math.random() * 300, y: 80 + Math.random() * 200,
      });
      State.curStickers.push(s);
      this.renderAll();
      $('t-val').value = '';
      toast('🎨 Texto agregado');
    } catch (err) { toast('❌ ' + err.message); }
  },

  async addImage() {
    if (!State.cur) return toast('Abre un curso primero');
    const file = $('img-file').files[0];
    if (!file) return toast('Selecciona una imagen');
    try {
      toast('⏳ Subiendo…');
      const { url } = await API.upload(file);
      const s = await API.createSticker(State.cur._id, {
        kind: 'image', content: url, category: $val('i-category'),
        x: 100 + Math.random() * 300, y: 80 + Math.random() * 200,
      });
      State.curStickers.push(s);
      this.renderAll();
      $('img-file').value = '';
      toast('🎨 Imagen agregada');
    } catch (err) { toast('❌ ' + err.message); }
  },

  async clearAll() {
    if (!State.cur || !State.curStickers.length) return;
    if (!confirm('¿Eliminar todos los stickers?')) return;
    try {
      await API.clearStickers(State.cur._id);
      State.curStickers = [];
      this.renderAll();
      toast('Eliminados');
    } catch (err) { toast('❌ ' + err.message); }
  },

  initPanel() {
    document.querySelectorAll('.stk-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.stk-tab').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        document.querySelectorAll('.stk-form').forEach(p => {
          p.style.display = p.dataset.pane === tab ? '' : 'none';
        });
      });
    });

    const eg = $('emoji-grid');
    EMOJIS.forEach(e => {
      const d = document.createElement('div');
      d.className = 'emoji-opt' + (e === this.selectedEmoji ? ' on' : '');
      d.textContent = e;
      d.addEventListener('click', () => {
        this.selectedEmoji = e;
        eg.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('on'));
        d.classList.add('on');
      });
      eg.appendChild(d);
    });

    buildSwatches('txt-colors', TXTCOLS, this.selectedTextColor, c => this.selectedTextColor = c);

    const bg = $('bg-grid');
    BG_PRESETS.forEach(b => {
      const d = document.createElement('div');
      d.className = 'bg-opt';
      d.style.background = b.v;
      d.title = b.l;
      d.addEventListener('click', () => this.applyBgColor(b.v, d));
      bg.appendChild(d);
    });

    $('add-emoji-stk').addEventListener('click', () => this.addEmoji());
    $('add-text-stk').addEventListener('click', () => this.addText());
    $('add-img-stk').addEventListener('click', () => this.addImage());
    $('clear-stickers').addEventListener('click', () => this.clearAll());
    $('apply-bg-img').addEventListener('click', () => this.applyBgImage());

    $('btn-decorate').addEventListener('click', () => {
      if (!State.cur) return toast('Abre un curso primero');
      $('stk-panel').classList.toggle('open');
    });

    this.setupGlobalDragHandlers();
  },

  async applyBgColor(color, el) {
    document.querySelectorAll('.bg-opt').forEach(x => x.classList.remove('on'));
    el?.classList.add('on');
    $('main').style.background = color;
    applyDarkModeForBg(color);
    if (State.cur) {
      try {
        await API.updateCourse(State.cur._id, { background: { type: 'color', value: color } });
        State.cur.background = { type: 'color', value: color };
      } catch (err) { console.error(err); }
    }
  },

  async applyBgImage() {
    const file = $('bg-file').files[0];
    if (!file) return toast('Selecciona una imagen');
    if (!State.cur) return toast('Abre un curso primero');
    try {
      toast('⏳ Subiendo…');
      const { url } = await API.upload(file);
      $('main').style.background = `url(${url}) center/cover fixed`;
      applyDarkModeForBg(null); // imagen, sin auto-dark
      await API.updateCourse(State.cur._id, { background: { type: 'image', value: url } });
      State.cur.background = { type: 'image', value: url };
      $('bg-file').value = '';
      toast('🖼 Fondo aplicado');
    } catch (err) { toast('❌ ' + err.message); }
  },

  applyCurrentBg() {
    const main = $('main');
    const bg = State.cur?.background;
    if (!bg || !bg.value) {
      main.style.background = 'var(--bg)';
      applyDarkModeForBg(null);
      return;
    }
    if (bg.type === 'image') {
      main.style.background = `url(${bg.value}) center/cover fixed`;
      applyDarkModeForBg(null);
    } else {
      main.style.background = bg.value;
      applyDarkModeForBg(bg.value);
    }
  },
};
