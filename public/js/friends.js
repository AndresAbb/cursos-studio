// ─── Friends Co-Learning ──────────────────────────
// All data private by default. Sharing is explicit, per-friend, per-signal.
// No chat, no file transfer. Events: friend.studying, progress.updated,
// exam.upcoming, poke.sent. Pokes reuse existing sticker kinds.

const Friends = {
  ws:        null,
  friends:   [],
  me:        { userId: '', displayName: 'Yo', avatarEmoji: '🎓' },
  _wsRetryT: null,

  // ── Init ────────────────────────────────────────
  async init() {
    await this._loadMe();
    this._connectWS();
    this._checkInviteParam();
    this._wirePanel();
  },

  // ── Identity ────────────────────────────────────
  async _loadMe() {
    try { this.me = await API.friendsMe(); } catch { /* non-fatal */ }
  },

  // ── WebSocket ────────────────────────────────────
  _connectWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}`);
    this.ws.addEventListener('message', e => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      if (!data || !data.type) return;
      this._handleEvent(data);
    });
    this.ws.addEventListener('close', () => {
      clearTimeout(this._wsRetryT);
      this._wsRetryT = setTimeout(() => this._connectWS(), 5000);
    });
    this.ws.addEventListener('error', () => this.ws.close());
  },

  _handleEvent(ev) {
    const name = ev.friendName || 'Amigo';
    const emoji = ev.friendEmoji || '👤';
    if (ev.type === 'friend.studying') {
      const what = ev.payload?.courseTitle ? ` — ${ev.payload.courseTitle}` : '';
      this._notify(`${emoji} ${name} está estudiando${what}`);
    } else if (ev.type === 'progress.updated') {
      const title = ev.payload?.moduleTitle ? `"${ev.payload.moduleTitle}"` : 'un módulo';
      this._notify(`${emoji} ${name} completó ${title}`);
    } else if (ev.type === 'exam.upcoming') {
      this._notify(`${emoji} ${name} tiene un examen la próxima semana`);
    } else if (ev.type === 'poke.sent') {
      const content = ev.payload?.content || '👋';
      this._notify(`${emoji} ${name} te mandó un poke: ${content}`);
    } else if (ev.type === 'poke.confirmed') {
      toast(`Poke enviado a ${ev.friendEmoji || ''} ${ev.friendName || 'Amigo'}`);
    }
    // Unknown events silently dropped — no else branch
  },

  _notify(msg) {
    toast(msg, 4000);
    this._appendFeedItem(msg);
  },

  _appendFeedItem(msg) {
    const feed = document.getElementById('fr-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'fr-feed-item';
    item.textContent = msg;
    feed.insertBefore(item, feed.firstChild);
    // Keep feed bounded
    while (feed.children.length > 20) feed.removeChild(feed.lastChild);
  },

  // ── Presence emission ────────────────────────────
  // Called by courses.js / player.js after user actions.
  // The server enforces per-friend throttling (1 per 5 min).

  emitStudying(courseTitle) {
    if (!this.friends.some(f => f.status === 'accepted' && f.shareStudying)) return;
    API.friendsBroadcast('friend.studying', { courseTitle }).catch(() => {});
  },

  emitProgress(moduleTitle, courseTitle) {
    if (!this.friends.some(f => f.status === 'accepted' && f.shareProgress)) return;
    API.friendsBroadcast('progress.updated', { moduleTitle, courseTitle }).catch(() => {});
  },

  // Call this after loading modules when an ai-exam falls within the next 7 days.
  checkAndEmitExamUpcoming(modules, courseStartDate) {
    if (!modules || !courseStartDate) return;
    if (!this.friends.some(f => f.status === 'accepted' && f.shareExamUpcoming)) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7   = new Date(today); in7.setDate(today.getDate() + 7);

    const cs  = new Date(courseStartDate); cs.setHours(0, 0, 0, 0);
    const dow = cs.getDay();
    const diff = (dow === 0 ? -6 : 1) - dow;
    const csMon = new Date(cs); csMon.setDate(cs.getDate() + diff);

    const hasUpcoming = modules.some(m => {
      if (m.type !== 'ai-exam') return false;
      const d = new Date(csMon);
      d.setDate(csMon.getDate() + m.week * 7 + m.dayOfWeek);
      d.setHours(0, 0, 0, 0);
      return d >= today && d <= in7;
    });
    if (hasUpcoming) API.friendsBroadcast('exam.upcoming', {}).catch(() => {});
  },

  // ── Invite param detection ───────────────────────
  _checkInviteParam() {
    const params = new URLSearchParams(location.search);
    const token  = params.get('accept-friend');
    if (!token) return;
    // Clean URL without reload
    history.replaceState(null, '', location.pathname);
    const fromName  = params.get('name')  || 'Amigo';
    const fromEmoji = params.get('emoji') || '👤';
    const fromUrl   = params.get('url')   || '';
    const fromId    = params.get('from')  || '';
    this._showAcceptModal(token, fromName, fromEmoji, fromUrl, fromId);
  },

  _showAcceptModal(token, fromName, fromEmoji, fromUrl, fromId) {
    showModal(
      'Solicitud de amistad',
      `<div style="text-align:center;padding:8px 0 16px">
        <div style="font-size:48px;margin-bottom:8px">${escapeHTML(fromEmoji)}</div>
        <div style="font-size:18px;font-weight:600">${escapeHTML(fromName)}</div>
        <div style="color:var(--text2);margin-top:4px">quiere co-aprender contigo</div>
      </div>`,
      async () => {
        try {
          await API.friendsAccept(token, {
            userId: this.me.userId,
            name:   this.me.displayName,
            emoji:  this.me.avatarEmoji,
            url:    fromUrl ? location.origin : '',
          });
          await this.loadFriends();
          this.renderList();
          toast(`✅ Ahora son amigos de estudio con ${fromEmoji} ${fromName}`);
        } catch (err) { toast('❌ ' + err.message); return false; }
      },
      { saveText: 'Aceptar' }
    );
  },

  // ── Data ─────────────────────────────────────────
  async loadFriends() {
    try { this.friends = await API.listFriends(); } catch { this.friends = []; }
  },

  // ── Panel wiring ─────────────────────────────────
  _wirePanel() {
    document.addEventListener('click', e => {
      const id = e.target?.id || e.target?.dataset?.fAction;
      if (!id) return;

      if (e.target.id === 'btn-friends') {
        this._openPanel();
      } else if (e.target.id === 'fr-close') {
        document.getElementById('friends-panel')?.classList.remove('open');
      } else if (e.target.id === 'fr-invite-btn') {
        this._generateInvite();
      } else if (e.target.id === 'fr-save-me') {
        this._saveIdentity();
      } else if (e.target.dataset.fAction === 'poke') {
        this._sendPoke(e.target.dataset.fId);
      } else if (e.target.dataset.fAction === 'remove') {
        this._removeFriend(e.target.dataset.fId);
      } else if (e.target.dataset.fAction === 'block') {
        this._blockFriend(e.target.dataset.fId);
      } else if (e.target.dataset.fToggle) {
        this._toggleField(e.target.dataset.fId, e.target.dataset.fToggle, e.target.checked);
      }
    });
  },

  async _openPanel() {
    await this.loadFriends();
    this.renderPanel();
    document.getElementById('friends-panel')?.classList.add('open');
  },

  renderPanel() {
    const panel = document.getElementById('friends-panel');
    if (!panel) return;
    panel.innerHTML = `
      <div class="fr-header">
        <span>👥 Co-aprendizaje</span>
        <button id="fr-close" class="fr-close-btn" title="Cerrar">×</button>
      </div>

      <div class="fr-section">
        <div class="fr-section-title">Mi identidad</div>
        <div class="fr-identity-row">
          <input id="fr-emoji" class="fr-emoji-input" value="${escapeHTML(this.me.avatarEmoji)}" maxlength="4" title="Emoji">
          <input id="fr-name" class="fr-name-input" value="${escapeHTML(this.me.displayName)}" placeholder="Tu nombre" maxlength="40">
          <button id="fr-save-me" class="btn btn-outline btn-xs">Guardar</button>
        </div>
      </div>

      <div class="fr-section">
        <div class="fr-section-title">Amigos</div>
        <div id="fr-list">${this._renderFriendList()}</div>
        <button id="fr-invite-btn" class="btn btn-primary btn-sm fr-invite-btn">+ Generar enlace de invitación</button>
        <div id="fr-invite-out" class="fr-invite-out"></div>
      </div>

      <div class="fr-section">
        <div class="fr-section-title">Actividad reciente</div>
        <div id="fr-feed" class="fr-feed"><div class="fr-feed-empty">Sin actividad aún</div></div>
      </div>
    `;
  },

  _renderFriendList() {
    const accepted = this.friends.filter(f => f.status === 'accepted');
    if (!accepted.length) return '<div class="fr-empty">Sin amigos aún. Genera un enlace para invitar.</div>';

    return accepted.map(f => `
      <div class="fr-friend-item" data-fid="${f._id}">
        <div class="fr-friend-head">
          <span class="fr-friend-emoji">${escapeHTML(f.friendEmoji)}</span>
          <span class="fr-friend-name">${escapeHTML(f.friendName)}</span>
          <div class="fr-friend-actions">
            <button class="fr-poke-btn" data-f-action="poke" data-f-id="${f._id}" title="Poke">👋</button>
            <button class="fr-action-btn" data-f-action="remove" data-f-id="${f._id}" title="Eliminar">✕</button>
            <button class="fr-action-btn fr-block-btn" data-f-action="block" data-f-id="${f._id}" title="Bloquear">🚫</button>
          </div>
        </div>
        <div class="fr-toggles">
          <label class="fr-toggle" title="Compartir estado de estudio">
            <input type="checkbox" data-f-toggle="shareStudying" data-f-id="${f._id}" ${f.shareStudying ? 'checked' : ''}>
            <span>Comparto: estudiando</span>
          </label>
          <label class="fr-toggle" title="Compartir progreso de módulos">
            <input type="checkbox" data-f-toggle="shareProgress" data-f-id="${f._id}" ${f.shareProgress ? 'checked' : ''}>
            <span>Comparto: progreso</span>
          </label>
          <label class="fr-toggle" title="Avisar examen próximo (solo semana previa, sin puntajes)">
            <input type="checkbox" data-f-toggle="shareExamUpcoming" data-f-id="${f._id}" ${f.shareExamUpcoming ? 'checked' : ''}>
            <span>Comparto: próximo examen</span>
          </label>
          <label class="fr-toggle fr-mute-toggle" title="Silenciar su actividad">
            <input type="checkbox" data-f-toggle="mutePresence" data-f-id="${f._id}" ${f.mutePresence ? 'checked' : ''}>
            <span>Silenciar su actividad</span>
          </label>
          <label class="fr-toggle fr-mute-toggle" title="Silenciar pokes de este amigo">
            <input type="checkbox" data-f-toggle="mutePokes" data-f-id="${f._id}" ${f.mutePokes ? 'checked' : ''}>
            <span>Silenciar pokes</span>
          </label>
        </div>
      </div>
    `).join('');
  },

  async _saveIdentity() {
    const name  = document.getElementById('fr-name')?.value?.trim()  || 'Yo';
    const emoji = document.getElementById('fr-emoji')?.value?.trim() || '🎓';
    try {
      this.me = await API.friendsUpdateMe({ displayName: name, avatarEmoji: emoji });
      toast('✅ Identidad guardada');
    } catch (err) { toast('❌ ' + err.message); }
  },

  async _generateInvite() {
    const out = document.getElementById('fr-invite-out');
    if (!out) return;
    try {
      out.textContent = '⏳ Generando…';
      const { link } = await API.friendsInvite();
      out.innerHTML = `
        <div class="fr-link-box">
          <input class="fr-link-input" id="fr-link-val" value="${escapeHTML(link)}" readonly>
          <button class="btn btn-outline btn-xs" id="fr-copy-btn">Copiar</button>
        </div>
        <div class="fr-link-hint">Comparte este enlace con tu amigo. Caduca una vez aceptado.</div>
      `;
      document.getElementById('fr-copy-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(link).then(() => toast('📋 Copiado'));
      });
    } catch (err) {
      out.textContent = '❌ ' + err.message;
    }
  },

  async _toggleField(id, field, value) {
    try {
      await API.updateFriend(id, { [field]: value });
      const f = this.friends.find(x => x._id === id);
      if (f) f[field] = value;
    } catch (err) { toast('❌ ' + err.message); }
  },

  async _sendPoke(id) {
    try {
      await API.pokeFriend(id, { kind: 'emoji', content: '👋' });
    } catch (err) { toast('❌ ' + err.message); }
  },

  async _removeFriend(id) {
    if (!confirm('¿Eliminar este amigo de estudio?')) return;
    try {
      await API.removeFriend(id);
      this.friends = this.friends.filter(f => f._id !== id);
      document.getElementById('fr-list').innerHTML = this._renderFriendList();
      toast('Eliminado');
    } catch (err) { toast('❌ ' + err.message); }
  },

  async _blockFriend(id) {
    if (!confirm('¿Bloquear este amigo? No recibirás más eventos ni pokes de su parte.')) return;
    try {
      await API.blockFriend(id);
      this.friends = this.friends.filter(f => f._id !== id);
      document.getElementById('fr-list').innerHTML = this._renderFriendList();
      toast('Bloqueado');
    } catch (err) { toast('❌ ' + err.message); }
  },
};
