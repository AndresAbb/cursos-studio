const Settings = {
  async open() {
    const s = State.settings || await API.getSettings();
    State.settings = s;
    const cap = State.capabilities || {};

    showModal('⚙️ Configuración', `
      <div class="settings-section">
        <h3>📓 Obsidian (auto-guardar apuntes)</h3>
        <p class="hint">Las notas se escriben como archivos <code>.md</code> dentro del vault que indiques. La carpeta del curso se crea automáticamente.</p>
        <div class="fg"><label>Ruta absoluta del vault</label><input id="set-obs-path" placeholder="C:\\Users\\Tu\\Documents\\ObsidianVault o /home/tu/Obsidian" value="${escapeHTML(s.obsidianVaultPath || '')}"></div>
        <div class="fg"><label><input type="checkbox" id="set-obs-auto" ${s.obsidianAutoSave ? 'checked' : ''}> Auto-guardar al editar (cada 1s)</label></div>
        <p class="hint">Si dejas esto vacío, puedes seguir descargando el .md desde el botón 💾.</p>
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
      };
      State.settings = await API.saveSettings(data);
      // Refrescar capacidades
      try { State.capabilities = await API.health(); } catch {}
      toast('✅ Configuración guardada');
    }, { wide: true });
  },

  init() {
    $('btn-settings-open').addEventListener('click', () => this.open());
  },
};
