const Player = {
  module: null,
  seconds: 0,
  running: false,
  iv: null,
  pendingSeconds: 0,
  flushIv: null,

  async open(moduleId) {
    const m = State.curModules.find(x => x._id === moduleId);
    if (!m) return;

    this.module = m;
    this.seconds = m.watchedSeconds || 0;
    this.running = true;
    this.pendingSeconds = 0;

    $('pl-title').textContent = m.title;
    $('pl-meta').textContent = `Semana ${m.week + 1} · ${DAYS_FULL[m.dayOfWeek]} · ${m.type}`;
    this.tickTimer();

    await this.buildEmbed(m);
    await Notes.load(m._id);
    this.startTimer();

    // Mostrar/ocultar timer según tipo
    const showTimer = !['text', 'ai-exam'].includes(m.type);
    $('pl-timer').style.display = showTimer ? '' : 'none';
    $('pl-timer-btn').style.display = showTimer ? '' : 'none';

    $('player').classList.add('open');
  },

  close() {
    this.flushTime();
    Notes.autoSave();
    clearInterval(this.iv);
    clearInterval(this.flushIv);
    this.iv = null;
    this.flushIv = null;
    $('pl-embed').innerHTML = '';
    $('player').classList.remove('open');
    if (State.view === 'mod') Course.renderModules();
    if (State.view === 'cal') Calendar.render();
  },

  async buildEmbed(m) {
    const el = $('pl-embed');
    if (m.type === 'youtube') {
      const id = this.youtubeId(m.url);
      const list = this.youtubePlaylist(m.url);
      if (id) {
        el.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0${list ? '&list=' + list : ''}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      } else if (list) {
        el.innerHTML = `<iframe src="https://www.youtube.com/embed/videoseries?list=${list}&autoplay=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
      } else {
        el.innerHTML = this.errorBox('URL de YouTube no reconocida', m.url);
      }
    } else if (m.type === 'spotify') {
      const eUrl = this.spotifyEmbed(m.url);
      if (!eUrl) { el.innerHTML = this.errorBox('URL de Spotify no reconocida', m.url); return; }
      el.innerHTML = `<div class="pl-spotify">
        <iframe src="${eUrl}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        <p style="color:#aaa;font-size:12px">Si no carga, <a href="${m.url}" target="_blank" style="color:#1DB954">abre en Spotify ↗</a></p>
      </div>`;
    } else if (m.type === 'web') {
      el.innerHTML = `<iframe src="${m.url}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerpolicy="no-referrer"></iframe>`;
    } else if (m.type === 'web-link') {
      const fav = m.favicon || `https://www.google.com/s2/favicons?domain=${m.domain}&sz=64`;
      el.innerHTML = `<div class="pl-link-container">
        <div class="pl-link-card">
          <img src="${fav}" alt="">
          <h2>${escapeHTML(m.title)}</h2>
          <div class="domain">${escapeHTML(m.domain || m.url)}</div>
          <a href="${m.url}" target="_blank" rel="noopener">
            <button class="btn btn-primary">🔗 Abrir en nueva pestaña</button>
          </a>
          <p class="reason">Este sitio no permite ser embebido directamente, así que se abre en una pestaña nueva.</p>
        </div>
      </div>`;
    } else if (m.type === 'text') {
      el.innerHTML = `<div class="pl-text-container"><div class="md">${mdParse(m.textContent || m.description || '*(sin contenido)*')}</div></div>`;
    } else if (m.type === 'ai-exam') {
      await Exams.openInPlayer(m, el);
    }
  },

  errorBox(msg, url) {
    return `<div style="color:#aaa;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;padding:24px;text-align:center">
      <div style="font-size:32px">⚠️</div>
      <div>${escapeHTML(msg)}</div>
      <a href="${escapeHTML(url)}" target="_blank" style="color:#7ec89a">Abrir en nueva pestaña ↗</a>
    </div>`;
  },

  youtubeId(url) { const m = (url || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; },
  youtubePlaylist(url) { const m = (url || '').match(/[?&]list=([a-zA-Z0-9_-]+)/); return m ? m[1] : null; },
  spotifyEmbed(url) {
    if (!url || !url.includes('spotify.com')) return null;
    if (url.includes('/embed/')) return url;
    return url.replace('open.spotify.com/', 'open.spotify.com/embed/').split('?')[0];
  },

  startTimer() {
    clearInterval(this.iv);
    clearInterval(this.flushIv);
    this.iv = setInterval(() => {
      if (this.running) { this.seconds++; this.pendingSeconds++; this.tickTimer(); }
    }, 1000);
    this.flushIv = setInterval(() => this.flushTime(), 15000);
  },

  async flushTime() {
    if (this.pendingSeconds <= 0 || !this.module) return;
    const secs = this.pendingSeconds;
    this.pendingSeconds = 0;
    try {
      await API.addTime(this.module._id, secs);
      const m = State.curModules.find(x => x._id === this.module._id);
      if (m) m.watchedSeconds = (m.watchedSeconds || 0) + secs;
    } catch (err) { this.pendingSeconds += secs; }
  },

  toggleTimer() {
    this.running = !this.running;
    $('pl-timer-btn').textContent = this.running ? '⏸' : '▶';
  },

  tickTimer() { $('pl-timer').textContent = '⏱ ' + fmtTime(this.seconds); },

  async markDone() {
    if (!this.module) return;
    try {
      await API.updateModule(this.module._id, { done: true });
      const m = State.curModules.find(x => x._id === this.module._id);
      if (m) m.done = true;
      toast('✅ Visto');
      this.close();
    } catch (err) { toast('❌ ' + err.message); }
  },

  async duplicate() {
    if (!this.module) return;
    Course.showDuplicateModal(this.module);
  },

  async deleteCurrent() {
    if (!this.module) return;
    if (!confirm(`¿Eliminar "${this.module.title}"?`)) return;
    try {
      await API.deleteModule(this.module._id);
      State.curModules = State.curModules.filter(m => m._id !== this.module._id);
      toast('🗑 Eliminado');
      this.close();
    } catch (err) { toast('❌ ' + err.message); }
  },

  init() {
    $('pl-close').addEventListener('click', () => this.close());
    $('pl-timer-btn').addEventListener('click', () => this.toggleTimer());
    $('pl-mark-done').addEventListener('click', () => this.markDone());
    $('pl-duplicate').addEventListener('click', () => this.duplicate());
    $('pl-delete-mod').addEventListener('click', () => this.deleteCurrent());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.iv) this.flushTime();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && $('player').classList.contains('open')) this.close();
    });
  },
};
