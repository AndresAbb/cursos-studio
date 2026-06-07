const Settings = {
  async open() {
    const s = State.settings || await API.getSettings();
    State.settings = s;
    const cap = State.capabilities || {};

    // Mutable local copy of quick links, managed in the modal
    let quickLinks = (s.quickLinks || []).map(q => q.url || q).filter(Boolean);

    const renderQList = () => {
      const list = document.getElementById('qlinks-list');
      if (!list) return;
      if (!quickLinks.length) {
        list.innerHTML = '<p class="hint" style="margin:6px 0">Sin links configurados.</p>';
      } else {
        list.innerHTML = quickLinks.map((url, i) => {
          const domain = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
          const fav = faviconUrl(url);
          return `<div class="qlink-row">
            <img class="qlink-fav" src="${escapeHTML(fav)}" width="16" height="16" alt="">
            <span class="qlink-domain">${escapeHTML(domain)}</span>
            <button class="btn btn-outline btn-sm qlink-del" data-i="${i}" type="button">✕</button>
          </div>`;
        }).join('');
        list.querySelectorAll('.qlink-del').forEach(btn => {
          btn.addEventListener('click', () => { quickLinks.splice(Number(btn.dataset.i), 1); renderQList(); });
        });
      }
    };

    const wireAddLink = () => {
      const inp = document.getElementById('qlinks-input');
      const btn = document.getElementById('qlinks-add-btn');
      if (!inp || !btn) return;
      const doAdd = () => {
        let v = inp.value.trim();
        if (!v) return;
        if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
        if (!quickLinks.includes(v)) { quickLinks.push(v); renderQList(); }
        inp.value = '';
      };
      btn.addEventListener('click', doAdd);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    };

    showModal('⚙️ Configuración', `
      <div class="settings-section">
        <h3>📓 Obsidian (auto-guardar apuntes)</h3>
        <p class="hint">Las notas se escriben como archivos <code>.md</code> dentro del vault que indiques. La carpeta del curso se crea automáticamente.</p>
        <div class="fg"><label>Ruta absoluta del vault</label><input id="set-obs-path" placeholder="C:\\Users\\Tu\\Documents\\ObsidianVault o /home/tu/Obsidian" value="${escapeHTML(s.obsidianVaultPath || '')}"></div>
        <div class="fg"><label><input type="checkbox" id="set-obs-auto" ${s.obsidianAutoSave ? 'checked' : ''}> Auto-guardar al editar (cada 1s)</label></div>
        <p class="hint">Si dejas esto vacío, puedes seguir descargando el .md desde el botón 💾.</p>
      </div>

      <div class="settings-section">
        <h3>🔗 Accesos rápidos</h3>
        <p class="hint">Botones de favicon en el inicio — un clic abre el sitio en una pestaña nueva.</p>
        <div class="fg"><label><input type="checkbox" id="set-show-quicklinks" ${s.showQuickLinks !== false ? 'checked' : ''}> Mostrar en el inicio</label></div>
        <div id="qlinks-list" style="margin:8px 0 10px"></div>
        <div style="display:flex;gap:6px;align-items:center">
          <input id="qlinks-input" placeholder="habitica.com · notion.so · …" style="flex:1;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--text);outline:none">
          <button id="qlinks-add-btn" type="button" class="btn btn-outline btn-sm">＋ Agregar</button>
        </div>
      </div>

      <div class="settings-section">
        <h3>🧠 IA para exámenes</h3>
        <p class="hint">Provee al menos una key (en <code>.env</code>) para generación automática. Sin keys, los exámenes funcionan en modo manual (copiar prompt a IA externa, pegar resultado).</p>
        <div class="fg">
          <label>Proveedor preferido</label>
          <select id="set-ai-prov">
            <option value="none" ${s.aiProvider === 'none' ? 'selected' : ''}>Ninguno (manual)</option>
            <option value="openai" ${s.aiProvider === 'openai' ? 'selected' : ''} ${!cap.ai?.openai ? 'disabled' : ''}>OpenAI ${cap.ai?.openai ? '<span class="status-pill ok">key ✓</span>' : '<span class="status-pill no">sin key</span>'}</option>
            <option value="anthropic" ${s.aiProvider === 'anthropic' ? 'selected' : ''} ${!cap.ai?.anthropic ? 'disabled' : ''}>Anthropic Claude ${cap.ai?.anthropic ? '<span class="status-pill ok">key ✓</span>' : '<span class="status-pill no">sin key</span>'}</option>
          </select>
        </div>
        <div class="fg"><label>Modelo (opcional)</label><input id="set-ai-model" placeholder="ej. gpt-4o-mini, claude-haiku-4-5-20251001" value="${escapeHTML(s.aiModel || '')}"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          OpenAI ${cap.ai?.openai ? '<span class="status-pill ok">configurado</span>' : '<span class="status-pill no">no configurado</span>'}
          Anthropic ${cap.ai?.anthropic ? '<span class="status-pill ok">configurado</span>' : '<span class="status-pill no">no configurado</span>'}
        </div>
        ${s.aiKeyMasked ? `<p class="hint">Key activa: <code>${s.aiKeyMasked}</code></p>` : ''}
      </div>

      <div class="settings-section">
        <h3>🎵 Spotify Web API</h3>
        <p class="hint">Necesario para extraer episodios reales de podcasts y tracks de playlists. Configúralo con <code>SPOTIFY_CLIENT_ID</code> y <code>SPOTIFY_CLIENT_SECRET</code> en <code>.env</code>. Crea una app gratis en <a href="https://developer.spotify.com/dashboard" target="_blank">developer.spotify.com</a>.</p>
        <p>Estado: ${cap.spotify ? '<span class="status-pill ok">configurado ✓</span>' : '<span class="status-pill no">no configurado</span>'}</p>
      </div>

      <div class="settings-section">
        <h3>▶️ yt-dlp (YouTube playlists reales)</h3>
        <p class="hint">Sin yt-dlp, no se pueden extraer items individuales de una playlist (solo el link genérico).</p>
        <p class="hint">Instalar:</p>
        <pre style="background:var(--s2);padding:10px;border-radius:6px;font-size:12px;overflow-x:auto">
# Windows (PowerShell)
winget install yt-dlp.yt-dlp

# macOS
brew install yt-dlp

# Linux / pip
pip install --user yt-dlp</pre>
        <p>Estado: ${cap.ytdlp ? '<span class="status-pill ok">detectado ✓</span>' : '<span class="status-pill no">no detectado en PATH</span>'}</p>
      </div>
    `, async () => {
      const data = {
        obsidianVaultPath: $val('set-obs-path').trim(),
        obsidianAutoSave: $checked('set-obs-auto'),
        aiProvider: $val('set-ai-prov'),
        aiModel: $val('set-ai-model').trim(),
        quickLinks: quickLinks.map(url => ({ url })),
        showQuickLinks: $checked('set-show-quicklinks'),
      };
      State.settings = await API.saveSettings(data);
      renderQuickLinks();
      // Refrescar capacidades
      try { State.capabilities = await API.health(); } catch {}
      toast('✅ Configuración guardada');
    }, { wide: true });

    // Wire quick links interactivity (modal body is synchronously in DOM)
    renderQList();
    wireAddLink();
  },

  init() {
    $('btn-settings-open').addEventListener('click', () => this.open());
  },
};
